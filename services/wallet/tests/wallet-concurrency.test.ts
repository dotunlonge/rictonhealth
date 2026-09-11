(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import {
  prisma,
  WalletTransactionType,
  WalletReferenceType,
  UserRole,
  UserStatus,
} from '@ricton/db';
import { createUser } from '../../../packages/shared/src/__tests__/factories';
import { creditWalletAtomic, debitWalletAtomic } from '../src/controllers/wallet.controller';

describe('Wallet Concurrency & Transactional Ledger Resilience (TDD)', () => {
  let userId: string;
  let walletId: string;

  beforeEach(async () => {
    const user = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Wallet',
      lastName: 'Tester',
    });
    userId = user.id;

    const wallet = await prisma.wallet.create({
      data: {
        userId,
        currency: 'NGN',
        balance: 0,
      },
    });
    walletId = wallet.id;
  });

  afterEach(async () => {
    await prisma.walletTransaction.deleteMany({ where: { walletId } });
    await prisma.wallet.deleteMany({ where: { id: walletId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('1. should initialize a new wallet with zero balance', async () => {
    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    expect(wallet).toBeDefined();
    expect(Number(wallet?.balance)).toBe(0);
  });

  it('2. should atomically credit wallet balance and record ledger transaction', async () => {
    const amount = 5000;
    const ref = `CREDIT_TEST_${Date.now()}`;

    const tx = await creditWalletAtomic({
      walletId,
      amount,
      referenceType: WalletReferenceType.TOPUP,
      referenceId: ref,
      description: 'Test Topup',
    });

    expect(tx).toBeDefined();
    expect(Number(tx.amount)).toBe(amount);
    expect(Number(tx.balanceAfter)).toBe(5000);
    expect(tx.type).toBe(WalletTransactionType.CREDIT);

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    expect(Number(updatedWallet?.balance)).toBe(5000);
  });

  it('3. should handle concurrent credit transactions without race conditions', async () => {
    const creditAmounts = [100, 200, 300, 400, 500];
    const totalExpected = creditAmounts.reduce((a, b) => a + b, 0);

    // Fire all credits concurrently
    await Promise.all(
      creditAmounts.map((amount, idx) =>
        creditWalletAtomic({
          walletId,
          amount,
          referenceType: WalletReferenceType.TOPUP,
          referenceId: `CONCURRENT_CREDIT_${Date.now()}_${idx}`,
          description: `Concurrent Topup ${idx}`,
        })
      )
    );

    const updatedWallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    expect(Number(updatedWallet?.balance)).toBe(totalExpected);

    const txs = await prisma.walletTransaction.findMany({ where: { walletId } });
    expect(txs).toHaveLength(creditAmounts.length);
  });

  it('4. should reject debit when funds are insufficient and leave balance unchanged', async () => {
    // Current balance is 0, attempt to debit 1000
    await expect(
      debitWalletAtomic({
        walletId,
        amount: 1000,
        referenceType: WalletReferenceType.PAYMENT,
        referenceId: `DEBIT_FAIL_${Date.now()}`,
        description: 'Test Overdraft',
      })
    ).rejects.toThrow(/insufficient/i);

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    expect(Number(wallet?.balance)).toBe(0);

    const txs = await prisma.walletTransaction.findMany({ where: { walletId } });
    expect(txs).toHaveLength(0);
  });

  it('5. should atomically debit wallet when balance is sufficient', async () => {
    // First credit 10,000
    await creditWalletAtomic({
      walletId,
      amount: 10000,
      referenceType: WalletReferenceType.TOPUP,
      referenceId: `INITIAL_CREDIT_${Date.now()}`,
      description: 'Initial Topup',
    });

    // Debit 3,500
    const debitTx = await debitWalletAtomic({
      walletId,
      amount: 3500,
      referenceType: WalletReferenceType.PAYMENT,
      referenceId: `DEBIT_SUCCESS_${Date.now()}`,
      description: 'Appointment Payment',
    });

    expect(debitTx).toBeDefined();
    expect(Number(debitTx.amount)).toBe(3500);
    expect(Number(debitTx.balanceAfter)).toBe(6500);
    expect(debitTx.type).toBe(WalletTransactionType.DEBIT);

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    expect(Number(wallet?.balance)).toBe(6500);
  });

  it('6. should ensure idempotency and prevent duplicate credits on replayed webhook references', async () => {
    const ref = `IDEMPOTENT_REF_${Date.now()}`;
    const amount = 2500;

    // First call
    const firstTx = await creditWalletAtomic({
      walletId,
      amount,
      referenceType: WalletReferenceType.TOPUP,
      referenceId: ref,
      description: 'First Webhook Event',
    });
    expect(Number(firstTx.amount)).toBe(amount);

    // Duplicate call with exact same reference
    const secondTx = await creditWalletAtomic({
      walletId,
      amount,
      referenceType: WalletReferenceType.TOPUP,
      referenceId: ref,
      description: 'Replayed Webhook Event',
    });

    // Should return the original transaction without double-crediting
    expect(secondTx.id).toBe(firstTx.id);

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    expect(Number(wallet?.balance)).toBe(amount); // Still 2500, not 5000!

    const txs = await prisma.walletTransaction.findMany({ where: { walletId } });
    expect(txs).toHaveLength(1);
  });
});
