/**
 * Typed deep-link targets for notification categories. Every target is
 * validated against the allowlist — unknown types render as static rows
 * instead of dead links.
 */

export const NOTIFICATION_TARGETS = [
  '/appointments',
  '/prescriptions',
  '/wallet',
  '/settings',
  '/inbox',
  '/telemedicine',
] as const;

export type NotificationTarget = (typeof NOTIFICATION_TARGETS)[number];

export function getNotificationTarget(type: string): NotificationTarget | null {
  const t = type?.toUpperCase() || '';
  if (t.includes('APPOINTMENT') || t.includes('CONSULTATION') || t.includes('TELEMEDICINE'))
    return '/appointments';
  if (t.includes('PRESCRIPTION') || t.includes('PHARMACY')) return '/prescriptions';
  if (
    t.includes('BILLING') ||
    t.includes('PAYMENT') ||
    t.includes('WALLET') ||
    t.includes('PAYOUT')
  )
    return '/wallet';
  if (t.includes('SECURITY') || t.includes('PASSWORD') || t.includes('2FA')) return '/settings';
  if (t.includes('MESSAGE') || t.includes('CONVERSATION')) return '/inbox';
  return null;
}
