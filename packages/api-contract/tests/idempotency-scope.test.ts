import { createIdempotencyScope } from '../src/index';

describe('createIdempotencyScope (TDD RED)', () => {
  it('returns a stable key for the same selection across retries', () => {
    const scope = createIdempotencyScope();
    const a = scope.keyFor('provider-1', '2026-10-01T09:00:00.000Z');
    const b = scope.keyFor('provider-1', '2026-10-01T09:00:00.000Z');
    expect(a).toBe(b);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(8);
  });

  it('returns different keys for different selections', () => {
    const scope = createIdempotencyScope();
    const a = scope.keyFor('provider-1', '2026-10-01T09:00:00.000Z');
    const b = scope.keyFor('provider-1', '2026-10-01T10:00:00.000Z');
    const c = scope.keyFor('provider-2', '2026-10-01T09:00:00.000Z');
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('issues a fresh key after reset (rebook after success/cancel)', () => {
    const scope = createIdempotencyScope();
    const a = scope.keyFor('provider-1', '2026-10-01T09:00:00.000Z');
    scope.reset('provider-1', '2026-10-01T09:00:00.000Z');
    const b = scope.keyFor('provider-1', '2026-10-01T09:00:00.000Z');
    expect(a).not.toBe(b);
  });

  it('keeps scopes independent', () => {
    const s1 = createIdempotencyScope();
    const s2 = createIdempotencyScope();
    expect(s1.keyFor('p', 's')).not.toBe(s2.keyFor('p', 's'));
  });
});
