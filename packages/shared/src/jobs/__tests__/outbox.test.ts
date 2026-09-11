process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OTP_SECRET = 'test-otp-secret';
process.env.SENDGRID_API_KEY = 'test-key';
process.env.SENDGRID_FROM_EMAIL = 'test@ricton.health';

import { prisma } from '@ricton/db';
import { runOutboxRelayOnce } from '../outbox';
import { redis } from '../../redis';
import { clearRedisStore } from '../../__tests__/helpers/redis-mock';
import { cleanDatabase } from '../../__tests__/factories';

jest.mock('../../redis', () => {
  const { createRedisMock } = jest.requireActual('../../__tests__/helpers/redis-mock');
  return { redis: createRedisMock() };
});

// The relay under test never touches BullMQ directly, but its module graph
// constructs Queues at import time. Stub them: a non-ioredis connection
// object would make BullMQ dial a real Redis.
jest.mock('bullmq', () => {
  class QueueStub {
    add = jest.fn().mockResolvedValue({});
    close = jest.fn().mockResolvedValue(undefined);
  }
  class WorkerStub {
    on = jest.fn();
    close = jest.fn().mockResolvedValue(undefined);
  }
  class QueueEventsStub {
    on = jest.fn();
    close = jest.fn().mockResolvedValue(undefined);
  }
  return { Queue: QueueStub, Worker: WorkerStub, QueueEvents: QueueEventsStub };
});

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function mockProviderOk() {
  fetchMock.mockResolvedValue({ ok: true, status: 202, statusText: 'Accepted' });
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    redisKey: 'otp:relay@example.com',
    otpHash: 'hashed-otp',
    to: 'relay@example.com',
    subject: 'Ricton Health - Verification Code',
    body: 'Your Ricton Health verification code is: 123456',
    message: 'Your Ricton Health verification code is: 123456',
    channel: 'EMAIL',
    ...overrides,
  };
}

describe('outbox relay', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    clearRedisStore();
    fetchMock.mockReset();
    mockProviderOk();
  });

  it('delivers a pending email event, publishes the OTP hash, and marks it SENT', async () => {
    const event = await prisma.outboxEvent.create({
      data: {
        type: 'LOGIN_OTP',
        channel: 'EMAIL',
        recipient: 'relay@example.com',
        payload: makePayload(),
      },
    });

    const result = await runOutboxRelayOnce();

    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('api.sendgrid.com');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(init.body as string).toContain('relay@example.com');

    const stored = await redis.get('otp:relay@example.com');
    expect(stored).toBeDefined();
    expect(JSON.parse(stored as string)).toMatchObject({ hash: 'hashed-otp', attempts: 0 });

    const updated = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(updated?.status).toBe('SENT');
  });

  it('returns a failed event to PENDING with backoff instead of losing it', async () => {
    fetchMock.mockRejectedValueOnce(new Error('provider down'));
    const event = await prisma.outboxEvent.create({
      data: {
        type: 'LOGIN_OTP',
        channel: 'EMAIL',
        recipient: 'relay@example.com',
        payload: makePayload(),
      },
    });

    const first = await runOutboxRelayOnce();
    expect(first.sent).toBe(0);

    const retried = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(retried?.status).toBe('PENDING');
    expect(retried?.attempts).toBe(1);
    expect(new Date(retried!.nextAttemptAt).getTime()).toBeGreaterThan(Date.now());
    expect(await redis.get('otp:relay@example.com')).toBeNull();

    // A later sweep after the provider recovers delivers it.
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { nextAttemptAt: new Date(0) },
    });
    const second = await runOutboxRelayOnce();
    expect(second.sent).toBe(1);
    const done = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(done?.status).toBe('SENT');
  });

  it('marks an event FAILED after exhausting retries', async () => {
    fetchMock.mockRejectedValue(new Error('provider down'));
    const event = await prisma.outboxEvent.create({
      data: {
        type: 'LOGIN_OTP',
        channel: 'EMAIL',
        recipient: 'relay@example.com',
        attempts: 7,
        payload: makePayload(),
      },
    });

    const result = await runOutboxRelayOnce();

    expect(result.failed).toBe(1);
    const updated = await prisma.outboxEvent.findUnique({ where: { id: event.id } });
    expect(updated?.status).toBe('FAILED');
    expect(updated?.attempts).toBe(8);
  });
});
