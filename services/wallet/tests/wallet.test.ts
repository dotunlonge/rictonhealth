process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mocked';
import request from 'supertest';
import express from 'express';
import walletRoutes from '../src/routes/wallet.routes';
import { prisma, UserRole, UserStatus, WalletTransactionType } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const app = express();
app.use(express.json());
app.use('/api/wallets', walletRoutes);
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
let testUserEmail: string;
let token: string;

beforeAll(async () => {
  await prisma.user.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.walletTransaction.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: 'walletuser@example.com',
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
  testUserEmail = user.email!;

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

describe('Wallet Controller Integration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/wallets/me', () => {
    it('should create wallet on first fetch and return 0 balance', async () => {
      const res = await request(app).get('/api/wallets/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(0);
      expect(res.body.data.userId).toBe(testUserId);

      const wallet = await prisma.wallet.findUnique({
        where: { userId: testUserId },
      });
      expect(wallet).toBeDefined();
    });
  });

  describe('POST /api/wallets/virtual-account', () => {
    it('should assign a virtual account via Paystack', async () => {
      // Mock Customer creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: true,
          data: { customer_code: 'CUS_mock_123' },
        }),
      });

      // Mock DVA creation
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: true,
          data: {
            account_number: '9988776655',
            bank: { name: 'Wema Bank' },
          },
        }),
      });

      const res = await request(app)
        .post('/api/wallets/virtual-account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.virtualAccountNumber).toBe('9988776655');
      expect(res.body.data.virtualBankName).toBe('Wema Bank');

      const wallet = await prisma.wallet.findUnique({
        where: { userId: testUserId },
      });
      expect(wallet?.virtualAccountNumber).toBe('9988776655');
    });
  });

  describe('POST /api/wallets/webhook', () => {
    it('should credit wallet balance on dedicated_nuban top-up', async () => {
      const eventPayload = {
        event: 'charge.success',
        data: {
          reference: 'mock_transfer_ref_123',
          amount: 500000, // 5000 NGN in kobo
          channel: 'dedicated_nuban',
          customer: {
            email: testUserEmail,
          },
        },
      };

      const signature = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
        .update(JSON.stringify(eventPayload))
        .digest('hex');

      const res = await request(app)
        .post('/api/wallets/webhook')
        .set('x-paystack-signature', signature)
        .send(eventPayload);

      expect(res.status).toBe(200);

      // Verify transaction was logged
      const wallet = await prisma.wallet.findUnique({
        where: { userId: testUserId },
        include: { transactions: true },
      });

      expect(wallet?.transactions.length).toBe(1);
      expect(wallet?.transactions[0].amount.toString()).toBe('5000');
      expect(wallet?.transactions[0].type).toBe(WalletTransactionType.CREDIT);
      expect(wallet?.transactions[0].referenceId).toBe('mock_transfer_ref_123');
    });
  });
});
