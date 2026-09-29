/**
 * Typed deep-link targets for notification categories. Every target is
 * validated against the allowlist — unknown types render as static rows
 * instead of dead links.
 */

export const NOTIFICATION_TARGETS = [
  '/appointments',
  '/pharmacy',
  '/prescriptions',
  '/wallet',
  '/settings',
  '/notifications',
  '/inbox',
  '/telemedicine',
] as const;

export type NotificationTarget = (typeof NOTIFICATION_TARGETS)[number];

export function getNotificationTarget(type: string): NotificationTarget | null {
  const t = type?.toUpperCase() || '';
  if (t.includes('APPOINTMENT') || t.includes('CONSULTATION') || t.includes('TELEMEDICINE'))
    return '/appointments';
  if (t.includes('PHARMACY')) return '/pharmacy';
  if (t.includes('PRESCRIPTION')) return '/prescriptions';
  if (
    t.includes('BILLING') ||
    t.includes('PAYMENT') ||
    t.includes('WALLET') ||
    t.includes('PAYOUT')
  )
    return '/wallet';
  if (t.includes('SECURITY') || t.includes('PASSWORD') || t.includes('2FA')) return '/settings';
  if (t.includes('MESSAGE') || t.includes('CONVERSATION')) return '/inbox';
  // Fallback to the notifications inbox for unknown types (never a dead row).
  return '/notifications';
}
