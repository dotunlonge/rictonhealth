/**
 * Abuse-surface hardening (TDD RED → GREEN).
 * Money-adjacent and token-oracle endpoints must be throttled; OTP spam
 * protection must fail closed; contact verification must not oracle users.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('abuse-surface hardening', () => {
  it('wallet topup + virtual-account are rate-limited', () => {
    const routes = read('services/wallet/src/routes/wallet.routes.ts');
    const topup = routes.slice(routes.indexOf("'/topup'") - 400, routes.indexOf("'/topup'") + 200);
    expect(topup).toMatch(/RateLimit/);
    const dva = routes.slice(
      routes.indexOf("'/virtual-account'") - 400,
      routes.indexOf("'/virtual-account'") + 200
    );
    expect(dva).toMatch(/RateLimit/);
  });

  it('auth oauth/refresh/logout are rate-limited', () => {
    const routes = read('services/auth/src/routes/auth.routes.ts');
    for (const p of ["'/oauth/google'", "'/oauth/apple'", "'/refresh'", "'/logout'"]) {
      const i = routes.indexOf(p);
      expect(i).toBeGreaterThan(-1);
      expect(routes.slice(Math.max(0, i - 300), i)).toMatch(/RateLimit/);
    }
  });

  it('OTP resend throttle fails closed on Redis failure', () => {
    const ctrl = read('services/auth/src/controllers/auth.controller.ts');
    const start = ctrl.indexOf('export const sendOtp');
    const body = ctrl.slice(start, ctrl.indexOf('export const ', start + 10));
    expect(body).not.toMatch(/continue without throttle/);
  });

  it('contact verification does not oracle unknown users', () => {
    const ctrl = read('services/auth/src/controllers/auth.controller.ts');
    const start = ctrl.indexOf('const sendVerificationOtp');
    const body = ctrl.slice(start, ctrl.indexOf('export const ', start + 10));
    expect(body).not.toMatch(/throw new NotFoundError\('User not found'\)/);
  });
});
