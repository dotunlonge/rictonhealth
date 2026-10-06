import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  prisma,
  PaymentStatus,
  PaymentProvider,
  PaymentType,
  AppointmentStatus,
  WalletTransactionType,
  WalletReferenceType,
  Prisma,
} from '@ricton/db';
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

// #31 Single source of truth for subscription price (NGN). Client amounts are
// never trusted: SUBSCRIPTION resolves server-side to this const and the
// shared 500–500000 resolvedAmount guard clamps it below.
const SUBSCRIPTION_PRICE_NGN = 5000;

// #34 Best-effort duplicate webhook delivery guard (module-level, in-memory).
// Paystack retries deliveries; the SUCCESS-status guard below is the durable
// idempotency, but a repeated event.id should short-circuit to 200 without
// re-entering reconciliation. Capped at 1000 entries to bound memory; restarts
// simply lose the cache (safe: DB guards still hold).
const processedWebhookEventIds = new Set<string>();
function isDuplicateWebhookEvent(eventId: unknown): boolean {
  if (eventId === undefined || eventId === null || eventId === '') return false;
  const key = String(eventId);
  if (processedWebhookEventIds.has(key)) return true;
  processedWebhookEventIds.add(key);
  if (processedWebhookEventIds.size > 1000) {
    const oldest = processedWebhookEventIds.values().next().value;
    if (oldest !== undefined) processedWebhookEventIds.delete(oldest);
  }
  return false;
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
    if (appt.payment?.status === PaymentStatus.SUCCESS) {
      throw new ValidationError('This appointment has already been paid');
    }
    if (
      appt.payment?.status === PaymentStatus.PENDING &&
      appt.payment.createdAt.getTime() > Date.now() - 30 * 60 * 1000
    ) {
      throw new ValidationError('A payment checkout is already active; retry after it expires');
    }
    if (appt.feeSnapshot == null || Number(appt.feeSnapshot) < 500) {
      throw new ValidationError('Doctor consultation fee is not configured');
    }
    return Number(appt.feeSnapshot);
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
    // #31 Server-resolved total: Math.round guard + shared 500–500000 clamp below.
    return Math.round(Number(order.totalAmount));
  } else if (type === PaymentType.SUBSCRIPTION) {
    return SUBSCRIPTION_PRICE_NGN;
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
    const { amount, type, referenceId, email: requestedEmail } = req.body;
    const account = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: { email: true },
    });
    const email = account?.email;

    if (!email || !requestedEmail || !type) {
      throw new ValidationError('A verified account email and payment type are required');
    }

    if (requestedEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      throw new ValidationError('Payment email must match the verified account email');
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

    if (!Number.isInteger(resolvedAmount) || resolvedAmount < 500 || resolvedAmount > 500000) {
      throw new ValidationError(
        'Payment amount must be a valid NGN amount between ₦500 and ₦500,000'
      );
    }
    // Paystack expects amount in kobo
    const amountInKobo = Math.round(resolvedAmount * 100);

    // Without an explicit callback_url Paystack leaves the payer stranded on
    // its success screen. Point every checkout back at the verify page,
    // which force-reconciles with Paystack (webhooks can't reach local dev,
    // and may lag in prod). Paystack appends ?trxref=&reference= itself.
    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payments/verify`;

    // #27 DB-before-Paystack: create the PENDING row FIRST with a provisional
    // reference so a DB failure can never orphan a paid Paystack checkout URL
    // (verify looks up by providerReference, so a provisional ref never verifies).
    // Route-level idempotency replays the response, so retries can't double-create.
    const provisionalReference = `tmp_${crypto.randomUUID()}`;
    const payment = await createPendingPayment(
      userPayload.userId,
      resolvedAmount,
      type as PaymentType,
      provisionalReference,
      referenceId
    );

    // paystackBreaker resolves with the parsed JSON body (it throws on non-2xx).
    let data: PaystackInitializeResponse;
    try {
      data = (await paystackBreaker.fire(`${PAYSTACK_API_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          currency: 'NGN',
          callback_url: callbackUrl,
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
    } catch (error) {
      // Paystack failed after the row was created: mark FAILED best-effort so
      // the checkout slot can be retried/swept, then propagate the error.
      try {
        await prisma.payment.updateMany({
          where: { id: payment.id, providerReference: provisionalReference },
          data: { status: PaymentStatus.FAILED },
        });
      } catch {
        // best-effort: the stale-pending sweeper will expire the row.
      }
      throw error;
    }

    // Swap the provisional reference for the real Paystack reference.
    // Guarded by id + provisional ref so only this row is touched.
    await prisma.payment.updateMany({
      where: { id: payment.id, providerReference: provisionalReference },
      data: { providerReference: data.data.reference },
    });

    res.status(200).json(
      successResponse({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
        paymentId: payment.id,
        // #33 Display-vs-charged: echo the server-resolved charged figure so
        // the UI displays what Paystack will actually charge (NGN).
        amount: resolvedAmount,
        currency: 'NGN',
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

/** Settle an appointment from stored wallet value without a Paystack redirect. */
export const payAppointmentWithWallet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const appointment = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
      include: { payment: true },
    });
    if (!appointment) throw new NotFoundError('Appointment not found');
    if (appointment.patientId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to pay for this appointment');
    }
    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new ValidationError('This appointment is not eligible for payment');
    }
    if (appointment.payment?.status === PaymentStatus.SUCCESS) {
      throw new ValidationError('This appointment has already been paid');
    }
    if (appointment.payment?.status === PaymentStatus.PENDING) {
      throw new ValidationError('A Paystack checkout is already active for this appointment');
    }
    const amount = Number(appointment.feeSnapshot);
    if (!Number.isInteger(amount) || amount < 500 || amount > 500000) {
      throw new ValidationError('This appointment does not have a valid fee snapshot');
    }

    const reference = `WALLET_APPOINTMENT_${crypto.randomUUID()}`;
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: userPayload.userId } });
      if (!wallet || !wallet.isActive) throw new ValidationError('Your wallet is not available');
      const debited = await tx.wallet.updateMany({
        where: { id: wallet.id, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debited.count !== 1) throw new ValidationError('Insufficient wallet balance');
      const updatedWallet = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
      const payment = await tx.payment.create({
        data: {
          userId: userPayload.userId,
          amount,
          currency: 'NGN',
          type: PaymentType.APPOINTMENT,
          status: PaymentStatus.SUCCESS,
          provider: PaymentProvider.WALLET,
          providerReference: reference,
          metadata: { paymentMethod: 'WALLET', appointmentId: appointment.id },
        },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.DEBIT,
          amount,
          balanceAfter: updatedWallet.balance,
          referenceType: WalletReferenceType.PAYMENT,
          referenceId: reference,
          description: `Consultation payment (${appointment.id})`,
        },
      });
      const linked = await tx.appointment.updateMany({
        where: {
          id: appointment.id,
          OR: [{ paymentId: null }, { payment: { status: PaymentStatus.FAILED } }],
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        },
        data: { paymentId: payment.id, status: AppointmentStatus.CONFIRMED },
      });
      if (linked.count !== 1)
        throw new ValidationError('Appointment payment state changed; please refresh');
      await tx.providerEarning.upsert({
        where: {
          appointmentId_providerId: {
            appointmentId: appointment.id,
            providerId: appointment.providerId,
          },
        },
        create: {
          appointmentId: appointment.id,
          providerId: appointment.providerId,
          amount: amount * 0.8,
        },
        update: {},
      });
      return { payment, balance: Number(updatedWallet.balance) };
    });
    res.status(200).json(successResponse(result));
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const userPayload = req.user as JwtPayload;
    // Path param is canonical (GET /verify/:reference); the ?reference=
    // query form is accepted too so older clients still reconcile.
    const rawReference = req.params.reference ?? req.query.reference;
    const reference = Array.isArray(rawReference) ? rawReference[0] : rawReference;
    if (!reference || typeof reference !== 'string') {
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

    if (payment.status === PaymentStatus.SUCCESS && paymentStatus !== PaymentStatus.SUCCESS) {
      paymentStatus = PaymentStatus.SUCCESS;
    }
    const updatedPayment = await prisma.payment.update({
      where: { providerReference: reference },
      data: {
        status: paymentStatus,
        providerTxId: data.data.id?.toString(),
        metadata: data.data as Prisma.InputJsonValue,
      },
    });

    if (paymentStatus === PaymentStatus.SUCCESS && payment.type === PaymentType.APPOINTMENT) {
      await prisma.appointment.updateMany({
        where: { paymentId: payment.id, status: AppointmentStatus.PENDING },
        data: { status: AppointmentStatus.CONFIRMED },
      });
    }

    let currentBalance: number | undefined;
    if (paymentStatus === PaymentStatus.SUCCESS && payment.type === PaymentType.WALLET_TOPUP) {
      let wallet = await prisma.wallet.findUnique({ where: { userId: payment.userId } });
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId: payment.userId, balance: 0, currency: 'NGN' },
        });
        const appt = await prisma.appointment.findUnique({ where: { paymentId: payment.id } });
        if (appt) {
          await prisma.providerEarning.upsert({
            where: {
              appointmentId_providerId: { appointmentId: appt.id, providerId: appt.providerId },
            },
            create: {
              appointmentId: appt.id,
              providerId: appt.providerId,
              amount: Number(payment.amount) * 0.8,
            },
            update: {},
          });
        }
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

    // #34 Duplicate delivery short-circuit: same event.id returns 200.
    if (isDuplicateWebhookEvent((event as { id?: unknown }).id)) {
      console.warn('[payment] ignoring duplicate webhook delivery (event.id already seen)');
      return res.sendStatus(200);
    }

    if (event.event === 'charge.success') {
      const reference = event.data.reference;

      // #29 Explicit currency gate before any credit: only NGN is ever
      // credited. assertPaystackPaymentMatches reconciles amount
      // (Math.round(Number(payment.amount) * 100) vs event.data.amount) and
      // stored currency below; this early check logs + 200s non-NGN events
      // without touching the ledger.
      if (event.data.currency && String(event.data.currency).toUpperCase() !== 'NGN') {
        console.warn(
          `[payment] ignoring webhook with non-NGN currency ${event.data.currency} for ${reference}`
        );
        return res.sendStatus(200);
      }

      const payment = await prisma.payment.findUnique({
        where: { providerReference: reference },
      });

      if (!payment) {
        console.warn(`[payment] ignoring webhook for unknown reference ${reference}`);
        return res.sendStatus(200);
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

      if (payment.type === PaymentType.APPOINTMENT) {
        await prisma.appointment.updateMany({
          where: { paymentId: payment.id, status: AppointmentStatus.PENDING },
          data: { status: AppointmentStatus.CONFIRMED },
        });
        const appt = await prisma.appointment.findUnique({ where: { paymentId: payment.id } });
        if (appt) {
          await prisma.providerEarning.upsert({
            where: {
              appointmentId_providerId: { appointmentId: appt.id, providerId: appt.providerId },
            },
            create: {
              appointmentId: appt.id,
              providerId: appt.providerId,
              amount: Number(payment.amount) * 0.8,
            },
            update: {},
          });
        }
      }

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
        console.warn(`[payment] ignoring webhook for unknown reference ${reference}`);
        return res.sendStatus(200);
      }

      if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.REFUNDED) {
        return res.sendStatus(200);
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
    } else if (event.event === 'refund.processed' || event.event === 'charge.dispute') {
      // #28 Terminal refund/dispute state: mark SUCCESS→REFUNDED only (never
      // resurrect FAILED/REFUNDED). Log + 200 keeps provider retries harmless.
      const reference = event.data?.reference;
      if (reference) {
        const payment = await prisma.payment.findUnique({
          where: { providerReference: reference },
        });
        if (!payment) {
          console.warn(`[payment] ignoring ${event.event} for unknown reference ${reference}`);
        } else if (payment.status === PaymentStatus.SUCCESS) {
          await prisma.payment.updateMany({
            where: { providerReference: reference, status: PaymentStatus.SUCCESS },
            data: {
              status: PaymentStatus.REFUNDED,
              metadata: event.data as Prisma.InputJsonValue,
            },
          });
          console.warn(`[payment] ${event.event} marked REFUNDED: ${reference}`);
        } else {
          console.warn(
            `[payment] ignoring ${event.event} for ${reference} in status ${payment.status}`
          );
        }
      } else {
        console.warn(`[payment] ${event.event} without reference (ignored)`);
      }
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
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 50);
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

export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (!['HOSPITAL_ADMIN', 'SUPER_ADMIN'].includes(userPayload.role)) {
      throw new ForbiddenError('Only clinic administrators can issue refunds');
    }
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { appointment: true },
    });
    if (!payment || payment.type !== PaymentType.APPOINTMENT || !payment.appointment) {
      throw new NotFoundError('Appointment payment not found');
    }
    if (userPayload.role === 'HOSPITAL_ADMIN' && payment.appointment.hospitalId) {
      const admin = await prisma.user.findUnique({
        where: { id: userPayload.userId },
        select: { hospitalId: true },
      });
      if (admin?.hospitalId !== payment.appointment.hospitalId)
        throw new ForbiddenError('Not authorized to refund this payment');
    }
    if (payment.status === PaymentStatus.REFUNDED)
      return res.status(200).json(successResponse(payment));
    if (payment.status !== PaymentStatus.SUCCESS)
      throw new ValidationError('Only successful payments can be refunded');
    if (!PAYSTACK_SECRET_KEY)
      throw new AppError('Payment provider is not configured', 503, 'SERVICE_NOT_CONFIGURED');
    const response = await fetch(`${PAYSTACK_API_URL}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: payment.providerReference,
        amount: Math.round(Number(payment.amount) * 100),
      }),
    });
    const data = (await response.json()) as { status?: boolean; message?: string; data?: unknown };
    if (!response.ok || !data.status)
      throw new AppError(data.message || 'Refund provider request failed', 502, 'REFUND_FAILED');
    const updated = await prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.SUCCESS },
      data: {
        status: PaymentStatus.REFUNDED,
        metadata: { refund: data.data as Prisma.InputJsonValue },
      },
    });
    return res
      .status(200)
      .json(successResponse({ refunded: updated.count === 1, paymentId: payment.id }));
  } catch (error) {
    next(error);
  }
};

/**
 * Best-effort sweeper for stuck PENDING checkouts.
 * PENDING payments older than 30min are marked FAILED with
 * metadata {expired:true} so appointment checkout slots can be retried.
 * Returns the number of payments expired.
 */
export async function sweepStalePendingPayments(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const stale = await prisma.payment.findMany({
    where: { status: PaymentStatus.PENDING, createdAt: { lt: cutoff } },
    select: { id: true },
  });
  if (stale.length === 0) return 0;
  const ids = stale.map((p) => p.id);
  const result = await prisma.payment.updateMany({
    where: { id: { in: ids }, status: PaymentStatus.PENDING },
    data: { status: PaymentStatus.FAILED, metadata: { expired: true } },
  });
  // Release linked appointment checkout slots best-effort.
  try {
    await prisma.appointment.updateMany({
      where: { paymentId: { in: ids } },
      data: { paymentId: null },
    });
  } catch (err) {
    console.warn('[payment] sweepStalePendingPayments unlink failed (best-effort)', err);
  }
  return result.count;
}

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
      // Dev-only static reference data. In production a missing key must
      // fail closed — a stale hardcoded list would misrepresent availability.
      if (process.env.NODE_ENV === 'production') {
        throw new AppError('Payment provider is not configured', 503, 'SERVICE_NOT_CONFIGURED');
      }
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
      // NEVER fake KYC: without a provider key there is no verification.
      // Dev may use the placeholder below; production fails closed.
      if (process.env.NODE_ENV === 'production') {
        throw new AppError('Payment provider is not configured', 503, 'SERVICE_NOT_CONFIGURED');
      }
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
