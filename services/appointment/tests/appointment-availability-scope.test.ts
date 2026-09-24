(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import appointmentRoutes from '../src/routes/appointment.routes';
import { createUser } from '../../../packages/shared/src/__tests__/factories';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('../../../packages/shared/src/index');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return {
    __esModule: true,
    ...actual,
    redis: createRedisMock(),
  };
});

jest.mock('@ricton/shared/jobs', () => ({
  __esModule: true,
  emailQueue: { add: jest.fn().mockResolvedValue(undefined) },
  smsQueue: { add: jest.fn().mockResolvedValue(undefined) },
}));

describe('Availability hospital scoping (TDD RED)', () => {
  let app: Express;
  let hospitalA: any;
  let hospitalB: any;
  let providerA: any;
  let providerB: any;
  let adminA: any;
  let superAdmin: any;
  let adminAToken: string;
  let superToken: string;

  function tokenFor(user: any, role: UserRole) {
    return jwt.sign(
      { userId: user.id, role, status: UserStatus.ACTIVE, iss: 'ricton-issuer' },
      'test-jwt-secret'
    );
  }

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/appointments', appointmentRoutes);
    app.use(
      (
        err: Error & { statusCode?: number; code?: string },
        _req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
      }
    );

    hospitalA = await prisma.hospital.create({ data: { name: `Hosp A ${Date.now()}` } });
    hospitalB = await prisma.hospital.create({ data: { name: `Hosp B ${Date.now()}` } });

    providerA = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Scope',
      lastName: 'ProvA',
    });
    providerB = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Scope',
      lastName: 'ProvB',
    });
    for (const [provider, hospital] of [
      [providerA, hospitalA],
      [providerB, hospitalB],
    ] as const) {
      await prisma.providerProfile.upsert({
        where: { userId: provider.id },
        create: {
          userId: provider.id,
          firstName: 'Scope',
          lastName: provider === providerA ? 'ProvA' : 'ProvB',
          specialty: 'General',
          hospitalId: hospital.id,
        },
        update: { hospitalId: hospital.id },
      });
    }

    adminA = await createUser({
      role: UserRole.HOSPITAL_ADMIN,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Scope',
      lastName: 'AdminA',
    });
    await prisma.user.update({ where: { id: adminA.id }, data: { hospitalId: hospitalA.id } });
    adminAToken = tokenFor(adminA, UserRole.HOSPITAL_ADMIN);

    superAdmin = await createUser({
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Scope',
      lastName: 'Super',
    });
    superToken = tokenFor(superAdmin, UserRole.SUPER_ADMIN);
  });

  afterAll(async () => {
    await prisma.providerAvailability.deleteMany({
      where: { providerId: { in: [providerA.id, providerB.id] } },
    });
    await prisma.providerProfile.deleteMany({
      where: { userId: { in: [providerA.id, providerB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [providerA.id, providerB.id, adminA.id, superAdmin.id] } },
    });
    await prisma.hospital.deleteMany({ where: { id: { in: [hospitalA.id, hospitalB.id] } } });
    await prisma.$disconnect();
  });

  const payload = (providerId: string) => ({
    providerId,
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
  });

  it("lets a hospital admin set hours for their own hospital's provider", async () => {
    const res = await request(app)
      .post('/api/appointments/availability')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send(payload(providerA.id));
    expect(res.status).toBe(200);
  });

  it("forbids a hospital admin from setting another hospital's hours", async () => {
    const res = await request(app)
      .post('/api/appointments/availability')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send(payload(providerB.id));
    expect(res.status).toBe(403);
  });

  it('lets a super admin set hours anywhere', async () => {
    const res = await request(app)
      .post('/api/appointments/availability')
      .set('Authorization', `Bearer ${superToken}`)
      .send(payload(providerB.id));
    expect(res.status).toBe(200);
  });

  it('fails closed when a hospital-less admin lists appointments', async () => {
    const orphan = await createUser({
      role: UserRole.HOSPITAL_ADMIN,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Scope',
      lastName: 'Orphan',
    });
    const orphanToken = tokenFor(orphan, UserRole.HOSPITAL_ADMIN);
    try {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${orphanToken}`);
      // Fail closed (403), never a null-hospital dump (200).
      expect(res.status).toBe(403);
    } finally {
      await prisma.user.delete({ where: { id: orphan.id } });
    }
  });
});
