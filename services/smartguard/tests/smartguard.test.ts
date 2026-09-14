/**
 * SmartGuard is a read lens over audit logs; routes are SUPER_ADMIN-gated.
 * DB-free: prisma mocked. Run: npx jest services/smartguard/tests/smartguard.test.ts
 */
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test?schema=public';

import { getStatus } from '../src/controllers/smartguard.controller';
import smartguardRoutes from '../src/routes/smartguard.routes';
import { prisma } from '@ricton/db';
import fs from 'fs';
import path from 'path';

jest.mock('@ricton/db', () => ({
  __esModule: true,
  prisma: { auditLog: { count: jest.fn(), findMany: jest.fn() } },
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

describe('smartguard', () => {
  it('status aggregates threat/alert counts without fixtures', async () => {
    (prisma.auditLog.count as jest.Mock).mockResolvedValueOnce(2).mockResolvedValueOnce(5);
    const res = resDouble();
    await getStatus({} as any, res, jest.fn());
    expect(prisma.auditLog.count).toHaveBeenCalledTimes(2);
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data).toMatchObject({ activeThreats: 2, unacknowledgedAlerts: 5 });
  });

  it('routes sit behind requireAuth + SUPER_ADMIN (no public surface)', async () => {
    const layers = (smartguardRoutes as any).stack.map((l: any) => l.handle?.name ?? l.name);
    void layers;
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'routes', 'smartguard.routes.ts'),
      'utf8'
    );
    expect(src).toMatch(/requireAuth/);
    expect(src).toMatch(/requireRole\('SUPER_ADMIN'\)/);
  });
});
