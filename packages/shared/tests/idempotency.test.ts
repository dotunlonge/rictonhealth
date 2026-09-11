/**
 * A1: Idempotency-Key enforcement (TDD RED→GREEN). No DB: prisma delegate mocked.
 * Run: npx jest packages/shared/tests/idempotency.test.ts
 */
import { idempotency } from '../src/middleware/idempotency';
import crypto from 'crypto';

const hashBody = (body: unknown) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(body ?? null))
    .digest('hex');

function resDouble() {
  const res: any = { statusCode: 200, body: undefined as any };
  res.status = jest.fn((c: number) => {
    res.statusCode = c;
    return res;
  });
  const origJson = (b: unknown) => {
    res.body = b;
    return res;
  };
  res.json = jest.fn(origJson);
  return res;
}

describe('idempotency middleware', () => {
  it('passes through when no Idempotency-Key header is present', async () => {
    const prisma: any = {
      idempotencyKey: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    const mw = idempotency(prisma);
    const req: any = {
      headers: {},
      method: 'POST',
      path: '/api/appointments',
      user: { userId: 'u1' },
    };
    const res = resDouble();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(prisma.idempotencyKey.create).not.toHaveBeenCalled();
  });

  it('replays the stored response for a repeated key without running the handler', async () => {
    const stored = {
      statusCode: 201,
      response: { id: 'appt-1' },
      method: 'POST',
      path: '/api/appointments',
      requestHash: hashBody(undefined),
    };
    const prisma: any = {
      idempotencyKey: {
        create: jest.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' })),
        findUnique: jest.fn().mockResolvedValue(stored),
        update: jest.fn(),
      },
    };
    const mw = idempotency(prisma);
    const req: any = {
      headers: { 'idempotency-key': 'k-1' },
      method: 'POST',
      path: '/api/appointments',
      user: { userId: 'u1' },
    };
    const res = resDouble();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 'appt-1' });
  });

  it('returns 409 when the first request with the key is still in flight', async () => {
    const prisma: any = {
      idempotencyKey: {
        create: jest.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' })),
        findUnique: jest.fn().mockResolvedValue({
          statusCode: 0,
          response: null,
          method: 'POST',
          path: '/api/appointments',
          requestHash: hashBody(undefined),
        }),
        update: jest.fn(),
      },
    };
    const mw = idempotency(prisma);
    const req: any = {
      headers: { 'idempotency-key': 'k-2' },
      method: 'POST',
      path: '/api/appointments',
      user: { userId: 'u1' },
    };
    const res = resDouble();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ error: { code: 'IDEMPOTENT_REQUEST_IN_PROGRESS' } });
  });

  it('stores the first response for later replay', async () => {
    const prisma: any = {
      idempotencyKey: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const mw = idempotency(prisma);
    const req: any = {
      headers: { 'idempotency-key': 'k-3' },
      method: 'POST',
      path: '/api/appointments',
      user: { userId: 'u1' },
    };
    const res = resDouble();
    const next = jest.fn();
    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    await res.json({ id: 'appt-9' });
    expect(prisma.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statusCode: 200 }) })
    );
  });

  it('rejects reuse of a key on a different endpoint', async () => {
    const prisma: any = {
      idempotencyKey: {
        create: jest.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' })),
        findUnique: jest.fn().mockResolvedValue({
          statusCode: 201,
          response: { id: 'appt-1' },
          method: 'POST',
          path: '/api/appointments',
          requestHash: hashBody({ productId: 'p1' }),
        }),
        update: jest.fn(),
      },
    };
    const req: any = {
      headers: { 'idempotency-key': 'shared-key' },
      method: 'POST',
      path: '/api/pharmacy/orders',
      body: { productId: 'p1' },
      user: { userId: 'u1' },
    };
    const res = resDouble();
    const next = jest.fn();

    await idempotency(prisma)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ error: { code: 'IDEMPOTENCY_KEY_REUSED' } });
  });

  it('rejects reuse of a key with a different request payload', async () => {
    const prisma: any = {
      idempotencyKey: {
        create: jest.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' })),
        findUnique: jest.fn().mockResolvedValue({
          statusCode: 200,
          response: { ok: true },
          method: 'POST',
          path: '/api/wallets/topup',
          requestHash: hashBody({ amount: 1000 }),
        }),
        update: jest.fn(),
      },
    };
    const req: any = {
      headers: { 'idempotency-key': 'payload-key' },
      method: 'POST',
      path: '/api/wallets/topup',
      body: { amount: 5000 },
      user: { userId: 'u1' },
    };
    const res = resDouble();
    const next = jest.fn();

    await idempotency(prisma)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ error: { code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' } });
  });

  it('re-registers an expired key before the request handler runs', async () => {
    const prisma: any = {
      idempotencyKey: {
        create: jest
          .fn()
          .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }))
          .mockResolvedValueOnce({}),
        findUnique: jest.fn().mockResolvedValue({
          statusCode: 200,
          response: { old: true },
          method: 'POST',
          path: '/api/appointments',
          requestHash: hashBody({ providerId: 'p1' }),
          createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        }),
        delete: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const req: any = {
      headers: { 'idempotency-key': 'expired-key' },
      method: 'POST',
      path: '/api/appointments',
      body: { providerId: 'p1' },
      user: { userId: 'u1' },
    };
    const next = jest.fn();

    await idempotency(prisma)(req, resDouble(), next);

    expect(prisma.idempotencyKey.delete).toHaveBeenCalled();
    expect(prisma.idempotencyKey.create).toHaveBeenCalledTimes(2);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
