process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mocked';

import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

import walletRoutes from '../src/routes/wallet.routes';
import { prisma, UserRole, WalletTransactionType } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import {
  createUser,
  createAuthToken,
  createWallet,
  createWalletTransaction,
  createPatientProfile,
} from '../../../packages/shared/src/__tests__/factories';

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

describe('Wallet Controller Integration', () => {
  beforeEach(async () => {
    await prisma.walletTransaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
  });

  const mockCustomerCreation = () => ({
    ok: true,
    json: async () => ({
      status: true,
      data: { customer_code: 'CUS_mock_123' },
    }),
  });

  const mockDvaCreation = () => ({
    ok: true,
    json: async () => ({
      status: true,
      data: {
        account_number: '9988776655',
        bank: { name: 'Wema Bank' },
      },
    }),
  });

  const mockPaystackInitialize = (reference: string) => ({
    ok: true,
    json: async () => ({
      status: true,
      message: 'Authorization URL created',
      data: {
        authorization_url: 'https://checkout.paystack.com/mock',
        access_code: 'mock_access_code',
        reference,
      },
    }),
  });

  describe('GET /api/wallets/me', () => {
    it('should create wallet on first fetch and return 0 balance', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      const res = await request(app).get('/api/wallets/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(0);
      expect(res.body.data.userId).toBe(user.id);

      const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
      });
      expect(wallet).toBeDefined();
    });
  });

  describe('POST /api/wallets/virtual-account', () => {
    it('should create a virtual account via Paystack and update wallet', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      await createPatientProfile(user, { firstName: 'Wallet', lastName: 'User' });
      const token = createAuthToken(user);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockCustomerCreation())
        .mockResolvedValueOnce(mockDvaCreation());

      const res = await request(app)
        .post('/api/wallets/virtual-account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.virtualAccountNumber).toBe('9988776655');
      expect(res.body.data.virtualBankName).toBe('Wema Bank');

      const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
      });
      expect(wallet?.virtualAccountNumber).toBe('9988776655');
    });

    it('should return existing virtual account if already assigned', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      await createWallet(user);
      const token = createAuthToken(user);

      const res = await request(app)
        .post('/api/wallets/virtual-account')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/wallets/transactions', () => {
    it('should return paginated list of wallet transactions', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const wallet = await createWallet(user);
      const token = createAuthToken(user);

      await createWalletTransaction(wallet.id, { amount: 5000, description: 'Top-up 1' });
      await createWalletTransaction(wallet.id, { amount: 3000, description: 'Top-up 2' });

      const res = await request(app)
        .get('/api/wallets/transactions?limit=10&offset=0')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactions).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
    });
  });

  describe('POST /api/wallets/topup', () => {
    it('should initialize a wallet top-up payment', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      await createPatientProfile(user, { firstName: 'Topup', lastName: 'User' });
      const token = createAuthToken(user);
      const reference = `WALLET_TOPUP_${user.id}_${Date.now()}`;

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockPaystackInitialize(reference));

      const res = await request(app)
        .post('/api/wallets/topup')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 5000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authorizationUrl).toBe('https://checkout.paystack.com/mock');
      expect(res.body.data.amount).toBe(5000);
    });

    it('should return 400 when amount is below minimum', async () => {
      const user = await createUser({ role: UserRole.PATIENT });
      const token = createAuthToken(user);

      const res = await request(app)
        .post('/api/wallets/topup')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 50 });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/wallets/webhook', () => {
    it('should credit wallet balance on valid dedicated_nuban top-up webhook', async () => {
      const user = await createUser({ role: UserRole.PATIENT, email: 'walletwebhook@example.com' });
      const wallet = await createWallet(user);

      await createWalletTransaction(wallet.id, { amount: 1000 });

      const eventPayload = {
        event: 'charge.success',
        data: {
          reference: 'mock_transfer_ref_123',
          amount: 500000,
          channel: 'dedicated_nuban',
          customer: {
            email: 'walletwebhook@example.com',
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

      const updatedWallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
        include: { transactions: true },
      });

      expect(updatedWallet?.transactions.length).toBe(2);
      expect(updatedWallet?.transactions[1].amount.toString()).toBe('5000');
      expect(updatedWallet?.transactions[1].type).toBe(WalletTransactionType.CREDIT);
      expect(updatedWallet?.transactions[1].referenceId).toBe('mock_transfer_ref_123');
    });

    it('should return 401 with invalid webhook signature', async () => {
      const res = await request(app)
        .post('/api/wallets/webhook')
        .set('x-paystack-signature', 'invalid-signature')
        .send({ event: 'charge.success', data: {} });

      expect(res.status).toBe(401);
    });
  });
});
