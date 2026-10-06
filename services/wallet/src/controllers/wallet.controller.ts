import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma, Prisma, WalletTransactionType, WalletReferenceType } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  AppError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  getRawBodyString,
  parseWebhookBody,
  verifyPaystackSignature,
} from '@ricton/shared';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

interface PaystackCustomerResponse {
  status: boolean;
  message: string;
  data: {
    customer_code: string;
  };
}

interface PaystackDvaResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    bank: {
      name: string;
    };
  };
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackResolveResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
  };
}

interface PaystackRecipientResponse {
  status: boolean;
  message: string;
  data: {
    recipient_code: string;
  };
}

interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    transfer_code: string;
    status: string;
  };
}

export interface AtomicWalletOperationOptions {
  walletId: string;
  amount: number;
  referenceType: WalletReferenceType;
  referenceId?: string;
  description: string;
}

export async function creditWalletAtomic(opts: AtomicWalletOperationOptions) {
  const { walletId, amount, referenceType, referenceId, description } = opts;

  return prisma.$transaction(
    async (tx) => {
      // Fast-path idempotency check; the @@unique([walletId, referenceId])
      // constraint below is the real race guard.
      // D4: NULL referenceIds bypass the DB unique guard (Postgres NULL
      // semantics) — callers needing idempotency MUST pass a referenceId
      // (e.g. webhook `reference`); NULL rows are non-idempotent by design.
      if (referenceId) {
        const existing = await tx.walletTransaction.findFirst({
          where: { walletId, referenceId },
        });
        if (existing) {
          return existing;
        }
      }

      // Claim the transaction record first if referenceId is provided to ensure
      // that concurrent or replayed requests with the same referenceId cannot
      // mutate the balance before uniqueness is established.
      let txRecord: any;
      if (referenceId) {
        try {
          txRecord = await tx.walletTransaction.create({
            data: {
              walletId,
              type: WalletTransactionType.CREDIT,
              amount,
              balanceAfter: 0,
              referenceType,
              referenceId,
              description,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            const raced = await tx.walletTransaction.findFirst({
              where: { walletId, referenceId },
            });
            if (raced) return raced;
          }
          throw err;
        }
      }

      const updatedWallet = await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: { increment: amount },
        },
      });

      if (txRecord) {
        return await tx.walletTransaction.update({
          where: { id: txRecord.id },
          data: {
            balanceAfter: updatedWallet.balance,
          },
        });
      }

      return await tx.walletTransaction.create({
        data: {
          walletId,
          type: WalletTransactionType.CREDIT,
          amount,
          balanceAfter: updatedWallet.balance,
          referenceType,
          referenceId,
          description,
        },
      });
    },
    { timeout: 30000, maxWait: 15000 }
  );
}

export async function debitWalletAtomic(opts: AtomicWalletOperationOptions) {
  const { walletId, amount, referenceType, referenceId, description } = opts;

  return prisma.$transaction(
    async (tx) => {
      // Fast-path idempotency check
      if (referenceId) {
        const existing = await tx.walletTransaction.findFirst({
          where: { walletId, referenceId },
        });
        if (existing) {
          return existing;
        }
      }

      // Claim transaction record first if referenceId is provided
      let txRecord: any;
      if (referenceId) {
        try {
          txRecord = await tx.walletTransaction.create({
            data: {
              walletId,
              type: WalletTransactionType.DEBIT,
              amount,
              balanceAfter: 0,
              referenceType,
              referenceId,
              description,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            const raced = await tx.walletTransaction.findFirst({
              where: { walletId, referenceId },
            });
            if (raced) return raced;
          }
          throw err;
        }
      }

      // Conditional decrement: the balance floor is enforced by the database,
      // so concurrent debits cannot overdraft.
      const decremented = await tx.wallet.updateMany({
        where: { id: walletId, balance: { gte: amount } },
        data: {
          balance: { decrement: amount },
        },
      });

      if (decremented.count === 0) {
        const currentWallet = await tx.wallet.findUnique({
          where: { id: walletId },
          select: { id: true, balance: true },
        });
        if (!currentWallet) {
          throw new NotFoundError('Wallet not found');
        }
        throw new ValidationError('Insufficient wallet balance');
      }

      const updatedWallet = await tx.wallet.findUniqueOrThrow({
        where: { id: walletId },
        select: { balance: true },
      });

      if (txRecord) {
        return await tx.walletTransaction.update({
          where: { id: txRecord.id },
          data: {
            balanceAfter: updatedWallet.balance,
          },
        });
      }

      return await tx.walletTransaction.create({
        data: {
          walletId,
          type: WalletTransactionType.DEBIT,
          amount,
          balanceAfter: updatedWallet.balance,
          referenceType,
          referenceId,
          description,
        },
      });
    },
    { timeout: 30000, maxWait: 15000 }
  );
}

export const getMyWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          currency: 'NGN',
          balance: 0,
        },
        include: { transactions: true },
      });
    }

    res.status(200).json(
      successResponse({
        ...wallet,
        balance: Number(wallet.balance),
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    const { type, limit = 20, offset = 0 } = req.query;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = Math.max(Number(offset) || 0, 0);

    const where: any = {
      walletId: wallet.id,
      ...(type && { type: String(type) as WalletTransactionType }),
    };

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    res.status(200).json(
      successResponse({
        transactions,
        total,
        limit: take,
        offset: skip,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const topupWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY)
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');

    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount < 100) {
      throw new ValidationError('Amount must be at least 100 NGN');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        providerProfile: true,
        pharmacyProfile: true,
        wallet: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');

    const profile = user.patientProfile || user.providerProfile || user.pharmacyProfile;
    const firstName = profile && 'firstName' in profile ? profile.firstName : 'Ricton';
    const lastName = profile && 'lastName' in profile ? profile.lastName : 'User';

    // Without an explicit callback_url Paystack leaves the payer stranded on
    // its success screen. Point top-ups back at the verify page, which
    // force-reconciles with Paystack (webhooks can't reach local dev, and
    // may lag in prod). Paystack appends ?trxref=&reference= itself.
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payments/verify`;

    // Initialize Paystack payment
    const initializeRes = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100), // Convert to kobo
        currency: 'NGN',
        reference: `WALLET_TOPUP_${userId}_${Date.now()}`,
        callback_url: callbackUrl,
        first_name: firstName,
        last_name: lastName,
        metadata: {
          custom_fields: [
            {
              display_name: 'Purpose',
              variable_name: 'purpose',
              value: 'wallet_topup',
            },
          ],
        },
      }),
    });

    const initializeData = (await initializeRes.json()) as PaystackInitializeResponse;
    if (!initializeRes.ok || !initializeData.status) {
      throw new AppError(
        `Paystack initialization failed: ${initializeData.message}`,
        400,
        'PAYSTACK_ERROR'
      );
    }

    await prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'NGN',
        type: 'WALLET_TOPUP',
        provider: 'PAYSTACK',
        providerReference: initializeData.data.reference,
        status: 'PENDING',
      },
    });

    res.status(200).json(
      successResponse({
        authorizationUrl: initializeData.data.authorization_url,
        reference: initializeData.data.reference,
        amount,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Withdraw wallet funds to a verified bank account (Paystack transfer).
 *
 * Money-safety order: validate → verify holder → debit atomically →
 * initiate provider transfer. The debit happens BEFORE the provider call so
 * a lost race can never pay out unbacked money; if the provider then
 * rejects, the debit is reversed with a distinct `${reference}:reversal`
 * idempotency key (the [walletId, referenceId] namespace is shared across
 * credits and debits, so reversals must not reuse the debit reference).
 * transfer.failed / transfer.reversed webhooks refund the same way.
 */
export const withdrawToBank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY)
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');

    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { amount, bankCode, accountNumber, accountName: claimedAccountName } = req.body;

    if (!amount || typeof amount !== 'number' || amount < 100) {
      throw new ValidationError('Amount must be at least 100 NGN');
    }
    // #30 Withdraw gates: cap single payout and enforce NUBAN format so a
    // typo'd destination can never reach the provider transfer call.
    if (amount > 500000) {
      throw new ValidationError('Withdrawal amount must not exceed ₦500,000 per transaction');
    }
    if (!bankCode || typeof bankCode !== 'string' || !accountNumber) {
      throw new ValidationError('bankCode and accountNumber are required');
    }
    if (!/^[0-9]{10}$/.test(String(accountNumber))) {
      throw new ValidationError('accountNumber must be a 10-digit NUBAN');
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundError('Wallet not found');
    if (Number(wallet.balance) < amount) {
      throw new ValidationError('Insufficient wallet balance');
    }

    // 1. Transfer recipient first: Paystack resolves the account itself, so a
    // successful recipient creation IS the existence check (this also works
    // in test mode, where standalone bank/resolve only serves test codes).
    const recipientRes = await fetch(`${PAYSTACK_API_URL}/transferrecipient`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: 'Ricton wallet holder',
        account_number: String(accountNumber),
        bank_code: String(bankCode),
        currency: 'NGN',
      }),
    });
    const recipientData = (await recipientRes.json()) as PaystackRecipientResponse;
    if (!recipientRes.ok || !recipientData.status) {
      throw new AppError(
        `Destination account could not be verified: ${recipientData.message}`,
        400,
        'PAYSTACK_ERROR'
      );
    }

    // 2. Blocking bank/resolve gate: the destination holder name must be
    // resolved before any money moves. The only fallback is a masked
    // placeholder when the provider key is missing in non-prod (local dev
    // without Paystack); every other resolve failure/mismatch blocks.
    const keyMissing =
      !PAYSTACK_SECRET_KEY || (PAYSTACK_SECRET_KEY as string).includes('replace_me');
    let accountName: string;
    if (keyMissing && process.env.NODE_ENV !== 'production') {
      accountName = `Account ${String(accountNumber).slice(-4).padStart(10, '•')}`;
    } else {
      let verifyRes: { ok: boolean };
      let verifyData: PaystackResolveResponse;
      try {
        const res = await fetch(
          `${PAYSTACK_API_URL}/bank/resolve?account_number=${encodeURIComponent(String(accountNumber))}&bank_code=${encodeURIComponent(String(bankCode))}`,
          { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
        );
        verifyRes = res as unknown as { ok: boolean };
        verifyData = (await res.json()) as PaystackResolveResponse;
      } catch {
        throw new ValidationError('Destination account could not be verified');
      }
      if (!verifyRes.ok || !verifyData.status || !verifyData.data?.account_name) {
        throw new ValidationError(
          `Destination account could not be verified: ${verifyData.message || 'bank resolve failed'}`
        );
      }
      accountName = verifyData.data.account_name;
      if (claimedAccountName && typeof claimedAccountName === 'string') {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const resolved = norm(accountName);
        const claimed = norm(claimedAccountName);
        if (!resolved.includes(claimed) && !claimed.includes(resolved)) {
          throw new ValidationError('Account name does not match the resolved bank account');
        }
      }
    }

    // #30 Unpredictable idempotency reference: crypto UUID (not userId+Date.now,
    // which is enumerable and lets an attacker pre-claim debit reference keys).
    const reference = `WALLET_WITHDRAW_${crypto.randomUUID()}`;

    // 3. Debit first (atomic, conditional on sufficient balance).
    await debitWalletAtomic({
      walletId: wallet.id,
      amount,
      referenceType: WalletReferenceType.PAYOUT,
      referenceId: reference,
      description: `Withdrawal to ${accountName} (${bankCode})`,
    });

    // 4. Initiate the provider transfer; reverse on provider rejection.
    try {
      const transferRes = await fetch(`${PAYSTACK_API_URL}/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(amount * 100),
          recipient: recipientData.data.recipient_code,
          reference,
          reason: `Ricton wallet withdrawal for ${userId}`,
        }),
      });
      const transferData = (await transferRes.json()) as PaystackTransferResponse;
      if (!transferRes.ok || !transferData.status) {
        throw new AppError(
          `Transfer initiation failed: ${transferData.message}`,
          400,
          'PAYSTACK_ERROR'
        );
      }

      res.status(200).json(
        successResponse({
          reference,
          amount,
          accountName,
          bankCode: String(bankCode),
          transferCode: transferData.data.transfer_code,
          transferStatus: transferData.data.status,
        })
      );
    } catch (transferError) {
      await creditWalletAtomic({
        walletId: wallet.id,
        amount,
        referenceType: WalletReferenceType.REFUND,
        referenceId: `${reference}:reversal`,
        description: 'Withdrawal reversal (provider rejected transfer)',
      });
      throw transferError;
    }
  } catch (error) {
    next(error);
  }
};

export const createVirtualAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY)
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');

    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        providerProfile: true,
        pharmacyProfile: true,
        wallet: true,
      },
    });

    if (!user) throw new NotFoundError('User not found');

    if (user.wallet?.virtualAccountNumber) {
      return res.status(200).json(successResponse(user.wallet));
    }

    // 1. Create Paystack Customer
    const profile = user.patientProfile || user.providerProfile || user.pharmacyProfile;
    const firstName = profile && 'firstName' in profile ? profile.firstName : 'Ricton';
    const lastName = profile && 'lastName' in profile ? profile.lastName : 'User';

    const customerRes = await fetch(`${PAYSTACK_API_URL}/customer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        phone: user.phone,
      }),
    });

    const customerData = (await customerRes.json()) as PaystackCustomerResponse;
    if (!customerRes.ok || !customerData.status) {
      throw new AppError(
        `Paystack customer creation failed: ${customerData.message}`,
        400,
        'PAYSTACK_ERROR'
      );
    }

    const customerCode = customerData.data.customer_code;

    // 2. Create Dedicated Virtual Account
    const dvaRes = await fetch(`${PAYSTACK_API_URL}/dedicated_account`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: customerCode,
        preferred_bank: process.env.PAYSTACK_PREFERRED_BANK || 'wema-bank',
      }),
    });

    const dvaData = (await dvaRes.json()) as PaystackDvaResponse;
    if (!dvaRes.ok || !dvaData.status) {
      throw new AppError(`Paystack DVA creation failed: ${dvaData.message}`, 400, 'PAYSTACK_ERROR');
    }

    const accountNumber = dvaData.data.account_number;
    const bankName = dvaData.data.bank.name;

    // 3. Update Wallet
    const wallet = await prisma.wallet.upsert({
      where: { userId },
      create: {
        userId,
        virtualAccountNumber: accountNumber,
        virtualBankName: bankName,
      },
      update: {
        virtualAccountNumber: accountNumber,
        virtualBankName: bankName,
      },
    });

    res.status(200).json(successResponse(wallet));
  } catch (error) {
    next(error);
  }
};

export const paystackWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY)
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');

    const rawBody = getRawBodyString(req.body);
    if (
      !verifyPaystackSignature(rawBody, req.headers['x-paystack-signature'], PAYSTACK_SECRET_KEY)
    ) {
      throw new UnauthorizedError('Invalid signature');
    }

    const event = parseWebhookBody<any>(req.body);

    if (event.event === 'charge.success') {
      // Reconcile provider payload before crediting: reject non-NGN, missing
      // references, or non-positive amounts instead of trusting them blindly.
      const currency = event.data?.currency;
      if (currency && currency !== 'NGN') {
        throw new ValidationError(`Unsupported webhook currency: ${currency}`);
      }
      if (!event.data?.reference || typeof event.data?.amount !== 'number') {
        throw new ValidationError('Webhook payload missing reference or amount');
      }
      if (event.data.amount <= 0) {
        throw new ValidationError('Webhook amount must be positive');
      }
    }

    if (event.event === 'charge.success' && event.data.channel === 'dedicated_nuban') {
      const customerEmail = event.data.customer.email;
      // #26 Single atomic credit path: kobo→NGN via Math.round (no float drift),
      // reference-keyed creditWalletAtomic (concurrent/replayed webhooks collapse).
      const amountInNaira = Math.round(event.data.amount / 100);

      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
        include: { wallet: true },
      });

      // #26 Never silently drop money: create the wallet when missing instead of 200-ok.
      let nubanWallet = user?.wallet;
      if (!nubanWallet && user) {
        nubanWallet = await prisma.wallet.upsert({
          where: { userId: user.id },
          create: { userId: user.id, balance: 0 },
          update: {},
        });
      }

      if (user && nubanWallet) {
        await creditWalletAtomic({
          walletId: nubanWallet.id,
          amount: amountInNaira,
          referenceType: WalletReferenceType.TOPUP,
          referenceId: event.data.reference,
          description: 'Wallet top-up via Bank Transfer',
        });
      }
    }

    // Handle wallet top-up payment completion
    if (event.event === 'charge.success' && event.data.metadata?.custom_fields) {
      const purpose = event.data.metadata.custom_fields.find(
        (f: any) => f.variable_name === 'purpose'
      )?.value;

      if (purpose === 'wallet_topup') {
        const customerEmail = event.data.customer.email;
        // #26 Reconcile in whole NGN (Math.round) so kobo remainders can't drift balance.
        const amountInNaira = Math.round(event.data.amount / 100);

        const user = await prisma.user.findUnique({
          where: { email: customerEmail },
          include: { wallet: true },
        });

        let wallet = user?.wallet;
        if (!wallet && user) {
          wallet = await prisma.wallet.upsert({
            where: { userId: user.id },
            create: { userId: user.id, balance: 0 },
            update: {},
          });
        }

        if (user && wallet) {
          await creditWalletAtomic({
            walletId: wallet.id,
            amount: amountInNaira,
            referenceType: WalletReferenceType.TOPUP,
            referenceId: event.data.reference,
            description: 'Wallet top-up via Card/Bank Transfer',
          });
        }
      }
    }

    // Transfer settlement: success needs no action (debited at initiation);
    // failed/reversed refund exactly once via the reversal reference key.
    if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
      const reference = event.data?.reference;
      if (reference && event.data?.amount > 0) {
        // Find the wallet that carries the original debit.
        const debit = await prisma.walletTransaction.findFirst({
          where: { referenceId: reference },
          select: { walletId: true },
        });
        if (debit) {
          const wallet = await prisma.wallet.findUnique({ where: { id: debit.walletId } });
          if (wallet) {
            await creditWalletAtomic({
              walletId: wallet.id,
              // #26 Reconcile provider kobo amount in whole NGN.
              amount: Math.round(event.data.amount / 100),
              referenceType: WalletReferenceType.REFUND,
              referenceId: `${reference}:reversal`,
              description: `Withdrawal reversal (${event.event})`,
            });
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};
