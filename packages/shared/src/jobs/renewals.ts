import { Worker, Queue } from 'bullmq';
import { prisma } from '@ricton/db';
import { logger } from '../logger';
import { redis } from '../redis';
import { emailQueue } from './index';

// Single source of truth for the premium price is the subscription service
// (PREMIUM_PRICE_NGN); this mirror exists because shared cannot import service
// code. services/subscription/tests assert the webhook still reconciles 5000.
const PREMIUM_PRICE_NGN = 5000;
const RENEWAL_WINDOW_DAYS = 3;
const MAX_DUNNING_ATTEMPTS = 3;

const PAYSTACK_API_URL = 'https://api.paystack.co';

export interface RenewalSweepResult {
  invoiced: number;
  expired: number;
  cancelled: number;
  skipped: number;
}

async function initializeRenewalTransaction(
  email: string,
  userId: string,
  subscriptionId: string,
  reference: string
): Promise<{ authorizationUrl: string; reference: string }> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }
  const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success`;
  const res = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      amount: PREMIUM_PRICE_NGN * 100,
      currency: 'NGN',
      reference,
      callback_url: callbackUrl,
      metadata: { type: 'SUBSCRIPTION', userId, subscriptionId, renewal: true },
    }),
  });
  const data = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: { authorization_url: string; reference: string };
  };
  if (!res.ok || !data.status || !data.data) {
    throw new Error(`Paystack renewal init failed: ${data.message || res.status}`);
  }
  return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
}

/**
 * Daily renewal sweep. Idempotent: a subscription with a fresh PENDING
 * renewal invoice is skipped, so overlapping runs never double-invoice.
 */
export async function runSubscriptionRenewals(now = new Date()): Promise<RenewalSweepResult> {
  const result: RenewalSweepResult = { invoiced: 0, expired: 0, cancelled: 0, skipped: 0 };
  const windowEnd = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const due = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', expiresAt: { lte: windowEnd } },
    include: { user: { select: { id: true, email: true } } },
  });

  for (const sub of due) {
    const expired = sub.expiresAt.getTime() <= now.getTime();

    if (!sub.autoRenew) {
      if (expired) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' },
        });
        result.expired += 1;
      } else {
        result.skipped += 1;
      }
      continue;
    }

    // Idempotency: a fresh (<24h) PENDING invoice means a previous run (or the
    // checkout flow) already handled this cycle. Matched on stored metadata
    // (robust to provider reference mangling) with the reference prefix as backup.
    const freshInvoice = await prisma.payment.findFirst({
      where: {
        type: 'SUBSCRIPTION',
        status: 'PENDING',
        createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        OR: [
          { metadata: { path: ['subscriptionId'], equals: sub.id } },
          { providerReference: { startsWith: `SUB_RENEWAL_${sub.id}_` } },
        ],
      },
      select: { id: true },
    });
    if (freshInvoice) {
      result.skipped += 1;
      continue;
    }

    if (expired && sub.renewalAttempts >= MAX_DUNNING_ATTEMPTS) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELLED' },
      });
      await prisma.notification.create({
        data: {
          userId: sub.userId,
          type: 'BILLING',
          title: 'Subscription cancelled',
          body: 'Your Premium subscription was cancelled after 3 unpaid renewal invoices.',
          channel: 'IN_APP',
        },
      });
      result.cancelled += 1;
      continue;
    }

    const day = now.toISOString().slice(0, 10);
    const reference = `SUB_RENEWAL_${sub.id}_${day}`;
    const existing = await prisma.payment.findUnique({ where: { providerReference: reference } });
    if (!existing) {
      const init = await initializeRenewalTransaction(
        sub.user.email || 'user@ricton.tech',
        sub.userId,
        sub.id,
        reference
      );
      await prisma.payment.create({
        data: {
          userId: sub.userId,
          amount: PREMIUM_PRICE_NGN,
          currency: 'NGN',
          type: 'SUBSCRIPTION',
          status: 'PENDING',
          provider: 'PAYSTACK',
          providerReference: init.reference,
          metadata: { subscriptionId: sub.id, renewal: true },
        },
      });
      const payUrl = init.authorizationUrl;
      await prisma.notification.create({
        data: {
          userId: sub.userId,
          type: 'BILLING',
          title: expired ? 'Renewal overdue — action needed' : 'Subscription renewal due',
          body: `Your Premium renewal (₦${PREMIUM_PRICE_NGN.toLocaleString()}) is ready: ${payUrl}`,
          channel: 'IN_APP',
        },
      });
      try {
        if (sub.user.email) {
          await emailQueue.add('renewal-due', {
            to: sub.user.email,
            subject: 'Ricton Premium renewal due',
            body: `Your Premium renewal is ready: ${payUrl}`,
          });
        }
      } catch (err) {
        logger.warn({ err }, 'Renewal email enqueue failed (non-blocking)');
      }
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { renewalAttempts: { increment: 1 }, lastRenewalAttemptAt: now },
    });
    result.invoiced += 1;
  }

  return result;
}

export const subscriptionRenewalQueue = new Queue('subscription-renewals', {
  connection: redis,
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 20, attempts: 3 },
});

export function startRenewalWorker() {
  const worker = new Worker(
    'subscription-renewals',
    async () => {
      const result = await runSubscriptionRenewals();
      logger.info(result, 'Subscription renewal sweep completed');
      return result;
    },
    { connection: redis }
  );
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err?.message }, 'Renewal sweep failed');
  });
  return worker;
}

export async function scheduleRenewalSweep() {
  await subscriptionRenewalQueue.add(
    'daily-sweep',
    {},
    { repeat: { pattern: '0 3 * * *' }, jobId: 'subscription-renewal-daily' }
  );
}
