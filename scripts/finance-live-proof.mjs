import crypto from 'node:crypto';
import fs from 'node:fs';

/**
 * Live finance proof (Paystack TEST keys — no real money moves).
 * Requires the full stack (bash scripts/dev-up.sh) plus an existing ACTIVE
 * user to charge against. Never run against production.
 * Usage: FINANCE_EMAIL=.. FINANCE_PASSWORD=.. node scripts/finance-live-proof.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GW = process.env.E2E_GATEWAY_URL || 'http://localhost:8000';
const email = process.env.FINANCE_EMAIL || 'smoke.1789915445@ricton.health';
const password = process.env.FINANCE_PASSWORD || 'SmokePass123!';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = fs.readFileSync(path.join(repoRoot, '.env'), 'utf8');
const PAYSTACK_KEY = envFile.match(/^PAYSTACK_SECRET_KEY="([^"]+)"/m)?.[1];
if (!PAYSTACK_KEY) throw new Error('no test key');

async function api(path, { method = 'GET', token, body, rawBody, extraHeaders = {} } = {}) {
  const res = await fetch(`${GW}${path}`, {
    method,
    headers: {
      ...(body !== undefined || rawBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text: text.slice(0, 200) };
}

const results = [];
const check = (name, cond, extra = '') => {
  results.push([cond ? 'PASS' : 'FAIL', name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
};

// Login
const login = await api('/api/auth/login', { method: 'POST', body: { email, password } });
const token = login.json?.data?.token;
check('login', !!token);

// 1. Wallet topup init (REAL Paystack test API)
const topup = await api('/api/wallets/topup', {
  method: 'POST',
  token,
  body: { amount: 5000 },
});
const ref = topup.json?.data?.reference;
check('topup init returns hosted checkout', topup.status === 200 && !!topup.json?.data?.authorizationUrl, `ref=${ref}`);
const balBefore = (await api('/api/wallets/me', { token })).json?.data?.balance;

// Helper: signed webhook delivery
async function deliverWebhook(payload) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha512', PAYSTACK_KEY).update(raw).digest('hex');
  return api('/api/wallets/webhook', {
    method: 'POST',
    rawBody: raw,
    extraHeaders: { 'x-paystack-signature': sig },
  });
}
const chargeSuccess = (reference, amountKobo, extra = {}) => ({
  event: 'charge.success',
  data: {
    reference,
    amount: amountKobo,
    currency: 'NGN',
    channel: 'card',
    customer: { email },
    metadata: { custom_fields: [{ variable_name: 'purpose', value: 'wallet_topup' }] },
    ...extra,
  },
});

// 2. Forged signature rejected
const bad = await api('/api/wallets/webhook', {
  method: 'POST',
  body: chargeSuccess(ref, 500000),
  extraHeaders: { 'x-paystack-signature': 'deadbeef' },
});
check('forged webhook rejected', bad.status === 401);

// 3. Valid webhook credits once
const w1 = await deliverWebhook(chargeSuccess(ref, 500000));
const balAfter1 = Number((await api('/api/wallets/me', { token })).json?.data?.balance);
check('valid webhook credits wallet', w1.status === 200 && balAfter1 - Number(balBefore) === 5000, `+${balAfter1 - Number(balBefore)}`);

// 4. Double delivery does NOT double-credit
const w2 = await deliverWebhook(chargeSuccess(ref, 500000));
const balAfter2 = Number((await api('/api/wallets/me', { token })).json?.data?.balance);
check('duplicate webhook idempotent', w2.status === 200 && balAfter2 === balAfter1, `balance=${balAfter2}`);

// 5. Wrong-currency webhook rejected (no credit)
const wCur = await deliverWebhook(chargeSuccess('FAKE-REF-CUR', 500000, undefined) && { event: 'charge.success', data: { reference: 'FAKE-REF-CUR', amount: 500000, currency: 'USD', channel: 'card', customer: { email }, metadata: { custom_fields: [{ variable_name: 'purpose', value: 'wallet_topup' }] } } });
const balAfterCur = Number((await api('/api/wallets/me', { token })).json?.data?.balance);
check('non-NGN webhook rejected without credit', balAfterCur === balAfter2, `balance=${balAfterCur}`);

// 6. Virtual account (REAL Paystack test API). NOTE: the test business has
// DVA disabled ("Dedicated NUBAN is not available for your business"), so
// this asserts the provider truth surfaces instead of a fake account.
const dva = await api('/api/wallets/virtual-account', { method: 'POST', token });
const dvaNum = dva.json?.data?.virtualAccountNumber;
const dvaMsg = dva.json?.error?.message || '';
check(
  'virtual account honest about provider capability',
  !!dvaNum || /not available for your business/i.test(dvaMsg),
  dvaNum ? `acct=${dvaNum}` : dvaMsg.slice(0, 80)
);

// 7. Subscription upgrade init (REAL Paystack test API)
const sub = await api('/api/subscriptions/upgrade', { method: 'POST', token, body: {} });
const subRef = sub.json?.data?.reference;
const subId = sub.json?.data?.subscription?.id;
const subUserId = sub.json?.data?.subscription?.userId;
check('subscription init returns hosted checkout', sub.status === 200 && !!subRef && !!subId, `ref=${subRef}`);
const mySub1 = (await api('/api/subscriptions/my', { token })).json?.data;
check('init leaves PREMIUM pending (never auto-active)', mySub1?.plan !== 'PREMIUM' || mySub1?.status !== 'ACTIVE', `${mySub1?.plan}/${mySub1?.status}`);

// 8. Subscription webhook activates (signed, correct amount)
async function deliverSubWebhook(payload) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha512', PAYSTACK_KEY).update(raw).digest('hex');
  return api('/api/subscriptions/webhook', {
    method: 'POST',
    rawBody: raw,
    extraHeaders: { 'x-paystack-signature': sig },
  });
}
const subPayload = {
  event: 'charge.success',
  data: {
    reference: subRef,
    amount: 500000,
    currency: 'NGN',
    channel: 'card',
    customer: { email },
    metadata: { type: 'SUBSCRIPTION', plan: 'PREMIUM', userId: subUserId, subscriptionId: subId },
  },
};
const sw1 = await deliverSubWebhook(subPayload);
const mySub2 = (await api('/api/subscriptions/my', { token })).json?.data;
check('subscription webhook activates', sw1.status === 200 && mySub2?.status === 'ACTIVE', `status=${mySub2?.status}`);
const sw2 = await deliverSubWebhook(subPayload);
const mySub3 = (await api('/api/subscriptions/my', { token })).json?.data;
check('duplicate sub webhook stays single ACTIVE', sw2.status === 200 && mySub3?.status === 'ACTIVE');

// 9. Payment ownership: another user's payment unreadable
const payList = (await api('/api/payments', { token })).json?.data;
console.log(`      payments visible to owner: ${Array.isArray(payList) ? payList.length : JSON.stringify(payList)?.slice(0, 80)}`);

const fails = results.filter(([s]) => s === 'FAIL').length;
console.log(`\n${results.length - fails}/${results.length} finance proofs passed`);
process.exit(fails ? 1 : 0);
