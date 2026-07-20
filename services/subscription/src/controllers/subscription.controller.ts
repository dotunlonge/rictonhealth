import { Request, Response, NextFunction } from 'express';
import { prisma, SubscriptionPlan, SubscriptionStatus, PaymentType, PaymentProvider } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ValidationError, AppError } from '@ricton/shared';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = 'https://api.paystack.co';

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
        status: { in: [SubscriptionStatus.ACTIVE] }
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

    // Check for existing active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: { 
        userId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { gte: new Date() },
      },
    });

    if (existingSubscription && existingSubscription.plan === SubscriptionPlan.PREMIUM) {
      throw new ValidationError('You already have an active Premium subscription');
    }

    // Calculate pricing
    const premiumPrice = 5000; // NGN
    const billingPeriod = 'monthly';

    // Initialize Paystack payment
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('Payment gateway not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success`;
    
    const paymentInitRes = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userPayload.email,
        amount: premiumPrice * 100, // Paystack expects kobo
        currency: 'NGN',
        reference: `SUB_${userId}_${Date.now()}`,
        callback_url: callbackUrl,
        metadata: {
          type: PaymentType.SUBSCRIPTION,
          plan,
          billingPeriod,
          userId,
        },
      }),
    });

    const paymentData = await paymentInitRes.json();

    if (!paymentData.status || !paymentData.data) {
      throw new AppError(`Payment initialization failed: ${paymentData.message}`, 400, 'PAYMENT_ERROR');
    }

    const { authorization_url, reference } = paymentData.data;

    // Create pending subscription record
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        autoRenew: true,
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: premiumPrice,
        currency: 'NGN',
        type: PaymentType.SUBSCRIPTION,
        status: 'PENDING',
        provider: PaymentProvider.PAYSTACK,
        providerReference: reference,
        metadata: {
          subscriptionId: subscription.id,
          plan,
          billingPeriod,
        },
      },
    });

    // Link payment to subscription
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { paymentId: payment.id },
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

    const subscription = await prisma.subscription.findFirst({
      where: { 
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new NotFoundError('No active subscription found');
    }

    if (subscription.plan === SubscriptionPlan.FREE) {
      throw new ValidationError('Cannot cancel Free plan');
    }

    // Update subscription - keep active until expiry but disable auto-renew
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        autoRenew: false,
      },
    });

    res.status(200).json(
      successResponse({
        message: 'Subscription cancelled. You will retain access until the end of your billing period.',
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
    const crypto = await import('crypto');
    
    if (!PAYSTACK_SECRET_KEY) {
      throw new AppError('PAYSTACK_SECRET_KEY is not configured', 500, 'SERVICE_NOT_CONFIGURED');
    }

    const hash = crypto.default
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      throw new AppError('Invalid signature', 401, 'UNAUTHORIZED');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const metadata = event.data.metadata || {};
      
      if (metadata.type === PaymentType.SUBSCRIPTION) {
        const { userId, plan, subscriptionId } = metadata;

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

          // Activate/update subscription
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
        // Mark payment as failed
        await prisma.payment.updateMany({
          where: { providerReference: event.data.reference },
          data: { status: 'FAILED' },
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
};
