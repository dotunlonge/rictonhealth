(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.INTERNAL_API_SECRET = 'test-internal-api-secret-at-least-32-characters';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import rewardsRoutes from '../src/routes/rewards.routes';
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

describe('Rewards & Gamification Loyalty Service (TDD)', () => {
  let app: Express;
  let user: any;
  let userToken: string;
  let rewardItem: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/rewards', rewardsRoutes);
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

    user = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Points',
      lastName: 'Collector',
    });
    userToken = jwt.sign(
      { userId: user.id, role: UserRole.PATIENT, status: UserStatus.ACTIVE, iss: 'ricton-issuer' },
      'test-jwt-secret'
    );
    // Create a catalog item
    rewardItem = await prisma.rewardCatalog.create({
      data: {
        name: 'Free Video Consultation Voucher',
        description: 'Redeem 500 points for a free specialist video call',
        pointsCost: 500,
        stock: 50,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.rewardTransaction.deleteMany({ where: { userId: user.id } });
    await prisma.rewardCatalog.deleteMany({ where: { id: rewardItem.id } });
    await prisma.patientProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it('1. should return 0 points balance and default Bronze tier initially', async () => {
    const res = await request(app)
      .get('/api/rewards/balance')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.balance).toBe(0);
    expect(res.body.data.tier).toBe('BRONZE');
    expect(res.body.data.pointsToNextTier).toBe(1000);
  });

  it('2. should list available catalog items for redemption', async () => {
    const res = await request(app)
      .get('/api/rewards/catalog')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.some((r: any) => r.id === rewardItem.id)).toBe(true);
  });

  it('3. should allow internal service to award points for completed consultations', async () => {
    const res = await request(app)
      .post('/api/rewards/internal/earn')
      .set('X-Internal-Secret', process.env.INTERNAL_API_SECRET as string)
      .send({
        userId: user.id,
        source: 'APPOINTMENT',
        referenceId: `appt-${Date.now()}`,
        basePoints: 100,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pointsAwarded).toBeGreaterThan(0);
    expect(res.body.data.newTotal).toBeGreaterThan(0);
  });

  it('4. should redeem points for catalog reward and update balance atomically', async () => {
    // Add enough points first
    await prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        points: 1000,
        type: 'EARN',
        source: 'PROMOTION',
        description: 'Test Bonus Points',
      },
    });

    const idempotencyKey = `redeem-${Date.now()}`;
    const res = await request(app)
      .post('/api/rewards/redeem')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        rewardId: rewardItem.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.redemption.pointsUsed).toBe(500);
    expect(res.body.data.redemption.reward.id).toBe(rewardItem.id);

    const retry = await request(app)
      .post('/api/rewards/redeem')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ rewardId: rewardItem.id });
    expect(retry.status).toBe(201);
    expect(retry.body.data.redemption.id).toBe(res.body.data.redemption.id);
    await expect(
      prisma.rewardTransaction.count({
        where: { userId: user.id, type: 'REDEEM', rewardCatalogId: rewardItem.id },
      })
    ).resolves.toBe(1);
  });

  it('5. should reject redemption if user has insufficient points balance', async () => {
    // Attempt to redeem with higher cost reward
    const expensiveReward = await prisma.rewardCatalog.create({
      data: {
        name: 'Full Health Checkup Package',
        description: 'Comprehensive hospital screening package',
        pointsCost: 50000,
        stock: 5,
        isActive: true,
      },
    });

    const res = await request(app)
      .post('/api/rewards/redeem')
      .set('Authorization', `Bearer ${userToken}`)
      .set('Idempotency-Key', `insufficient-${Date.now()}`)
      .send({
        rewardId: expensiveReward.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/insufficient/i);

    await prisma.rewardCatalog.delete({ where: { id: expensiveReward.id } });
  });
});
