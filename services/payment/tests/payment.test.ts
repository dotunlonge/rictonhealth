process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mocked';
import request from 'supertest';
import express from 'express';
import paymentRoutes from '../src/routes/payment.routes';
import {
  prisma,
  UserRole,
  UserStatus,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
} from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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

let testUserId: string;
let token: string;

beforeAll(async () => {
  await prisma.user.deleteMany();
  await prisma.payment.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: 'usertest@example.com',
      passwordHash: 'hashed_password_mock',
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      patientProfile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  });

  testUserId = user.id;

  token = jwt.sign(
    { userId: testUserId, role: user.role, status: user.status },
    process.env.JWT_SECRET as string
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Mock fetch globally
global.fetch = jest.fn();

describe('Payment Controller Integration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/payments/initialize', () => {
    it('should initialize a payment successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/mock',
            access_code: 'mock_access_code',
            reference: 'mock_ref_123',
          },
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const res = await request(app)
        .post('/api/payments/initialize')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 15000, email: 'usertest@example.com', type: 'WALLET_TOPUP' });

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
  });

  describe('GET /api/payments/verify/:reference', () => {
    it('should verify a payment and mark as success', async () => {
      // Create pending payment first
      await prisma.payment.create({
        data: {
          userId: testUserId,
          amount: 15000,
          currency: 'NGN',
          type: PaymentType.WALLET_TOPUP,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.PAYSTACK,
          providerReference: 'mock_ref_to_verify',
        },
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          status: true,
          message: 'Verification successful',
          data: {
            status: 'success',
            id: 9876543,
            reference: 'mock_ref_to_verify',
          },
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const res = await request(app)
        .get('/api/payments/verify/mock_ref_to_verify')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUCCESS');

      const updatedPayment = await prisma.payment.findUnique({
        where: { providerReference: 'mock_ref_to_verify' },
      });
      expect(updatedPayment?.status).toBe('SUCCESS');
      expect(updatedPayment?.providerTxId).toBe('9876543');
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should process charge.success webhook event', async () => {
      await prisma.payment.create({
        data: {
          userId: testUserId,
          amount: 5000,
          currency: 'NGN',
          type: PaymentType.WALLET_TOPUP,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.PAYSTACK,
          providerReference: 'mock_webhook_ref',
        },
      });

      const eventPayload = {
        event: 'charge.success',
        data: {
          id: 11223344,
          reference: 'mock_webhook_ref',
          status: 'success',
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

      const updatedPayment = await prisma.payment.findUnique({
        where: { providerReference: 'mock_webhook_ref' },
      });
      expect(updatedPayment?.status).toBe('SUCCESS');
    });
  });
});
