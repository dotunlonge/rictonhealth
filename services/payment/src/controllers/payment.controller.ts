import { Request, Response, NextFunction } from 'express';
import { prisma, PaymentStatus, PaymentProvider, PaymentType, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  AppError,
  paystackBreaker,
  getInternalApiSecret,
  getRawBodyString,
  parseWebhookBody,
  verifyPaystackSignature,
} from '@ricton/shared';
import { webhookQueue } from '@ricton/shared/jobs';
import { assertPaystackPaymentMatches } from '../payment-reconciliation';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    id: number;
    reference: string;
    amount?: number;
    currency?: string;
  };
}

const resolvePaymentAmount = async (
  type: PaymentType,
  userId: string,
  amount?: number,
  referenceId?: string
): Promise<number> => {
  if (type === PaymentType.APPOINTMENT) {
    if (!referenceId) throw new ValidationError('referenceId is required for APPOINTMENT payments');
    const appt = await prisma.appointment.findUnique({
      where: { id: referenceId },
      include: { provider: { include: { providerProfile: true } }, payment: true },
    });
    if (!appt) throw new NotFoundError('Appointment not found');
    if (appt.patientId !== userId) {
      throw new ForbiddenError('You are not authorized to pay for this appointment');
    }
    if (
      appt.payment &&
      (appt.payment.status === PaymentStatus.SUCCESS ||
        appt.payment.status === PaymentStatus.PENDING)
    ) {
      throw new ValidationError(
        `This appointment already has an active or pending payment (Status: ${appt.payment.status})`
      );
    }
    if (!appt.provider.providerProfile || !appt.provider.providerProfile.consultationFee) {
      throw new ValidationError('Doctor consultation fee is not configured');
    }
    return Number(appt.provider.providerProfile.consultationFee);
  } else if (type === PaymentType.PHARMACY_ORDER) {
    if (!referenceId)
      throw new ValidationError('referenceId is required for PHARMACY_ORDER payments');
    const order = await prisma.pharmacyOrder.findUnique({
      where: { id: referenceId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundError('Pharmacy order not found');
    if (order.patientId !== userId) {
      throw new ForbiddenError('You are not authorized to pay for this pharmacy order');
    }
    if (
      order.payment &&
      (order.payment.status === PaymentStatus.SUCCESS ||
        order.payment.status === PaymentStatus.PENDING)
    ) {
      throw new ValidationError(
        `This pharmacy order already has an active or pending payment (Status: ${order.payment.status})`
      );
    }
    return Number(order.totalAmount);
  } else if (type === PaymentType.SUBSCRIPTION) {
    return 5000;
  } else if (type === PaymentType.WALLET_TOPUP) {
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw new ValidationError('amount must be a positive number for WALLET_TOPUP payments');
    }
    return Number(amount);
  } else {
    return Number(amount);
  }
};

const createPendingPayment = async (
  userId: string,
  resolvedAmount: number,
  type: PaymentType,
  providerReference: string,
  referenceId?: string
) => {
  return prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        userId,
        amount: resolvedAmount, // Stored in NGN (recalculated server-side)
        currency: 'NGN',
        type,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.PAYSTACK,
        providerReference,
      },
    });

    if (type === PaymentType.APPOINTMENT && referenceId) {
      await tx.appointment.update({
        where: { id: referenceId },
        data: { paymentId: p.id },
      });
    } else if (type === PaymentType.PHARMACY_ORDER && referenceId) {
      await tx.pharmacyOrder.update({
        where: { id: referenceId },
        data: { paymentId: p.id },
      });
    }

    return p;
  });
};

export const initializePayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const userPayload = req.user as JwtPayload;
    const { amount, email, type, referenceId } = req.body;

    if (!email || !type) {
      throw new ValidationError('Email and type are required');
    }

    if (!Object.values(PaymentType).includes(type)) {
      throw new ValidationError(
        `Invalid payment type. Must be one of: ${Object.values(PaymentType).join(', ')}`
      );
    }

    const resolvedAmount = await resolvePaymentAmount(
      type,
      userPayload.userId,
      amount,
      referenceId
    );

    // Paystack expects amount in kobo
    const amountInKobo = Math.round(resolvedAmount * 100);

    // paystackBreaker resolves with the parsed JSON body (it throws on non-2xx).
    const data = (await paystackBreaker.fire(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        metadata: {
          custom_fields: [
            {
              display_name: 'Payment Type',
              variable_name: 'payment_type',
              value: type,
            },
            {
              display_name: 'User ID',
              variable_name: 'user_id',
              value: userPayload.userId,
            },
          ],
        },
      }),
    })) as PaystackInitializeResponse;
    if (!data.status) {
      throw new AppError(
        `Paystack initialization failed: ${data.message || 'Unknown error'}`,
        400,
        'PAYSTACK_ERROR'
      );
    }

    // Create a pending payment record and link it to the target resource atomically
    const payment = await createPendingPayment(
      userPayload.userId,
      resolvedAmount,
      type as PaymentType,
      data.data.reference,
      referenceId
    );

    res.status(200).json(
      successResponse({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
        paymentId: payment.id,
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const userPayload = req.user as JwtPayload;
    const { reference } = req.params;
    if (!reference) {
      throw new ValidationError('Reference is required');
    }

    const payment = await prisma.payment.findUnique({
      where: { providerReference: reference },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.userId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to verify this payment');
    }

    // paystackBreaker resolves with the parsed JSON body (it throws on non-2xx).
    const data = (await paystackBreaker.fire(
      `${PAYSTACK_API_URL}/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )) as PaystackVerifyResponse;
    if (!data.status) {
      throw new AppError(
        `Paystack verification failed: ${data.message || 'Unknown error'}`,
        400,
        'PAYSTACK_ERROR'
      );
    }

    const paystackStatus = data.data.status;
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

    if (paystackStatus === 'success') {
      assertPaystackPaymentMatches(payment, data.data);
      paymentStatus = PaymentStatus.SUCCESS;
    } else if (paystackStatus === 'failed' || paystackStatus === 'abandoned') {
      paymentStatus = PaymentStatus.FAILED;
    }

    const updatedPayment = await prisma.payment.update({
      where: { providerReference: reference },
      data: {
        status: paymentStatus,
        providerTxId: data.data.id?.toString(),
        metadata: data.data as Prisma.InputJsonValue,
      },
    });

    let currentBalance: number | undefined;
    if (paymentStatus === PaymentStatus.SUCCESS && payment.type === PaymentType.WALLET_TOPUP) {
      let wallet = await prisma.wallet.findUnique({ where: { userId: payment.userId } });
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId: payment.userId, balance: 0, currency: 'NGN' },
        });
      }
      const existingTx = await prisma.walletTransaction.findFirst({
        where: { walletId: wallet.id, referenceId: reference },
      });
      if (!existingTx) {
        await prisma.$transaction(async (tx) => {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: payment.amount } },
          });
          const fresh = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'CREDIT',
              amount: payment.amount,
              balanceAfter: fresh.balance,
              referenceType: 'TOPUP',
              referenceId: reference,
              description: 'Wallet top-up via Paystack verification',
            },
          });
          currentBalance = Number(fresh.balance);
        });
      } else {
        const fresh = await prisma.wallet.findUnique({ where: { id: wallet.id } });
        currentBalance = fresh ? Number(fresh.balance) : undefined;
      }
    }

    res.status(200).json(
      successResponse({
        ...updatedPayment,
        balance: currentBalance,
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const paystackWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const rawBody = getRawBodyString(req.body);
    if (
      !verifyPaystackSignature(rawBody, req.headers['x-paystack-signature'], PAYSTACK_SECRET_KEY)
    ) {
      throw new UnauthorizedError('Invalid signature');
    }

    const event = parseWebhookBody<{ event: string; data: any }>(req.body);

    if (event.event === 'charge.success') {
      const reference = event.data.reference;

      const payment = await prisma.payment.findUnique({
        where: { providerReference: reference },
      });

      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.status === PaymentStatus.SUCCESS) {
        return res.sendStatus(200);
      }

      assertPaystackPaymentMatches(payment, event.data);

      const updatedPayment = await prisma.payment.update({
        where: { providerReference: reference },
        data: {
          status: PaymentStatus.SUCCESS,
          providerTxId: event.data.id?.toString(),
          metadata: event.data as Prisma.InputJsonValue,
        },
      });

      if (payment.type === PaymentType.WALLET_TOPUP) {
        let wallet = await prisma.wallet.findUnique({ where: { userId: payment.userId } });
        if (!wallet) {
          wallet = await prisma.wallet.create({
            data: { userId: payment.userId, balance: 0, currency: 'NGN' },
          });
        }
        const existingTx = await prisma.walletTransaction.findFirst({
          where: { walletId: wallet.id, referenceId: reference },
        });
        if (!existingTx) {
          await prisma.$transaction(async (tx) => {
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: payment.amount } },
            });
            const fresh = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'CREDIT',
                amount: payment.amount,
                balanceAfter: fresh.balance,
                referenceType: 'TOPUP',
                referenceId: reference,
                description: 'Wallet top-up via Paystack webhook',
              },
            });
          });
        }
      }

      await webhookQueue.add('deliver', {
        url: `${process.env.INTERNAL_NOTIFICATION_URL || 'http://notification-service:3016'}/api/internal/payment/success`,
        payload: {
          paymentId: updatedPayment.id,
          userId: updatedPayment.userId,
          reference,
          amount: updatedPayment.amount,
          type: updatedPayment.type,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': getInternalApiSecret(),
        },
      });
    } else if (event.event === 'charge.failed' || event.event === 'charge.abandoned') {
      const reference = event.data.reference;

      const payment = await prisma.payment.findUnique({
        where: { providerReference: reference },
      });

      if (!payment) {
        throw new NotFoundError('Payment not found');
      }

      if (payment.status === PaymentStatus.FAILED) {
        return res.sendStatus(200);
      }

      const updatedPayment = await prisma.payment.update({
        where: { providerReference: reference },
        data: {
          status: PaymentStatus.FAILED,
          providerTxId: event.data.id?.toString(),
          metadata: event.data as Prisma.InputJsonValue,
        },
      });

      await webhookQueue.add('deliver', {
        url: `${process.env.INTERNAL_NOTIFICATION_URL || 'http://notification-service:3016'}/api/internal/payment/failed`,
        payload: {
          paymentId: updatedPayment.id,
          userId: updatedPayment.userId,
          reference,
          amount: updatedPayment.amount,
          type: updatedPayment.type,
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': getInternalApiSecret(),
        },
      });
    }

    // Acknowledge receipt of webhook
    res.sendStatus(200);
  } catch (error: unknown) {
    next(error);
  }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = Math.max(Number(req.query.offset) || 0, 0);

    const payments = await prisma.payment.findMany({
      where: { userId: userPayload.userId },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    res.status(200).json(successResponse(payments));
  } catch (error: unknown) {
    next(error);
  }
};

export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.userId !== userPayload.userId) {
      throw new UnauthorizedError('You are not authorized to view this payment');
    }

    res.status(200).json(successResponse(payment));
  } catch (error: unknown) {
    next(error);
  }
};

export const getBanks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fallbackBanks = [
      { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
      { name: 'Access Bank Plc', code: '044' },
      { name: 'Zenith Bank Plc', code: '057' },
      { name: 'First Bank of Nigeria', code: '011' },
      { name: 'United Bank for Africa (UBA)', code: '033' },
      { name: 'Kuda Microfinance Bank', code: '50211' },
      { name: 'Moniepoint MFB', code: '50515' },
      { name: 'OPay Digital Services', code: '999992' },
      { name: 'Stanbic IBTC Bank', code: '221' },
      { name: 'Fidelity Bank', code: '070' },
      { name: 'Sterling Bank', code: '232' },
      { name: 'Wema Bank', code: '035' },
    ];

    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('replace_me')) {
      return res.status(200).json(successResponse({ banks: fallbackBanks }));
    }

    try {
      const response = await fetch(`${PAYSTACK_API_URL}/bank?country=nigeria`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      });
      const data = (await response.json()) as any;
      if (data.status && Array.isArray(data.data)) {
        const banks = data.data.map((b: any) => ({ name: b.name, code: b.code }));
        return res.status(200).json(successResponse({ banks }));
      }
    } catch {
      // Fallback
    }

    res.status(200).json(successResponse({ banks: fallbackBanks }));
  } catch (error) {
    next(error);
  }
};

export const resolveAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountNumber, bankCode } = req.query;
    if (!accountNumber || !bankCode) {
      throw new ValidationError('accountNumber and bankCode are required');
    }

    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes('replace_me')) {
      return res.status(200).json(
        successResponse({
          accountNumber: String(accountNumber),
          accountName: 'VERIFIED ACCOUNT HOLDER',
          bankCode: String(bankCode),
        })
      );
    }

    const response = await fetch(
      `${PAYSTACK_API_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );
    const data = (await response.json()) as any;

    if (!data.status) {
      throw new ValidationError(data.message || 'Could not resolve bank account name');
    }

    res.status(200).json(
      successResponse({
        accountNumber: data.data.account_number,
        accountName: data.data.account_name,
        bankCode: String(bankCode),
      })
    );
  } catch (error) {
    next(error);
  }
};
