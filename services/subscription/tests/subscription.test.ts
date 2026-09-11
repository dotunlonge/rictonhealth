(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake_paystack_key';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus, SubscriptionPlan, SubscriptionStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import subscriptionRoutes from '../src/routes/subscription.routes';
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

describe('Subscription & Tier Management Service (TDD)', () => {
  let app: Express;
  let user: any;
  let userToken: string;
  let activeSubscriptionId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/subscriptions', subscriptionRoutes);
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
      firstName: 'Sub',
      lastName: 'Subscriber',
    });
    userToken = jwt.sign(
      { userId: user.id, role: UserRole.PATIENT, status: UserStatus.ACTIVE, iss: 'ricton-issuer' },
      'test-jwt-secret'
    );

    // Mock global fetch for Paystack API initialization
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('transaction/initialize')) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              status: true,
              message: 'Authorization URL created',
              data: {
                authorization_url: 'https://checkout.paystack.com/fake_auth_url',
                access_code: 'access_code_123',
                reference: `SUB_${user.id}_ref_123`,
              },
            }),
        });
      }
      return Promise.reject(new Error('Unknown URL in mock'));
    }) as jest.Mock;
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany({ where: { userId: user.id } });
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.patientProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  it('1. should list available subscription plans and their feature sets', async () => {
    const res = await request(app)
      .get('/api/subscriptions/plans')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plans).toHaveLength(2);
    expect(res.body.data.plans.some((p: any) => p.code === SubscriptionPlan.FREE)).toBe(true);
    expect(res.body.data.plans.some((p: any) => p.code === SubscriptionPlan.PREMIUM)).toBe(true);
  });

  it('2. should return default FREE plan status when user has no active subscription', async () => {
    const res = await request(app)
      .get('/api/subscriptions/my')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.plan).toBe(SubscriptionPlan.FREE);
    expect(res.body.data.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('3. should initialize upgrade to PREMIUM plan with gateway checkout URL', async () => {
    const res = await request(app)
      .post('/api/subscriptions/upgrade')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        plan: SubscriptionPlan.PREMIUM,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentUrl).toBe('https://checkout.paystack.com/fake_auth_url');
    expect(res.body.data.subscription.plan).toBe(SubscriptionPlan.PREMIUM);
    expect(res.body.data.subscription.id).toBeDefined();

    activeSubscriptionId = res.body.data.subscription.id;
  });

  it('4. should cancel active premium subscription disabling auto-renew', async () => {
    const res = await request(app)
      .post('/api/subscriptions/cancel')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription.id).toBe(activeSubscriptionId);
    expect(res.body.data.subscription.autoRenew).toBe(false);
  });

  it('5. should retrieve subscription billing and renewal history', async () => {
    const res = await request(app)
      .get('/api/subscriptions/history')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscriptions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.subscriptions[0].plan).toBe(SubscriptionPlan.PREMIUM);
  });
});
