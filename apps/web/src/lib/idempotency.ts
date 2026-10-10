/**
 * Idempotency keys for money-mutating calls (booking, ordering).
 *
 * - Keys come from crypto.randomUUID() with a getRandomValues() fallback.
 *   Math.random() is NEVER a key source: weak/colliding keys break
 *   exactly-once on retry and enable double-charge/double-book.
 * - createKeyScope() returns stable keys per intent: retries of the same
 *   selection replay against the original request; reset() after
 *   success/cancel so a later identical selection is a new intent.
 */
export function newIdempotencyKey(): string {
  const c = globalThis.crypto as
    | (Crypto & { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => void })
    | undefined;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error('Secure randomness unavailable — refusing to mint an idempotency key');
}

export function createKeyScope(): {
  keyFor: (...parts: string[]) => string;
  reset: (...parts: string[]) => void;
  clear: () => void;
} {
  const cache = new Map<string, string>();
  const cacheKey = (parts: string[]) => parts.join('|');
  return {
    keyFor(...parts: string[]): string {
      const k = cacheKey(parts);
      let existing = cache.get(k);
      if (!existing) {
        existing = newIdempotencyKey();
        cache.set(k, existing);
      }
      return existing;
    },
    reset(...parts: string[]): void {
      cache.delete(cacheKey(parts));
    },
    clear(): void {
      cache.clear();
    },
  };
}
