process.env.JWT_SECRET = 'test-jwt-secret';

import request from 'supertest';
import express from 'express';
import adminRoutes from '../src/routes/admin.routes';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import {
  createUser,
  createAuthToken,
  cleanDatabase,
} from '../../../packages/shared/src/__tests__/factories';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('@ricton/shared');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return { __esModule: true, ...actual, redis: createRedisMock() };
});

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
app.use(
  (
    err: Error & { statusCode?: number; code?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
  }
);

describe('Admin authorization (negative: privileged surface)', () => {
  let patientToken: string;
  let activeAdminToken: string;
  let pendingAdminToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    const patient = await createUser({ role: UserRole.PATIENT, status: UserStatus.ACTIVE });
    patientToken = createAuthToken(patient);

    const activeAdmin = await createUser({
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    activeAdminToken = createAuthToken(activeAdmin);

    // A privileged row stuck in PENDING must still be rejected (defense in depth).
    const pendingAdmin = await createUser({
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.PENDING,
    });
    pendingAdminToken = createAuthToken(pendingAdmin);

    const target = await createUser({ role: UserRole.PATIENT, status: UserStatus.ACTIVE });
    targetUserId = target.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it('forbids non-admin roles from user management', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects a PENDING SUPER_ADMIN token (requireActiveStatus)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${pendingAdminToken}`);
    expect(res.status).toBe(403);
  });

  it('allows an ACTIVE SUPER_ADMIN to list users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${activeAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('provisions an ACTIVE hospital admin (the privileged creation path)', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${activeAdminToken}`)
      .send({
        email: 'provisioned-hospital@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'HOSPITAL_ADMIN',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('HOSPITAL_ADMIN');
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.passwordHash).toBeUndefined();
    const persisted = await prisma.user.findUnique({
      where: { email: 'provisioned-hospital@example.com' },
    });
    expect(persisted?.status).toBe('ACTIVE');
    await prisma.auditLog.deleteMany({ where: { resourceId: persisted!.id } });
    await prisma.user.deleteMany({ where: { id: persisted!.id } });
  });

  it('rejects privileged provisioning from non-admins and duplicates', async () => {
    const forbidden = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        email: 'nope@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'HOSPITAL_ADMIN',
      });
    expect(forbidden.status).toBe(403);

    const duplicate = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${activeAdminToken}`)
      .send({
        email: 'provisioned-hospital@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'HOSPITAL_ADMIN',
      });
    expect(duplicate.status).toBe(201);
    const persisted = await prisma.user.findUnique({
      where: { email: 'provisioned-hospital@example.com' },
    });
    const clash = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${activeAdminToken}`)
      .send({
        email: 'provisioned-hospital@example.com',
        password: 'SecureP@ssw0rd1',
        role: 'HOSPITAL_ADMIN',
      });
    expect(clash.status).toBe(409);
    await prisma.auditLog.deleteMany({ where: { resourceId: persisted!.id } });
    await prisma.user.deleteMany({ where: { id: persisted!.id } });
  });

  it('never leaks passwordHash or twoFactorSecret in getUserById', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${activeAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.twoFactorSecret).toBeUndefined();
    expect(res.body.data.id).toBe(targetUserId);
  });
});
