import crypto from 'crypto';
import { Worker, Queue } from 'bullmq';
import { prisma, AppointmentStatus, ProviderEarningStatus } from '@ricton/db';
import { bullmqConnection } from '@ricton/shared';

const PAYSTACK_API_URL = 'https://api.paystack.co';
/** Upper bound per sweep so one run cannot drain the ledger in a single tick. */
const PAYOUT_BATCH_SIZE = 100;

type BankDetails = {
  bankCode?: unknown;
  bank_code?: unknown;
  accountNumber?: unknown;
  account_number?: unknown;
  accountName?: unknown;
  account_name?: unknown;
};

function extractBankDetails(
  raw: unknown
): { bankCode: string; accountNumber: string; accountName: string } | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as BankDetails;
  const bankCode = String(b.bankCode ?? b.bank_code ?? '').trim();
  const accountNumber = String(b.accountNumber ?? b.account_number ?? '').trim();
  if (!bankCode || !/^[0-9]{10}$/.test(accountNumber)) return null;
  const accountName = String(b.accountName ?? b.account_name ?? 'Ricton Provider').slice(0, 100);
  return { bankCode, accountNumber, accountName };
}

async function paystackPost(path: string, secret: string, body: unknown): Promise<any> {
  const res = await fetch(`${PAYSTACK_API_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as any;
  if (!res.ok || !data?.status) {
    throw new Error(data?.message || `Paystack ${path} failed (${res.status})`);
  }
  return data.data;
}

/**
 * #25 Payout sweep (runs daily via the 'payouts' queue — see
 * schedulePayoutSweep/startPayoutWorker below).
 *
 * Step 1 — promote: PENDING → AVAILABLE once the linked appointment is
 * COMPLETED (same as the old stub).
 *
 * Step 2 — pay out best-effort: for each AVAILABLE earning whose provider
 * has bank details (`User.bankDetails` with bankCode + 10-digit NUBAN
 * accountNumber), create a Paystack transfer recipient + transfer
 * (`Math.round(amount * 100)` kobo, idempotency via a `payoutReference`
 * uuid). On success mark PAID_OUT + payoutReference; on ANY failure leave
 * AVAILABLE and warn (retry next sweep). Earnings with no bank details are
 * left AVAILABLE by design — providers must save payout details first.
 *
 * The sweep never throws: per-earning provider calls are try/catch, and the
 * outer body guards the promotion query too.
 *
 * @returns number of earnings successfully paid out (PAID_OUT this run).
 */
export async function payoutProviderEarnings(): Promise<number> {
  try {
    const promoted = await prisma.providerEarning.updateMany({
      where: {
        status: ProviderEarningStatus.PENDING,
        appointment: { status: AppointmentStatus.COMPLETED },
      },
      data: { status: ProviderEarningStatus.AVAILABLE },
    });
    // eslint-disable-next-line no-console
    console.log(`[payment] payoutProviderEarnings marked AVAILABLE: ${promoted.count}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[payment] payoutProviderEarnings promotion failed (best-effort)', err);
    return 0;
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    // eslint-disable-next-line no-console
    console.warn('[payment] payout sweep: PAYSTACK_SECRET_KEY missing — earnings left AVAILABLE');
    return 0;
  }

  let due: Array<{ id: string; providerId: string; amount: unknown }> = [];
  try {
    due = await prisma.providerEarning.findMany({
      where: { status: ProviderEarningStatus.AVAILABLE },
      select: { id: true, providerId: true, amount: true },
      orderBy: { createdAt: 'asc' },
      take: PAYOUT_BATCH_SIZE,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[payment] payout sweep: AVAILABLE lookup failed (best-effort)', err);
    return 0;
  }
  if (due.length === 0) return 0;

  let paidOut = 0;
  for (const earning of due) {
    try {
      const provider = await prisma.user.findUnique({
        where: { id: earning.providerId },
        select: { bankDetails: true },
      });
      const bank = extractBankDetails(provider?.bankDetails);
      if (!bank) {
        // Documented: no bank details → leave AVAILABLE (provider onboarding).
        // eslint-disable-next-line no-console
        console.warn(`[payment] payout skipped (no bank details): earning ${earning.id}`);
        continue;
      }

      // Claim the row with an idempotency reference before calling Paystack
      // so overlapping sweeps cannot double-pay the same earning.
      const reference = `RICPAYOUT_${crypto.randomUUID()}`;
      const claimed = await prisma.providerEarning.updateMany({
        where: { id: earning.id, status: ProviderEarningStatus.AVAILABLE },
        data: { payoutReference: reference },
      });
      if (claimed.count === 0) continue; // claimed/paid by a concurrent sweep

      const amountKobo = Math.round(Number(earning.amount) * 100);
      if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
        // eslint-disable-next-line no-console
        console.warn(`[payment] payout skipped (invalid amount): earning ${earning.id}`);
        continue;
      }

      const recipient = await paystackPost('/transferrecipient', secret, {
        type: 'nuban',
        name: bank.accountName,
        account_number: bank.accountNumber,
        bank_code: bank.bankCode,
        currency: 'NGN',
      });
      if (!recipient?.recipient_code) throw new Error('Paystack recipient creation failed');

      await paystackPost('/transfer', secret, {
        source: 'balance',
        amount: amountKobo,
        recipient: recipient.recipient_code,
        reference,
        reason: 'Ricton provider payout',
      });

      const marked = await prisma.providerEarning.updateMany({
        where: { id: earning.id, status: ProviderEarningStatus.AVAILABLE },
        data: { status: ProviderEarningStatus.PAID_OUT, payoutReference: reference },
      });
      if (marked.count === 1) paidOut += 1;
    } catch (err) {
      // Best-effort: leave AVAILABLE (+ warn) so the next sweep retries.
      // eslint-disable-next-line no-console
      console.warn(`[payment] payout failed (left AVAILABLE): earning ${earning.id}`, err);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[payment] payoutProviderEarnings paid out: ${paidOut}/${due.length}`);
  return paidOut;
}

export const payoutQueue = new Queue('payouts', {
  connection: bullmqConnection,
  defaultJobOptions: { removeOnComplete: 50, removeOnFail: 20, attempts: 3 },
});

export function startPayoutWorker() {
  const worker = new Worker(
    'payouts',
    async () => {
      const paidOut = await payoutProviderEarnings();
      // eslint-disable-next-line no-console
      console.log('[payment] payout sweep completed', { paidOut });
      return { paidOut };
    },
    { connection: bullmqConnection }
  );
  worker.on('failed', (job, err) => {
    // eslint-disable-next-line no-console
    console.warn('[payment] payout sweep job failed', { jobId: job?.id, err: err?.message });
  });
  return worker;
}

export async function schedulePayoutSweep() {
  await payoutQueue.add(
    'daily-sweep',
    {},
    { repeat: { pattern: '0 2 * * *' }, jobId: 'payout-daily' }
  );
}
