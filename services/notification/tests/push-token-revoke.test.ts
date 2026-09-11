/**
 * A2: push-token revoke (TDD RED→GREEN). DB-free: prisma mocked.
 * Run: npx jest services/notification/tests/push-token-revoke.test.ts
 */
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.OTP_SECRET = 'test-otp-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';

import { revokePushToken } from '../src/controllers/notification.controller';
import { prisma } from '@ricton/db';

jest.mock('@ricton/db', () => ({
  __esModule: true,
  prisma: { pushToken: { updateMany: jest.fn() } },
}));

function resDouble() {
  const res: any = { statusCode: 200, body: undefined as any };
  res.status = jest.fn((c: number) => {
    res.statusCode = c;
    return res;
  });
  res.json = jest.fn((b: unknown) => {
    res.body = b;
    return res;
  });
  return res;
}

describe('revokePushToken', () => {
  it('deactivates the token scoped to the calling user', async () => {
    (prisma.pushToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const req: any = { user: { userId: 'u1' }, params: { token: 'expo-push-1' } };
    const res = resDouble();
    const next = jest.fn();
    await revokePushToken(req, res, next);
    expect(prisma.pushToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', token: 'expo-push-1' },
      data: expect.objectContaining({ isActive: false }),
    });
    expect(res.statusCode).toBe(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('is idempotent for unknown tokens (no enumeration leak)', async () => {
    (prisma.pushToken.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const req: any = { user: { userId: 'u1' }, params: { token: 'unknown' } };
    const res = resDouble();
    const next = jest.fn();
    await revokePushToken(req, res, next);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true });
  });
});
