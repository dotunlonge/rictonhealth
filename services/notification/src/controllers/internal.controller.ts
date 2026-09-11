import { Request, Response, NextFunction } from 'express';
import { prisma } from '@ricton/db';
import { logger, successResponse, ValidationError } from '@ricton/shared';

/**
 * Canonical flat payload sent by payment-service webhooks:
 *   { paymentId, userId, reference, amount, type }
 * The legacy nested shape { payment: {…}, user: {…} } is still accepted.
 */
interface PaymentWebhookBody {
  paymentId?: string;
  userId?: string;
  reference?: string;
  amount?: number | string;
  type?: string;
  payment?: {
    id?: string;
    amount?: number | string;
    currency?: string;
    providerReference?: string;
  };
  user?: { id?: string };
  currency?: string;
  providerReference?: string;
}

function normalizePaymentPayload(body: PaymentWebhookBody) {
  const paymentId = body.paymentId ?? body.payment?.id;
  const userId = body.userId ?? body.user?.id;
  if (!paymentId || !userId) {
    throw new ValidationError('paymentId and userId are required');
  }
  return {
    paymentId,
    userId,
    amount: body.amount ?? body.payment?.amount ?? 0,
    currency: body.currency ?? body.payment?.currency ?? 'NGN',
    reference: body.reference ?? body.payment?.providerReference ?? paymentId,
  };
}

/**
 * Internal webhook: payment success → create in-app notification
 */
export const handlePaymentSuccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, userId, amount, currency, reference } = normalizePaymentPayload(req.body);

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'BILLING',
        title: 'Payment Confirmed',
        body: `Your payment of ${currency} ${amount} has been processed successfully. Reference: ${reference}`,
        channel: 'IN_APP',
      },
    });

    logger.info(
      { paymentId, notificationId: notification.id },
      'Payment success notification created'
    );
    res.status(200).json(successResponse({ notificationId: notification.id }));
  } catch (error) {
    next(error);
  }
};

/**
 * Internal webhook: payment failed → create in-app notification
 */
export const handlePaymentFailed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { paymentId, userId, amount, currency, reference } = normalizePaymentPayload(req.body);

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'BILLING',
        title: 'Payment Failed',
        body: `Your payment of ${currency} ${amount} could not be processed. Reference: ${reference}. Please try again or use a different payment method.`,
        channel: 'IN_APP',
      },
    });

    logger.warn(
      { paymentId, notificationId: notification.id },
      'Payment failure notification created'
    );
    res.status(200).json(successResponse({ notificationId: notification.id }));
  } catch (error) {
    next(error);
  }
};
