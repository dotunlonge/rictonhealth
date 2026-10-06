/** @ricton/api-contract — authoritative gateway path constants (TDD RED→GREEN seed). */
export const GATEWAY_PATHS = {
  version: '/api/version',
  messages: '/api/messages',
  wallets: '/api/wallets',
  appointments: '/api/appointments',
  prescriptions: '/api/prescriptions',
  usersMe: '/api/users/me',
  patientDashboard: '/api/users/dashboard/patient',
  authLogin: '/api/auth/login',
  authRefresh: '/api/auth/refresh',
  authLogout: '/api/auth/logout',
  authLogoutAll: '/api/auth/logout-all',
  authRegister: '/api/auth/register',
  authOtpSend: '/api/auth/otp/send',
  authOtpVerify: '/api/auth/otp/verify',
  authVerifyEmail: '/api/auth/verify-email',
  authVerifyConfirm: '/api/auth/verify/confirm',
  authPasswordForgot: '/api/auth/password/forgot',
  authPasswordReset: '/api/auth/password/reset',
  authGoogle: '/api/auth/oauth/google',
  authApple: '/api/auth/oauth/apple',
  auth2faStatus: '/api/auth/2fa/status',
  auth2faEnable: '/api/auth/2fa/enable',
  auth2faVerify: '/api/auth/2fa/verify',
  auth2faDisable: '/api/auth/2fa/disable',
  providers: '/api/users/providers',
  providerSlots: '/api/appointments/slots',
  prescriptionDetail: '/api/prescriptions',
  pharmacyProducts: '/api/pharmacy/products',
  pharmacyDirectory: '/api/pharmacy/pharmacies',
  pharmacyOrders: '/api/pharmacy/orders',
  walletMe: '/api/wallets/me',
  walletTopup: '/api/wallets/topup',
  walletTransactions: '/api/wallets/transactions',
  walletVirtualAccount: '/api/wallets/virtual-account',
  paymentInitialize: '/api/payments/initialize',
  paymentWalletAppointment: '/api/payments/appointments',
  paymentVerify: '/api/payments/verify',
  teleRooms: '/api/telemedicine/rooms',
  subscriptionPlans: '/api/subscriptions/plans',
  subscriptionMy: '/api/subscriptions/my',
  subscriptionUpgrade: '/api/subscriptions/upgrade',
  subscriptionCancel: '/api/subscriptions/cancel',
  rewardsBalance: '/api/rewards/balance',
  rewardsCatalog: '/api/rewards/catalog',
  rewardsRedeem: '/api/rewards/redeem',
  notifications: '/api/notifications',
  notificationPreferences: '/api/notifications/preferences',
  notificationPushToken: '/api/notifications/push-token',
  addresses: '/api/addresses',
  authPasswordChange: '/api/auth/password/change',
  smartguardStatus: '/api/smartguard/status',
  smartguardAlerts: '/api/smartguard/alerts',
  smartguardMetrics: '/api/smartguard/metrics',
  smartguardThreats: '/api/smartguard/threats',
  smartguardAuditLog: '/api/smartguard/audit-log',
} as const;

export type GatewayPath = (typeof GATEWAY_PATHS)[keyof typeof GATEWAY_PATHS];

export function joinGateway(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/** Per-room telemedicine paths (room id is part of the path, not a literal). */
export function teleRoomTokenPath(roomId: string): string {
  return `${GATEWAY_PATHS.teleRooms}/${roomId}/token`;
}

export function teleRoomJoinPath(roomId: string): string {
  return `${GATEWAY_PATHS.teleRooms}/${roomId}/join`;
}

export function teleRoomLeavePath(roomId: string): string {
  return `${GATEWAY_PATHS.teleRooms}/${roomId}/leave`;
}

/** Smartguard SecOps actions (alert/threat id is part of the path, not a literal). */
export function smartguardAlertAcknowledgePath(alertId: string): string {
  return `${GATEWAY_PATHS.smartguardAlerts}/${alertId}/acknowledge`;
}

export function smartguardThreatMitigatePath(threatId: string): string {
  return `${GATEWAY_PATHS.smartguardThreats}/${threatId}/mitigate`;
}

/**
 * Stable idempotency-key scope for write flows (booking, checkout, …).
 *
 * Generates one random key per selection and returns the SAME key on retry,
 * so a timeout/double-tap replays against the original request instead of
 * creating a duplicate. Call `reset()` after success/cancel so a later
 * rebook of the same slot is a new intent with a fresh key.
 */
export interface IdempotencyScope {
  keyFor(...parts: string[]): string;
  reset(...parts: string[]): void;
  clear(): void;
}

function randomKey(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // fall through to Math.random below
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

export function createIdempotencyScope(): IdempotencyScope {
  const cache = new Map<string, string>();
  const id = randomKey();
  const cacheKey = (parts: string[]) => `${id}::${parts.join('|')}`;
  return {
    keyFor(...parts: string[]): string {
      const k = cacheKey(parts);
      let existing = cache.get(k);
      if (!existing) {
        existing = randomKey();
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
