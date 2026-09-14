import { Worker, Queue } from 'bullmq';
import { prisma } from '@ricton/db';
import { logger } from '../logger';
import { bullmqConnection, redis } from '../redis';
import { sendEmailViaProvider, sendSmsViaProvider } from './processors';

// Transactional outbox for OTP / password-reset delivery.
//
// Request handlers persist the intent (DB row) in the same flow that accepts
// the request and return immediately. The relay below delivers through
// SendGrid/Twilio with retries. A crash between accept and dispatch can no
// longer strand users: the row survives and the relay picks it up.
//
// Outbox payload shape (all types):
//   { redisKey, otpHash, to, subject?, body?, message?, channel: 'EMAIL' | 'SMS' }

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 20;

export interface OutboxPayload {
  redisKey: string;
  otpHash: string;
  to: string;
  subject?: string;
  body?: string;
  message?: string;
  channel: 'EMAIL' | 'SMS';
}

function backoffMs(attempts: number): number {
  return Math.min(Math.pow(2, attempts) * 30_000, 3_600_000);
}

export async function runOutboxRelayOnce(now = new Date()): Promise<{
  sent: number;
  failed: number;
  pending: number;
}> {
  const result = { sent: 0, failed: 0, pending: 0 };

  const due = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: now } },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  });

  for (const event of due) {
    // Claim the row so concurrent relays never double-deliver.
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: 'PENDING' },
      data: { status: 'SENDING' },
    });
    if (claimed.count === 0) {
      result.pending += 1;
      continue;
    }

    try {
      const payload = event.payload as unknown as OutboxPayload;
      if (payload.channel === 'EMAIL') {
        await sendEmailViaProvider({
          to: payload.to,
          subject: payload.subject || 'Ricton Health verification code',
          body: payload.body,
        });
      } else {
        await sendSmsViaProvider({ to: payload.to, message: payload.message || '' });
      }

      // Publish the OTP hash only after the provider accepted the message.
      try {
        await redis.set(
          payload.redisKey,
          JSON.stringify({ hash: payload.otpHash, attempts: 0 }),
          'EX',
          600
        );
      } catch (cacheErr) {
        logger.warn({ err: cacheErr }, 'Outbox relay: OTP cache write failed, retrying event');
        throw cacheErr;
      }

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'SENT' },
      });
      result.sent += 1;
    } catch (err) {
      const attempts = event.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: exhausted ? 'FAILED' : 'PENDING',
          attempts,
          nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)),
        },
      });
      if (exhausted) {
        logger.error(
          { eventId: event.id, type: event.type, recipient: event.recipient },
          'Outbox event exhausted retries'
        );
        result.failed += 1;
      } else {
        logger.warn({ eventId: event.id, attempt: attempts }, 'Outbox dispatch failed, will retry');
        result.pending += 1;
      }
    }
  }

  return result;
}

export const outboxQueue = new Queue('outbox', {
  connection: bullmqConnection,
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 20, attempts: 1 },
});

export function startOutboxWorker() {
  const worker = new Worker(
    'outbox',
    async () => {
      const result = await runOutboxRelayOnce();
      logger.info(result, 'Outbox relay sweep completed');
      return result;
    },
    { connection: bullmqConnection }
  );
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err?.message }, 'Outbox relay failed');
  });
  return worker;
}

export async function scheduleOutboxRelay() {
  await outboxQueue.add(
    'relay-sweep',
    {},
    { repeat: { every: 10_000 }, jobId: 'outbox-relay-sweep' }
  );
}
