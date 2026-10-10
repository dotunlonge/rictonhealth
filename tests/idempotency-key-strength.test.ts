/**
 * Idempotency key strength (TDD RED → GREEN).
 * Money-mutating web calls must use secure-random, stable-per-intent keys:
 * no Math.random fallbacks, and retries of the same intent must reuse the
 * key (fresh-key-per-tap defeats exactly-once).
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

// Comments document the ban; only code counts.
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('idempotency key strength', () => {
  it('provides a shared helper with no Math.random source', () => {
    const helper = code(read('apps/web/src/lib/idempotency.ts'));
    expect(helper).toMatch(/randomUUID/);
    expect(helper).toMatch(/getRandomValues/);
    expect(helper).not.toMatch(/Math\.random/);
    expect(helper).toMatch(/keyFor/);
    expect(helper).toMatch(/reset/);
  });

  it('booking + ordering use the shared scope (no local Math.random)', () => {
    for (const p of [
      'apps/web/src/app/appointments/page.tsx',
      'apps/web/src/app/pharmacy/page.tsx',
    ]) {
      const src = code(read(p));
      expect(src).not.toMatch(/Math\.random/);
      expect(src).toMatch(/createKeyScope|idempotency/);
    }
  });
});
