import { Request, Response, NextFunction } from 'express';
import { prisma, WalletTransactionType, WalletReferenceType, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  AppError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  timingSafeEqual,
  paystackBreaker,
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
        },
        include: { transactions: true },
      });
    }

    // Calculate balance using aggregation
    const [creditSum, debitSum] = await Promise.all([
      prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: WalletTransactionType.CREDIT },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: WalletTransactionType.DEBIT },
        _sum: { amount: true },
      }),
    ]);

    const balance = Number(creditSum._sum.amount || 0) - Number(debitSum._sum.amount || 0);

    res.status(200).json(
      successResponse({
        ...wallet,
        balance,
      })
    );
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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

    // Initialize Paystack payment
    const initializeRes = await paystackBreaker.fire(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100), // Convert to kobo
        reference: `WALLET_TOPUP_${userId}_${Date.now()}`,
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
  } catch (error: unknown) {
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

    const customerRes = await paystackBreaker.fire(`${PAYSTACK_API_URL}/customer`, {
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
    const dvaRes = await paystackBreaker.fire(`${PAYSTACK_API_URL}/dedicated_account`, {
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
  } catch (error: unknown) {
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
    if (!timingSafeEqual(hash, req.headers['x-paystack-signature'] as string)) {
      throw new UnauthorizedError('Invalid signature');
    }

    const event = req.body;

    if (event.event === 'charge.success' && event.data.channel === 'dedicated_nuban') {
      const customerEmail = event.data.customer.email;
      const amountInNaira = event.data.amount / 100;

      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
        include: { wallet: true },
      });

      if (user && user.wallet) {
        const walletId = user.wallet.id;
        await prisma.$transaction(
          async (tx) => {
            // Prevent duplicate webhooks by checking reference inside transaction
            const existingTx = await tx.walletTransaction.findFirst({
              where: {
                referenceId: event.data.reference,
              },
            });

            if (!existingTx) {
              // Find current balance inside transaction to prevent dirty reads
              const [creditSum, debitSum] = await Promise.all([
                tx.walletTransaction.aggregate({
                  where: { walletId, type: WalletTransactionType.CREDIT },
                  _sum: { amount: true },
                }),
                tx.walletTransaction.aggregate({
                  where: { walletId, type: WalletTransactionType.DEBIT },
                  _sum: { amount: true },
                }),
              ]);
              const currentBalance =
                Number(creditSum._sum.amount || 0) - Number(debitSum._sum.amount || 0);

              await tx.walletTransaction.create({
                data: {
                  walletId,
                  type: WalletTransactionType.CREDIT,
                  amount: amountInNaira,
                  balanceAfter: currentBalance + amountInNaira,
                  description: 'Wallet top-up via Bank Transfer',
                  referenceType: WalletReferenceType.TOPUP,
                  referenceId: event.data.reference,
                },
              });
            }
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        );
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

        // Create wallet if it doesn't exist (user might have topped up before creating wallet)
        let wallet = user?.wallet;
        if (!wallet && user) {
          wallet = await prisma.wallet.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          });
        }

        if (user && wallet) {
          const targetWalletId = wallet.id;
          try {
            await prisma.$transaction(
              async (tx) => {
                const existingTx = await tx.walletTransaction.findFirst({
                  where: {
                    referenceId: event.data.reference,
                    referenceType: WalletReferenceType.TOPUP,
                  },
                });

                if (!existingTx) {
                  const [creditSum, debitSum] = await Promise.all([
                    tx.walletTransaction.aggregate({
                      where: { walletId: targetWalletId, type: WalletTransactionType.CREDIT },
                      _sum: { amount: true },
                    }),
                    tx.walletTransaction.aggregate({
                      where: { walletId: targetWalletId, type: WalletTransactionType.DEBIT },
                      _sum: { amount: true },
                    }),
                  ]);
                  const currentBalance =
                    Number(creditSum._sum.amount || 0) - Number(debitSum._sum.amount || 0);

                  await tx.walletTransaction.create({
                    data: {
                      walletId: targetWalletId,
                      type: WalletTransactionType.CREDIT,
                      amount: amountInNaira,
                      balanceAfter: currentBalance + amountInNaira,
                      description: 'Wallet top-up via Card/Bank Transfer',
                      referenceType: WalletReferenceType.TOPUP,
                      referenceId: event.data.reference,
                    },
                  });
                }
              },
              {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
              }
            );
          } catch (createError: unknown) {
            const err = createError as { code?: string };
            if (err.code !== 'P2002') {
              throw createError;
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error: unknown) {
    next(error);
  }
};
