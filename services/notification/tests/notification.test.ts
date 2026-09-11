(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus, NotificationChannel } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import notificationRoutes from '../src/routes/notification.routes';
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

describe('Notification & Multichannel Delivery Service (TDD)', () => {
  let app: Express;
  let admin: any;
  let patient: any;
  let adminToken: string;
  let patientToken: string;
  let notificationId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRoutes);
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

    // 1. Admin
    admin = await createUser({
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Super',
      lastName: 'Admin',
    });
    adminToken = jwt.sign(
      {
        userId: admin.id,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // 2. Patient
    patient = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Notify',
      lastName: 'Recipient',
    });
    patientToken = jwt.sign(
      {
        userId: patient.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: [admin.id, patient.id] } },
    });
    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: [admin.id, patient.id] } },
    });
    await prisma.patientProfile.deleteMany({
      where: { userId: patient.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [admin.id, patient.id] } },
    });
  });

  it('1. should allow admin to dispatch a multichannel notification to a user', async () => {
    const res = await request(app)
      .post('/api/notifications/test')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: patient.id,
        type: 'APPOINTMENT_REMINDER',
        title: 'Upcoming Video Appointment',
        body: 'Your consultation starts in 15 minutes.',
        channel: NotificationChannel.IN_APP,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.id).toBeDefined();
    expect(res.body.data.notification.userId).toBe(patient.id);
    expect(res.body.data.notification.isRead).toBe(false);

    notificationId = res.body.data.notification.id;
  });

  it('2. should list notifications and calculate unread count for patient', async () => {
    const listRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.notifications).toHaveLength(1);
    expect(listRes.body.data.total).toBe(1);

    const countRes = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(countRes.status).toBe(200);
    expect(countRes.body.success).toBe(true);
    expect(countRes.body.data.count).toBe(1);
  });

  it('3. should mark a single notification as read', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isRead).toBe(true);
    expect(res.body.data.readAt).toBeDefined();
  });

  it('4. should mark all user notifications as read in bulk', async () => {
    // Create an unread notification first
    await prisma.notification.create({
      data: {
        userId: patient.id,
        type: 'WALLET_CREDITED',
        title: 'Wallet Funded',
        body: 'Your wallet has been funded with ₦5,000.',
        channel: NotificationChannel.IN_APP,
      },
    });

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBeGreaterThanOrEqual(1);

    const unreadCount = await prisma.notification.count({
      where: { userId: patient.id, isRead: false },
    });
    expect(unreadCount).toBe(0);
  });

  it('5. should configure and retrieve user notification preferences', async () => {
    const updateRes = await request(app)
      .put('/api/notifications/preferences')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.smsEnabled).toBe(false);
    expect(updateRes.body.data.quietHoursStart).toBe('22:00');

    const getRes = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.smsEnabled).toBe(false);
    expect(getRes.body.data.quietHoursEnd).toBe('07:00');
  });
});
