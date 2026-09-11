import { Request, Response, NextFunction } from 'express';
import { prisma, Prisma, WalletTransactionType, WalletReferenceType } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  AppError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@ricton/shared';
import crypto from 'crypto';

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

    const where: any = {
      walletId: wallet.id,
      ...(type && { type: String(type) as WalletTransactionType }),
    };

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    res.status(200).json(
      successResponse({
        transactions,
        total,
        limit: Number(limit),
        offset: Number(offset),
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
        reference: `WALLET_TOPUP_${userId}_${Date.now()}`,
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

    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      throw new UnauthorizedError('Invalid signature');
    }

    const event = req.body;

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
      const amountInNaira = event.data.amount / 100;

      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
        include: { wallet: true },
      });

      if (user && user.wallet) {
        await creditWalletAtomic({
          walletId: user.wallet.id,
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
        const amountInNaira = event.data.amount / 100;

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

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};
