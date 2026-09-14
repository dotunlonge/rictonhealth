/**
 * Shared Paystack webhook helper: raw-body verification + timing-safe compare.
 * Run: npx jest packages/shared/tests/webhooks.test.ts
 */
import crypto from 'crypto';
import { getRawBodyString, parseWebhookBody, verifyPaystackSignature } from '../src/webhooks';

describe('paystack webhook helper', () => {
  const secret = 'test-paystack-secret-32-chars-minimum!!';
  const raw = JSON.stringify({ event: 'charge.success', data: { reference: 'r1', amount: 5000 } });
  const sig = crypto.createHmac('sha512', secret).update(raw).digest('hex');

  it('verifies a valid raw-body signature', () => {
    expect(verifyPaystackSignature(raw, sig, secret)).toBe(true);
    expect(verifyPaystackSignature(Buffer.from(raw), sig, secret)).toBe(true);
  });

  it('rejects tampered bodies, missing or wrong signatures', () => {
    expect(verifyPaystackSignature(`${raw} `, sig, secret)).toBe(false);
    expect(verifyPaystackSignature(raw, 'deadbeef', secret)).toBe(false);
    expect(verifyPaystackSignature(raw, undefined, secret)).toBe(false);
  });

  it('preserves raw bytes (Buffer) instead of re-stringifying parsed JSON', () => {
    const buf = Buffer.from(raw);
    expect(getRawBodyString(buf)).toBe(raw);
    expect(parseWebhookBody<{ event: string }>(buf)).toMatchObject({ event: 'charge.success' });
    expect(parseWebhookBody<{ event: string }>(JSON.parse(raw))).toMatchObject({
      event: 'charge.success',
    });
  });
});
