/**
 * Address tenant isolation (DB-free: prisma mocked).
 * Run: npx jest services/address/tests/address.test.ts
 */
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';

import { getAddresses, getAddressById, deleteAddress } from '../src/controllers/address.controller';
import { prisma } from '@ricton/db';

jest.mock('@ricton/db', () => ({
  __esModule: true,
  prisma: {
    address: { findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
  },
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

describe('address tenant isolation', () => {
  it('scopes list to the calling user', async () => {
    (prisma.address.findMany as jest.Mock).mockResolvedValue([]);
    const req: any = { user: { userId: 'u1' } };
    const res = resDouble();
    await getAddresses(req, res, jest.fn());
    expect(prisma.address.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } })
    );
    expect(res.statusCode).toBe(200);
  });

  it('never returns another user\u2019s address (findFirst is user-scoped)', async () => {
    (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);
    const req: any = { user: { userId: 'u1' }, params: { id: 'a1' } };
    const res = resDouble();
    const next = jest.fn();
    await getAddressById(req, res, next);
    expect(prisma.address.findFirst).toHaveBeenCalledWith({
      where: { id: 'a1', userId: 'u1' },
    });
    expect(next).toHaveBeenCalled();
  });

  it('checks ownership before delete (never deletes blindly by id)', async () => {
    (prisma.address.findFirst as jest.Mock).mockResolvedValue({ id: 'a1', userId: 'u1' });
    (prisma.address.delete as jest.Mock).mockResolvedValue({ id: 'a1' });
    const req: any = { user: { userId: 'u1' }, params: { id: 'a1' } };
    const res = resDouble();
    await deleteAddress(req, res, jest.fn());
    expect(prisma.address.findFirst).toHaveBeenCalledWith({
      where: { id: 'a1', userId: 'u1' },
    });
    expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });
});
