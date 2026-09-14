import crypto from 'crypto';
import { timingSafeEqual } from './timing-safe-equal';

/**
 * Paystack signs the RAW request bytes (HMAC-SHA512 of the exact JSON payload).
 * Verifying against `JSON.stringify(req.body)` after `express.json()` can
 * produce false 401s (whitespace/key-order differences) and hides
 * canonicalization issues. Mount `express.raw({ type: 'application/json' })`
 * on webhook routes BEFORE `express.json()` and verify against the raw buffer.
 */

export function getRawBodyString(body: unknown): string {
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

export function parseWebhookBody<T = Record<string, unknown>>(body: unknown): T {
  if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8')) as T;
  return body as T;
}

export function verifyPaystackSignature(
  rawBody: string | Buffer,
  signatureHeader: unknown,
  secret: string
): boolean {
  if (typeof signatureHeader !== 'string' || signatureHeader.length === 0) return false;
  const raw = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
  const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
  return timingSafeEqual(hash, signatureHeader);
}
