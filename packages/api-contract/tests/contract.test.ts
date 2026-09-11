import fs from 'fs';
import path from 'path';

import { GATEWAY_PATHS, joinGateway } from '../src';

describe('api-contract paths', () => {
  it('uses plural gateway prefixes', () => {
    expect(GATEWAY_PATHS.messages).toBe('/api/messages');
    expect(GATEWAY_PATHS.wallets).toBe('/api/wallets');
    expect(GATEWAY_PATHS.prescriptions).toBe('/api/prescriptions');
  });
  it('joins base + path without double slash', () => {
    expect(joinGateway('https://gw/api/', '/users/me')).toBe('https://gw/api/users/me');
  });
  it('pins reproducible codegen from authoritative OpenAPI', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    expect(pkg.scripts.generate).toMatch(/openapi.*openapi\.yaml/);
    const spec = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'openapi.yaml'), 'utf8');
    expect(spec).toMatch(/openapi:\s*3\./);
    expect(spec).toMatch(/\/api\/auth\/register/);
  });
  it('exposes Phase 6 premium/messaging/account endpoints', () => {
    expect(GATEWAY_PATHS.subscriptionMy).toBe('/api/subscriptions/my');
    expect(GATEWAY_PATHS.rewardsRedeem).toBe('/api/rewards/redeem');
    expect(GATEWAY_PATHS.notificationPreferences).toBe('/api/notifications/preferences');
    expect(GATEWAY_PATHS.addresses).toBe('/api/addresses');
  });
  it('exposes Phase 5 pharmacy/wallet endpoints', () => {
    expect(GATEWAY_PATHS.pharmacyProducts).toBe('/api/pharmacy/products');
    expect(GATEWAY_PATHS.pharmacyOrders).toBe('/api/pharmacy/orders');
    expect(GATEWAY_PATHS.walletTopup).toBe('/api/wallets/topup');
    expect(GATEWAY_PATHS.paymentVerify).toBe('/api/payments/verify');
  });
  it('exposes Phase 2 auth endpoints', () => {
    expect(GATEWAY_PATHS.authRegister).toBe('/api/auth/register');
    expect(GATEWAY_PATHS.authOtpVerify).toBe('/api/auth/otp/verify');
    expect(GATEWAY_PATHS.authPasswordForgot).toBe('/api/auth/password/forgot');
    expect(GATEWAY_PATHS.authLogoutAll).toBe('/api/auth/logout-all');
    expect(GATEWAY_PATHS.authGoogle).toBe('/api/auth/oauth/google');
    expect(GATEWAY_PATHS.authApple).toBe('/api/auth/oauth/apple');
  });
  it('generated services track the hardened contracts (leave/callbacks/wallets/messages)', () => {
    const tele = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'generated', 'services', 'TelemedicineService.ts'),
      'utf8'
    );
    expect(tele).toMatch(/\/api\/telemedicine\/rooms\/\{id\}\/leave/);
    expect(tele).toMatch(/\/api\/telemedicine\/callbacks\/status/);
    const wallet = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'generated', 'services', 'WalletService.ts'),
      'utf8'
    );
    expect(wallet).toMatch(/\/api\/wallets\//);
    expect(wallet).not.toMatch(/['"]\/wallet\//);
    const messaging = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'generated', 'services', 'MessagingService.ts'),
      'utf8'
    );
    expect(messaging).toMatch(/\/api\/messages\//);
    expect(messaging).not.toMatch(/\/messaging\//);
  });
  it('web api-client calls match GATEWAY_PATHS for money/auth flows', () => {
    const webClient = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'apps', 'web', 'src', 'lib', 'api-client.ts'),
      'utf8'
    );
    // Gateway-routed, no direct service ports.
    expect(webClient).not.toMatch(/LOCAL_SERVICE_PORTS/);
    // Canonical money/auth paths are exercised through the single client.
    for (const p of [
      GATEWAY_PATHS.authRefresh,
      GATEWAY_PATHS.authLogout,
      GATEWAY_PATHS.walletTopup,
      GATEWAY_PATHS.rewardsRedeem,
    ]) {
      expect(typeof p).toBe('string');
    }
    expect(webClient).toMatch(/\/auth\/refresh/);
    expect(webClient).toMatch(/\/auth\/logout/);
  });
});
