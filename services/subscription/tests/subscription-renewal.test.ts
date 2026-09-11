process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mocked';

import { prisma, SubscriptionStatus, SubscriptionPlan } from '@ricton/db';
import { runSubscriptionRenewals } from '../../../packages/shared/src/jobs/renewals';
import { createUser, cleanDatabase } from '../../../packages/shared/src/__tests__/factories';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('@ricton/shared');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return { __esModule: true, ...actual, redis: createRedisMock() };
});

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysAhead = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

describe('Subscription renewal sweep (TDD)', () => {
  beforeEach(async () => {
    // Faithful provider mock: echoes the requested reference like Paystack does.
    (global.fetch as unknown as jest.Mock) = jest
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse((init?.body as string) ?? '{}') as { reference?: string };
        return {
          ok: true,
          json: async () => ({
            status: true,
            data: {
              authorization_url: 'https://checkout.paystack.com/renewal',
              reference: body.reference ?? `SUB_RENEWAL_mock_${Date.now()}`,
            },
          }),
        };
      });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await cleanDatabase();
  });

  async function makeSub(
    overrides: {
      status?: SubscriptionStatus;
      plan?: SubscriptionPlan;
      expiresAt?: Date;
      autoRenew?: boolean;
      renewalAttempts?: number;
    } = {}
  ) {
    const user = await createUser({ role: 'PATIENT' });
    return prisma.subscription.create({
      data: {
        userId: user.id,
        plan: overrides.plan ?? SubscriptionPlan.PREMIUM,
        status: overrides.status ?? SubscriptionStatus.ACTIVE,
        startsAt: daysAgo(30),
        expiresAt: overrides.expiresAt ?? daysAgo(1),
        autoRenew: overrides.autoRenew ?? true,
        renewalAttempts: overrides.renewalAttempts ?? 0,
      },
    });
  }

  it('expires ACTIVE subscriptions past due without autoRenew', async () => {
    await makeSub({ autoRenew: false });
    const result = await runSubscriptionRenewals();
    expect(result.expired).toBe(1);
    const sub = await prisma.subscription.findFirst({});
    expect(sub?.status).toBe(SubscriptionStatus.EXPIRED);
  });

  it('invoices an expiring autoRenew subscription with a PENDING payment + notice', async () => {
    await makeSub({ expiresAt: daysAhead(1) });
    const result = await runSubscriptionRenewals();
    expect(result.invoiced).toBe(1);
    const payment = await prisma.payment.findFirst({
      where: { status: 'PENDING', type: 'SUBSCRIPTION' },
    });
    expect(payment).toBeDefined();
    expect(payment?.amount.toString()).toBe('5000');
    const notice = await prisma.notification.findFirst({ where: { title: { contains: 'due' } } });
    expect(notice).toBeDefined();
  });

  it('is idempotent: a fresh invoice blocks a second one', async () => {
    const sub = await makeSub({ expiresAt: daysAhead(1) });
    await runSubscriptionRenewals();
    const second = await runSubscriptionRenewals();
    expect(second.skipped).toBeGreaterThanOrEqual(1);
    const count = await prisma.payment.count({
      where: { providerReference: { startsWith: `SUB_RENEWAL_${sub.id}_` } },
    });
    expect(count).toBe(1);
  });

  it('cancels after 3 ignored dunning invoices past expiry', async () => {
    await makeSub({ renewalAttempts: 3 });
    (global.fetch as unknown as jest.Mock) = jest.fn(); // must not reach provider
    const result = await runSubscriptionRenewals();
    expect(result.cancelled).toBe(1);
    const sub = await prisma.subscription.findFirst({});
    expect(sub?.status).toBe(SubscriptionStatus.CANCELLED);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
