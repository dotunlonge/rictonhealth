process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mocked';
process.env.INTERNAL_API_SECRET = 'test-internal-api-secret-32-characters-minimum';

jest.mock('@ricton/shared/jobs', () => ({
  webhookQueue: { add: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('@ricton/shared');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return { __esModule: true, ...actual, redis: createRedisMock() };
});

import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

import paymentRoutes from '../src/routes/payment.routes';
import { prisma, UserRole, PaymentType, PaymentStatus } from '@ricton/db';
import { errorResponse, redis } from '@ricton/shared';
import {
  createUser,
  createAuthToken,
  createPayment,
  cleanDatabase,
} from '../../../packages/shared/src/__tests__/factories';

const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);
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

describe('Payment Controller Integration', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    // Node ships native fetch: install a per-test mock for Paystack calls.
    (global.fetch as unknown as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockPaystackInitialize = (
    overrides: {
      authorization_url?: string;
      reference?: string;
      status?: boolean;
      message?: string;
    } = {}
  ) => ({
    ok: true,
    json: async () => ({
      status: overrides.status ?? true,
      message: overrides.message || 'Authorization URL created',
      data: {
        authorization_url: overrides.authorization_url || 'https://checkout.paystack.com/mock',
        access_code: 'mock_access_code',
        reference: overrides.reference || 'mock_ref_123',
      },
    }),
  });

  const mockPaystackVerify = (
    overrides: {
      status?: string;
      id?: number;
      message?: string;
      amount?: number;
      currency?: string;
    } = {}
  ) => ({
    ok: true,
    json: async () => ({
      status: true,
      message: overrides.message || 'Verification successful',
      data: {
        status: overrides.status || 'success',
        id: overrides.id ?? 9876543,
        reference: 'mock_ref_to_verify',
        amount: overrides.amount ?? 1_500_000,
        currency: overrides.currency ?? 'NGN',
      },
    }),
  });

  // Paystack reports the failure inside a 200 body; the breaker only throws
  // on transport-level non-2xx.
  const mockPaystackError = (message = 'Paystack error') => ({
    ok: true,
    json: async () => ({
      status: false,
      message,
    }),
  });

  describe('POST /api/payments/initialize', () => {
    it('should initialize a payment successfully', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockPaystackInitialize());

      const res = await request(app)
        .post('/api/payments/initialize')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 15000, email: user.email!, type: PaymentType.WALLET_TOPUP });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorization_url).toBe('https://checkout.paystack.com/mock');

      const payment = await prisma.payment.findUnique({
        where: { providerReference: 'mock_ref_123' },
      });
      expect(payment).toBeDefined();
      expect(payment?.amount.toString()).toBe('15000');
      expect(payment?.status).toBe('PENDING');
    });

    it('should return 400 when amount is invalid for WALLET_TOPUP', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      const res = await request(app)
        .post('/api/payments/initialize')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: -100, email: user.email!, type: PaymentType.WALLET_TOPUP });

      expect(res.status).toBe(400);
    });

    it('should return 400 when email is missing', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      const res = await request(app)
        .post('/api/payments/initialize')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 15000, type: PaymentType.WALLET_TOPUP });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/payments/verify/:reference', () => {
    it('should verify a payment and update status to SUCCESS', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      await createPayment({
        userId: user.id,
        providerReference: 'mock_ref_to_verify',
        status: PaymentStatus.PENDING,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockPaystackVerify());

      const res = await request(app)
        .get('/api/payments/verify/mock_ref_to_verify')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUCCESS');

      const updated = await prisma.payment.findUnique({
        where: { providerReference: 'mock_ref_to_verify' },
      });
      expect(updated?.status).toBe('SUCCESS');
      expect(updated?.providerTxId).toBe('9876543');
    });

    it('should return 400 when Paystack verification fails', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      await createPayment({
        userId: user.id,
        providerReference: 'mock_ref_verify_fail',
        status: PaymentStatus.PENDING,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockPaystackError('Not found'));

      const res = await request(app)
        .get('/api/payments/verify/mock_ref_verify_fail')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PAYSTACK_ERROR');
    });
  });

  describe('GET /api/payments', () => {
    it('should return a list of payments for the authenticated user', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      await createPayment({ userId: user.id, amount: 5000, status: PaymentStatus.SUCCESS });
      await createPayment({ userId: user.id, amount: 10000, status: PaymentStatus.PENDING });

      const res = await request(app).get('/api/payments').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('should return payment details by id', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      const payment = await createPayment({ userId: user.id, amount: 15000 });

      const res = await request(app)
        .get(`/api/payments/${payment.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(payment.id);
    });

    it('should return 404 for non-existent payment', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      const res = await request(app)
        .get('/api/payments/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should process a valid webhook and update payment status', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      await createPayment({
        userId: user.id,
        providerReference: 'mock_webhook_ref',
        status: PaymentStatus.PENDING,
      });

      const eventPayload = {
        event: 'charge.success',
        data: {
          id: 11223344,
          reference: 'mock_webhook_ref',
          status: 'success',
          amount: 1_500_000,
          currency: 'NGN',
        },
      };

      const signature = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
        .update(JSON.stringify(eventPayload))
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-paystack-signature', signature)
        .send(eventPayload);

      expect(res.status).toBe(200);

      const updated = await prisma.payment.findUnique({
        where: { providerReference: 'mock_webhook_ref' },
      });
      expect(updated?.status).toBe('SUCCESS');
    });

    it('should return 401 with invalid webhook signature', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-paystack-signature', 'invalid-signature')
        .send({ event: 'charge.success', data: {} });

      expect(res.status).toBe(401);
    });
  });
});
