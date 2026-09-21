process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mocked';

import request from 'supertest';
import express from 'express';
import crypto from 'crypto';

import walletRoutes from '../src/routes/wallet.routes';
import { prisma, UserRole, WalletReferenceType, WalletTransactionType } from '@ricton/db';
import { errorResponse, redis } from '@ricton/shared';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('@ricton/shared');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return { __esModule: true, ...actual, redis: createRedisMock() };
});
import {
  createUser,
  createAuthToken,
  createWallet,
  cleanDatabase,
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

describe('Wallet Withdrawal (money-out)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    redis.disconnect();
  });

  beforeEach(async () => {
    await cleanDatabase();
    (global.fetch as unknown as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function fundedUser(email: string, balance: number) {
    const user = await createUser({ role: UserRole.PATIENT, email });
    const wallet = await createWallet(user);
    await prisma.wallet.update({ where: { id: wallet.id }, data: { balance } });
    return { user, token: createAuthToken(user), walletId: wallet.id };
  }

  const mockPaystackOk = () => {
    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true, data: { recipient_code: 'RCP_mock_1' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: true,
          data: { account_number: '0123456789', account_name: 'E2E RECIPIENT' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: true,
          data: { reference: 'TRF_mock_1', transfer_code: 'TRF_mock_1', status: 'pending' },
        }),
      });
  };

  it('rejects amounts below the 100 NGN minimum', async () => {
    const { token } = await fundedUser('wd-min@example.com', 20000);
    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50, bankCode: '058', accountNumber: '0123456789' });
    expect(res.status).toBe(400);
  });

  it('rejects missing destination', async () => {
    const { token } = await fundedUser('wd-dest@example.com', 20000);
    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000 });
    expect(res.status).toBe(400);
  });

  it('rejects withdrawals above the balance without moving money', async () => {
    const { token, user } = await fundedUser('wd-poor@example.com', 1000);
    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, bankCode: '058', accountNumber: '0123456789' });
    expect(res.status).toBe(400);
    expect(global.fetch as unknown as jest.Mock).not.toHaveBeenCalled();
    const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
    expect(Number(wallet?.balance)).toBe(1000);
  });

  it('never pays an unverified destination (no debit)', async () => {
    const { token, user } = await fundedUser('wd-unverified@example.com', 20000);
    // Paystack itself rejects the recipient: the account does not exist.
    (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ status: false, message: 'Cannot resolve account' }),
    });
    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, bankCode: '058', accountNumber: '0000000000' });
    expect(res.status).toBe(400);
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      include: { transactions: true },
    });
    expect(Number(wallet?.balance)).toBe(20000);
    expect(wallet?.transactions.length).toBe(0);
  });

  it('debits on success and returns the provider reference', async () => {
    const { token, user } = await fundedUser('wd-ok@example.com', 20000);
    mockPaystackOk();
    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, bankCode: '058', accountNumber: '0123456789' });
    expect(res.status).toBe(200);
    expect(res.body.data.reference).toMatch(/^WALLET_WITHDRAW_/);
    expect(res.body.data.accountName).toBe('E2E RECIPIENT');
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      include: { transactions: true },
    });
    expect(Number(wallet?.balance)).toBe(15000);
    expect(wallet?.transactions.length).toBe(1);
    expect(wallet?.transactions[0].type).toBe(WalletTransactionType.DEBIT);
  });

  it('refunds when the provider rejects after debit', async () => {
    const { token, user } = await fundedUser('wd-reject@example.com', 20000);
    (global.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: true, data: { recipient_code: 'RCP_mock_1' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: true,
          data: { account_number: '0123456789', account_name: 'E2E RECIPIENT' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ status: false, message: 'Insufficient funds in settlement account' }),
      });
    const res = await request(app)
      .post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 5000, bankCode: '058', accountNumber: '0123456789' });
    expect(res.status).toBe(400);
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      include: { transactions: true },
    });
    // Debit + reversal refund net to the original balance.
    expect(Number(wallet?.balance)).toBe(20000);
    expect(wallet?.transactions.length).toBe(2);
    expect(wallet?.transactions[1].type).toBe(WalletTransactionType.CREDIT);
  });

  function signedTransferWebhook(payload: object) {
    const raw = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
      .update(raw)
      .digest('hex');
    return request(app)
      .post('/api/wallets/webhook')
      .set('x-paystack-signature', signature)
      .send(payload);
  }

  it('transfer.failed refunds exactly once across duplicate deliveries', async () => {
    const { user } = await fundedUser('wd-failed@example.com', 20000);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    // Simulate the debit half of a withdrawal.
    await prisma.$transaction([
      prisma.wallet.update({ where: { id: wallet.id }, data: { balance: 15000 } }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEBIT,
          amount: 5000,
          balanceAfter: 15000,
          description: 'Withdrawal',
          referenceType: WalletReferenceType.PAYOUT,
          referenceId: 'WALLET_WITHDRAW_test_1',
        },
      }),
    ]);
    const payload = {
      event: 'transfer.failed',
      data: { reference: 'WALLET_WITHDRAW_test_1', amount: 500000, currency: 'NGN' },
    };
    expect((await signedTransferWebhook(payload)).status).toBe(200);
    expect((await signedTransferWebhook(payload)).status).toBe(200);
    const after = await prisma.wallet.findUniqueOrThrow({
      where: { id: wallet.id },
      include: { transactions: true },
    });
    expect(Number(after.balance)).toBe(20000);
    expect(after.transactions.filter((t) => t.type === WalletTransactionType.CREDIT).length).toBe(
      1
    );
  });

  it('transfer.success is a no-op (already debited at initiation)', async () => {
    const { user } = await fundedUser('wd-success@example.com', 15000);
    const payload = {
      event: 'transfer.success',
      data: { reference: 'WALLET_WITHDRAW_test_2', amount: 500000, currency: 'NGN' },
    };
    expect((await signedTransferWebhook(payload)).status).toBe(200);
    const after = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
    expect(Number(after.balance)).toBe(15000);
  });
});
