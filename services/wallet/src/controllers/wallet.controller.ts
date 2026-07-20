import { Request, Response, NextFunction } from 'express';
import { prisma, WalletTransactionType, WalletReferenceType } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, AppError, UnauthorizedError, NotFoundError } from '@ricton/shared';
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

    // Calculate balance
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
    });

    const balance = transactions.reduce((acc, tx) => {
      if (tx.type === WalletTransactionType.CREDIT) return acc + Number(tx.amount);
      if (tx.type === WalletTransactionType.DEBIT) return acc - Number(tx.amount);
      return acc;
    }, 0);

    res.status(200).json(
      successResponse({
        ...wallet,
        balance,
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

    if (event.event === 'charge.success' && event.data.channel === 'dedicated_nuban') {
      const customerEmail = event.data.customer.email;
      const amountInNaira = event.data.amount / 100;

      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
        include: { wallet: true },
      });

      if (user && user.wallet) {
        // Find current balance to save snapshot
        const transactions = await prisma.walletTransaction.findMany({
          where: { walletId: user.wallet.id },
        });
        const currentBalance = transactions.reduce((acc, tx) => {
          if (tx.type === WalletTransactionType.CREDIT) return acc + Number(tx.amount);
          if (tx.type === WalletTransactionType.DEBIT) return acc - Number(tx.amount);
          return acc;
        }, 0);

        // Prevent duplicate webhooks by checking reference
        const existingTx = await prisma.walletTransaction.findFirst({
          where: {
            referenceId: event.data.reference,
          },
        });

        if (!existingTx) {
          await prisma.walletTransaction.create({
            data: {
              walletId: user.wallet.id,
              type: WalletTransactionType.CREDIT,
              amount: amountInNaira,
              balanceAfter: currentBalance + amountInNaira,
              description: 'Wallet top-up via Bank Transfer',
              referenceType: WalletReferenceType.TOPUP,
              referenceId: event.data.reference,
            },
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};
