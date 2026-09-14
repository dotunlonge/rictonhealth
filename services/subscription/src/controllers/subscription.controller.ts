import { Request, Response, NextFunction } from 'express';
import {
  prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentType,
  PaymentProvider,
} from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  AppError,
  getRawBodyString,
  parseWebhookBody,
  verifyPaystackSignature,
} from '@ricton/shared';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

// Single source of truth for the premium price (kobo reconciliation included).
const PREMIUM_PRICE_NGN = 5000;
const PREMIUM_PRICE_KOBO = PREMIUM_PRICE_NGN * 100;

/**
 * List available subscription plans
 */
export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = [
      {
        id: 'free',
        name: 'Free',
        code: SubscriptionPlan.FREE,
        price: 0,
        currency: 'NGN',
        billingPeriod: 'monthly',
        features: [
          'Basic appointment booking',
          'Access to general practitioners',
          'Limited telemedicine consultations',
          'Basic health records',
        ],
        limitations: [
          'No specialist access',
          'No priority support',
          'Limited monthly consultations',
        ],
      },
      {
        id: 'premium',
        name: 'Premium',
        code: SubscriptionPlan.PREMIUM,
        price: 5000,
        currency: 'NGN',
        billingPeriod: 'monthly',
        features: [
          'Unlimited appointment bookings',
          'Access to all specialists',
          'Unlimited telemedicine consultations',
          'Complete health records',
          'Priority support',
          'Discounted pharmacy orders (10%)',
          'Family member additions (up to 4)',
          'Health analytics dashboard',
        ],
        limitations: [],
      },
    ];

    res.status(200).json(successResponse({ plans }));
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's subscription
 */
export const getMySubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;

    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE] },
      },
      include: {
        payment: {
          select: {
            amount: true,
            providerReference: true,
            createdAt: true,
          },
        },
      },
      orderBy: { expiresAt: 'desc' },
    });

    if (!subscription) {
      // Return free plan as default
      return res.status(200).json(
        successResponse({
          plan: SubscriptionPlan.FREE,
          status: SubscriptionStatus.ACTIVE,
          features: ['Basic appointment booking', 'Access to general practitioners'],
        })
      );
    }

    const isExpired = new Date() > subscription.expiresAt;

    res.status(200).json(
      successResponse({
        id: subscription.id,
        plan: subscription.plan,
        status: isExpired ? SubscriptionStatus.EXPIRED : subscription.status,
        startsAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
        autoRenew: subscription.autoRenew,
        payment: subscription.payment,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Upgrade to premium subscription
 */
export const upgradeSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { plan = SubscriptionPlan.PREMIUM } = req.body;

    if (plan !== SubscriptionPlan.PREMIUM) {
      throw new ValidationError('Only PREMIUM plan upgrades are supported');
    }

    // Atomic check-and-create to prevent race conditions
    const subscriptionCheck = await prisma.$transaction(async (tx) => {
      const existingSub = await tx.subscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { gte: new Date() },
        },
      });

      if (existingSub && existingSub.plan === SubscriptionPlan.PREMIUM) {
        throw new ValidationError('You already have an active Premium subscription');
      }

      return existingSub;
    });

    if (subscriptionCheck && subscriptionCheck.plan === SubscriptionPlan.PREMIUM) {
      throw new ValidationError('You already have an active Premium subscription');
    }

    // Calculate pricing
    const premiumPrice = PREMIUM_PRICE_NGN; // NGN
    const billingPeriod = 'monthly';

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Initialize Paystack payment
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('Payment gateway not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success`;
    const subscriptionId = crypto.randomUUID();
    const requestedReference = `SUB_${userId}_${crypto.randomUUID()}`;

    const paymentInitRes = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email || 'user@ricton.tech',
        amount: premiumPrice * 100, // Paystack expects kobo
        currency: 'NGN',
        reference: requestedReference,
        callback_url: callbackUrl,
        metadata: {
          type: PaymentType.SUBSCRIPTION,
          plan,
          billingPeriod,
          userId,
          subscriptionId,
        },
      }),
    });

    const paymentData = (await paymentInitRes.json()) as any;

    if (!paymentData.status || !paymentData.data) {
      throw new AppError(
        `Payment initialization failed: ${paymentData.message}`,
        400,
        'PAYMENT_ERROR'
      );
    }

    const { authorization_url, reference } = paymentData.data;

    // Persist both records only after Paystack accepted initialization. This
    // prevents failed provider calls from leaving orphan PENDING subscriptions.
    const { subscription } = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId,
          amount: premiumPrice,
          currency: 'NGN',
          type: PaymentType.SUBSCRIPTION,
          status: 'PENDING',
          provider: PaymentProvider.PAYSTACK,
          providerReference: reference,
          metadata: { subscriptionId, plan, billingPeriod },
        },
      });
      const subscription = await tx.subscription.create({
        data: {
          id: subscriptionId,
          userId,
          plan,
          status: SubscriptionStatus.PENDING,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true,
          paymentId: payment.id,
        },
      });
      return { payment, subscription };
    });

    res.status(200).json(
      successResponse({
        message: 'Subscription upgrade initialized',
        paymentUrl: authorization_url,
        reference,
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          expiresAt: subscription.expiresAt,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;

    // Both paid (ACTIVE) and unpaid (PENDING) upgrades are cancellable; the
    // latter abandons the checkout before payment completes.
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundError('No active subscription found');
    }

    if (subscription.plan === SubscriptionPlan.FREE) {
      throw new ValidationError('Cannot cancel Free plan');
    }

    // ACTIVE: keep access until expiry, disable auto-renew. PENDING (unpaid):
    // abandon the upgrade entirely.
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data:
        subscription.status === SubscriptionStatus.PENDING
          ? { status: SubscriptionStatus.CANCELLED, autoRenew: false }
          : { autoRenew: false },
    });

    res.status(200).json(
      successResponse({
        message:
          'Subscription cancelled. You will retain access until the end of your billing period.',
        subscription: {
          id: updated.id,
          plan: updated.plan,
          status: updated.status,
          expiresAt: updated.expiresAt,
          autoRenew: updated.autoRenew,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscription history
 */
export const getSubscriptionHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const { limit = 10, offset = 0 } = req.query;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where: { userId },
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          payment: {
            select: {
              amount: true,
              status: true,
              providerReference: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.subscription.count({ where: { userId } }),
    ]);

    res.status(200).json(
      successResponse({
        subscriptions,
        total,
        limit: Number(limit),
        offset: Number(offset),
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Paystack webhook for subscription payments
 */
export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const rawBody = getRawBodyString(req.body);
    if (
      !verifyPaystackSignature(rawBody, req.headers['x-paystack-signature'], PAYSTACK_SECRET_KEY)
    ) {
      throw new AppError('Invalid signature', 401, 'UNAUTHORIZED');
    }

    const event = parseWebhookBody<any>(req.body);

    if (event.event === 'charge.success') {
      const metadata = event.data.metadata || {};

      if (metadata.type === PaymentType.SUBSCRIPTION) {
        const { userId, plan, subscriptionId } = metadata;

        // Reconcile provider amount/currency against the expected premium price
        // before granting anything.
        if (event.data.currency && event.data.currency !== 'NGN') {
          throw new AppError(
            `Unsupported subscription currency: ${event.data.currency}`,
            400,
            'PAYMENT_RECONCILIATION_FAILED'
          );
        }
        if (event.data.amount !== PREMIUM_PRICE_KOBO) {
          throw new AppError(
            `Subscription amount mismatch: expected ${PREMIUM_PRICE_KOBO}, got ${event.data.amount}`,
            400,
            'PAYMENT_RECONCILIATION_FAILED'
          );
        }

        // Find the payment
        const payment = await prisma.payment.findUnique({
          where: { providerReference: event.data.reference },
        });

        if (payment && payment.status === 'PENDING') {
          // Update payment status
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'SUCCESS',
              providerTxId: event.data.id?.toString(),
              updatedAt: new Date(),
            },
          });

          // Activate/update subscription (PENDING → ACTIVE only here)
          if (subscriptionId) {
            await prisma.subscription.update({
              where: { id: subscriptionId },
              data: {
                status: SubscriptionStatus.ACTIVE,
                plan: plan as SubscriptionPlan,
                startsAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
              },
            });
          } else {
            // Create new subscription if ID not in metadata
            await prisma.subscription.create({
              data: {
                userId,
                plan: plan as SubscriptionPlan,
                status: SubscriptionStatus.ACTIVE,
                startsAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                autoRenew: true,
              },
            });
          }
        }
      }
    } else if (event.event === 'charge.failed' || event.event === 'charge.abandoned') {
      const metadata = event.data.metadata || {};

      if (metadata.type === PaymentType.SUBSCRIPTION && metadata.subscriptionId) {
        // Mark payment as failed and retire the pending subscription.
        await prisma.payment.updateMany({
          where: { providerReference: event.data.reference },
          data: { status: 'FAILED' },
        });
        await prisma.subscription.updateMany({
          where: { id: metadata.subscriptionId, status: SubscriptionStatus.PENDING },
          data: { status: SubscriptionStatus.CANCELLED },
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};
