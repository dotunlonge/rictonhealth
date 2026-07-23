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
} from '@ricton/shared';
import crypto from 'crypto';

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
    return 19.99;
  } else if (type === PaymentType.WALLET_TOPUP) {
    if (!amount) throw new ValidationError('amount is required for WALLET_TOPUP payments');
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

    const paystackRes = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
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
    });

    const data = (await paystackRes.json()) as PaystackInitializeResponse;
    if (!paystackRes.ok || !data.status) {
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
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const { reference } = req.params;
    if (!reference) {
      throw new ValidationError('Reference is required');
    }

    const paystackRes = await fetch(`${PAYSTACK_API_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = (await paystackRes.json()) as PaystackVerifyResponse;
    if (!paystackRes.ok || !data.status) {
      throw new AppError(
        `Paystack verification failed: ${data.message || 'Unknown error'}`,
        400,
        'PAYSTACK_ERROR'
      );
    }

    const paystackStatus = data.data.status;
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

    if (paystackStatus === 'success') {
      paymentStatus = PaymentStatus.SUCCESS;
    } else if (paystackStatus === 'failed' || paystackStatus === 'abandoned') {
      paymentStatus = PaymentStatus.FAILED;
    }

    const updatedPayment = await prisma.payment.update({
      where: { providerReference: reference },
      data: {
        status: paymentStatus,
        providerTxId: data.data.id?.toString(),
        metadata: data.data as Prisma.InputJsonValue, // store response JSON
      },
    });

    res.status(200).json(successResponse(updatedPayment));
  } catch (error) {
    next(error);
  }
};

export const paystackWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      throw new UnauthorizedError('Invalid signature');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;

      await prisma.payment.update({
        where: { providerReference: reference },
        data: {
          status: PaymentStatus.SUCCESS,
          providerTxId: event.data.id?.toString(),
          metadata: event.data as Prisma.InputJsonValue,
        },
      });

      // Notify other services via internal event
      // In a real system, this would publish to Redis pub/sub or a message queue
      // For now, we rely on the client polling or the service-specific webhooks
    } else if (event.event === 'charge.failed' || event.event === 'charge.abandoned') {
      const reference = event.data.reference;

      await prisma.payment.update({
        where: { providerReference: reference },
        data: {
          status: PaymentStatus.FAILED,
          providerTxId: event.data.id?.toString(),
          metadata: event.data as Prisma.InputJsonValue,
        },
      });
    }

    // Acknowledge receipt of webhook
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

    const payments = await prisma.payment.findMany({
      where: { userId: userPayload.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(successResponse(payments));
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
};
