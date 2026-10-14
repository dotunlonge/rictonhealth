(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus, AppointmentType } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import messagingRoutes from '../src/routes/messaging.routes';
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

describe('Messaging & Real-Time Chat Thread Service (TDD)', () => {
  let app: Express;
  let userA: any;
  let userB: any;
  let outsider: any;
  let tokenA: string;
  let tokenB: string;
  let outsiderToken: string;
  let threadId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/messaging', messagingRoutes);
    app.use(
      (
        err: Error & { statusCode?: number; code?: string },
        _req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        if (!err.statusCode || err.statusCode >= 500) {
          console.error('[MESSAGING TEST ERROR]', err);
        }
        res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
      }
    );

    // 1. User A (Patient)
    userA = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Alice',
      lastName: 'Sender',
    });
    tokenA = jwt.sign(
      { userId: userA.id, role: UserRole.PATIENT, status: UserStatus.ACTIVE, iss: 'ricton-issuer' },
      'test-jwt-secret'
    );

    // 2. User B (Doctor)
    userB = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Bob',
      lastName: 'Receiver',
    });
    tokenB = jwt.sign(
      {
        userId: userB.id,
        role: UserRole.CONSULTANT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // 3. Outsider
    outsider = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Charlie',
      lastName: 'Outsider',
    });
    outsiderToken = jwt.sign(
      {
        userId: outsider.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // Care-team thread (#40/#65 gate): patient A + doctor B share an appointment.
    await prisma.appointment.create({
      data: {
        patientId: userA.id,
        providerId: userB.id,
        scheduledAt: new Date(Date.now() + 60 * 60_000),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Care-team thread fixture',
      },
    });
  });

  afterAll(async () => {
    await prisma.chatMessageReceipt.deleteMany({
      where: { userId: { in: [userA.id, userB.id, outsider.id] } },
    });
    await prisma.chatMessage.deleteMany({
      where: { senderId: { in: [userA.id, userB.id, outsider.id] } },
    });
    await prisma.chatParticipant.deleteMany({
      where: { userId: { in: [userA.id, userB.id, outsider.id] } },
    });
    await prisma.chatThread.deleteMany({});
    await prisma.appointment.deleteMany({
      where: { patientId: userA.id, providerId: userB.id },
    });
    await prisma.patientProfile.deleteMany({
      where: { userId: { in: [userA.id, outsider.id] } },
    });
    await prisma.providerProfile.deleteMany({
      where: { userId: userB.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id, outsider.id] } },
    });
  });

  it('1. should create a direct conversation between two users', async () => {
    const res = await request(app)
      .post('/api/messaging/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        participantIds: [userB.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.participants).toHaveLength(2);

    threadId = res.body.data.id;
  });

  it('2. should allow a participant to send a text message in the conversation', async () => {
    const res = await request(app)
      .post(`/api/messaging/conversations/${threadId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        body: 'Hello Dr. Bob, I have a quick question.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.body).toBe('Hello Dr. Bob, I have a quick question.');
    expect(res.body.data.senderId).toBe(userA.id);
  });

  it('3. should allow conversation participants to retrieve message history', async () => {
    const res = await request(app)
      .get(`/api/messaging/conversations/${threadId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.messages).toHaveLength(1);
    expect(res.body.data.messages[0].body).toBe('Hello Dr. Bob, I have a quick question.');
  });

  it('4. should reject message sending or retrieval by non-participants (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/messaging/conversations/${threadId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/not a participant/i);
  });

  it('5. should mark conversation messages as read', async () => {
    const res = await request(app)
      .patch(`/api/messaging/conversations/${threadId}/read`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ markAll: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('6. should list user conversations with last message and unread count', async () => {
    const res = await request(app)
      .get('/api/messaging/conversations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conversations).toHaveLength(1);
    expect(res.body.data.conversations[0].id).toBe(threadId);
    expect(res.body.data.conversations[0].lastMessage).toBeDefined();
  });
});
