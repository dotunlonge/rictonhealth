/**
 * Order + subscription lifecycle guards (TDD RED → GREEN).
 * Source-static + schema-static: no Docker/DB.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Orders: restock-safe items + state machine', () => {
  const schema = () => read('packages/db/prisma/schema.prisma');
  const ctrl = () => read('services/pharmacy/src/controllers/pharmacy.controller.ts');

  it('OrderItem retains productId for restocking', () => {
    expect(schema()).toMatch(/model OrderItem[\s\S]{0,600}productId/);
  });

  it('order creation persists productId on each item', () => {
    expect(ctrl()).toMatch(/productId:\s*(d\.productId|item\.productId)/);
  });

  it('cancellation restocks products from stored item productIds', () => {
    const src = ctrl();
    // Single restock helper (stock increment) invoked from both cancel paths.
    expect(src).toMatch(/stock:\s*\{\s*increment/);
    const calls = src.match(/restockOrderItems\(tx/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2); // patient + pharmacist paths
  });

  it('status transitions follow an explicit allowlist (no arbitrary jumps)', () => {
    expect(ctrl()).toMatch(/ORDER_TRANSITIONS|allowedTransitions|TRANSITION/);
  });

  it('cancellation uses a compare-and-set status update so concurrent retries restock once', () => {
    const src = ctrl();
    const cancelFn = src.slice(src.indexOf('export const cancelOrder'));
    expect(cancelFn).toMatch(/updateMany\([\s\S]{0,300}status:\s*OrderStatus\.PLACED/);
    expect(cancelFn).toMatch(/count\s*!==\s*1|count\s*===\s*0/);
  });
});

describe('Subscriptions: no pre-payment ACTIVE', () => {
  const schema = () => read('packages/db/prisma/schema.prisma');
  const ctrl = () => read('services/subscription/src/controllers/subscription.controller.ts');

  it('SubscriptionStatus supports PENDING', () => {
    expect(schema()).toMatch(/enum SubscriptionStatus[\s\S]{0,120}PENDING/);
  });

  it('upgrade creates PENDING (never ACTIVE before payment)', () => {
    const src = ctrl();
    const start = src.indexOf('export const upgradeSubscription');
    const nextExport = src.indexOf('export const', start + 10);
    const upgradeFn = src.slice(start, nextExport === -1 ? undefined : nextExport);
    expect(upgradeFn).toMatch(/status:\s*SubscriptionStatus\.PENDING/);
    // No creation call may grant ACTIVE up front (duplicate ACTIVE checks are fine).
    const creates = upgradeFn.match(/subscription\.create\(\{[\s\S]{0,400}?\}\)/g) || [];
    expect(creates.length).toBeGreaterThanOrEqual(1);
    for (const c of creates) {
      expect(c).not.toMatch(/status:\s*SubscriptionStatus\.ACTIVE/);
    }
  });

  it('webhook activates only after reconciling amount/currency', () => {
    const src = ctrl();
    const hookFn = src.slice(src.indexOf('export const handleWebhook'));
    expect(hookFn).toMatch(/currency/);
    expect(hookFn).toMatch(/PREMIUM_PRICE_KOBO|expectedAmount|amount mismatch/i);
  });

  it('does not persist a pending subscription until payment initialization succeeds', () => {
    const src = ctrl();
    const start = src.indexOf('export const upgradeSubscription');
    const end = src.indexOf('export const cancelSubscription', start);
    const upgradeFn = src.slice(start, end);
    expect(upgradeFn.indexOf('paymentData.status')).toBeGreaterThanOrEqual(0);
    expect(upgradeFn.indexOf('subscription.create')).toBeGreaterThan(
      upgradeFn.indexOf('paymentData.status')
    );
  });
});
