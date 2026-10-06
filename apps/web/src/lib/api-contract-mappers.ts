type UnknownRecord = Record<string, unknown>;

export interface ProviderSummary {
  id: string;
  profileId: string;
  name: string;
  specialty: string;
  rating: number;
  yearsExperience: number;
  avatarUrl?: string;
  isVerified: boolean;
  distanceKm?: number;
  practiceAddress?: string;
  practiceCity?: string;
  practiceState?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProviderDetail extends ProviderSummary {
  bio?: string;
  status?: string;
  email?: string;
  licenseNumber?: string;
  consultationFee?: number;
  hospitalName?: string;
}

export interface SubscriptionPlanView {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
}

const record = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * Numeric coercion that preserves nullish/empty values as null instead of
 * masking them as 0 (e.g. an unset Prisma Decimal fee must not read as "free").
 * String decimals ("4.75", "15000.00") coerce via Number. Callers that require
 * a non-null number coalesce explicitly (`numberValue(x) ?? 0`).
 */
const numberValue = (value: unknown, fallback: number | null = 0): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function mapProviderSummary(value: unknown): ProviderSummary {
  const provider = record(value);
  const profileId = stringValue(provider.id) || '';
  const userId = stringValue(provider.userId) || profileId;
  const firstName = stringValue(provider.firstName) || 'Unknown';
  const lastName = stringValue(provider.lastName) || 'Provider';
  const title = stringValue(provider.title) || 'Dr.';

  return {
    id: userId,
    profileId,
    name: `${title} ${firstName} ${lastName}`.replace(/\s+/g, ' ').trim(),
    specialty: stringValue(provider.specialty) || 'General Practice',
    rating: numberValue(provider.rating) ?? 0,
    yearsExperience: numberValue(provider.yearsExperience) ?? 0,
    ...(stringValue(provider.avatarUrl) ? { avatarUrl: stringValue(provider.avatarUrl) } : {}),
    isVerified: provider.isVerified === true,
    ...(numberValue(provider.distanceKm, null) !== null
      ? { distanceKm: numberValue(provider.distanceKm)! }
      : {}),
    ...(stringValue(provider.practiceAddress)
      ? { practiceAddress: stringValue(provider.practiceAddress) }
      : {}),
    ...(stringValue(provider.practiceCity)
      ? { practiceCity: stringValue(provider.practiceCity) }
      : {}),
    ...(stringValue(provider.practiceState)
      ? { practiceState: stringValue(provider.practiceState) }
      : {}),
    ...(numberValue(provider.practiceLatitude, null) !== null
      ? { latitude: numberValue(provider.practiceLatitude)! }
      : {}),
    ...(numberValue(provider.practiceLongitude, null) !== null
      ? { longitude: numberValue(provider.practiceLongitude)! }
      : {}),
  };
}

export function mapProviderDetail(value: unknown): ProviderDetail {
  const provider = record(value);
  const user = record(provider.user);
  const hospital = record(provider.hospital);
  const summary = mapProviderSummary(provider);

  return {
    ...summary,
    ...(stringValue(provider.bio) ? { bio: stringValue(provider.bio) } : {}),
    ...(stringValue(user.status) ? { status: stringValue(user.status) } : {}),
    ...(stringValue(user.email) ? { email: stringValue(user.email) } : {}),
    ...(stringValue(provider.licenseNumber)
      ? { licenseNumber: stringValue(provider.licenseNumber) }
      : {}),
    ...(provider.consultationFee !== null && provider.consultationFee !== undefined
      ? { consultationFee: numberValue(provider.consultationFee) ?? 0 }
      : {}),
    ...(stringValue(hospital.name) ? { hospitalName: stringValue(hospital.name) } : {}),
  };
}

export function mapSubscriptionPlan(value: unknown): SubscriptionPlanView {
  const plan = record(value);
  // C5: the Prisma Subscription model carries plan/expiresAt only — there is
  // no billingPeriod column. Plans come from the static /plans list (which
  // does send billingPeriod) while history items carry plan/expiresAt, so
  // default to 'monthly' instead of reading a missing field as ''.
  return {
    id: stringValue(plan.id) || stringValue(plan.code) || '',
    name: stringValue(plan.name) || stringValue(plan.code) || 'Unknown',
    price: numberValue(plan.price) ?? 0,
    currency: stringValue(plan.currency) || 'NGN',
    interval: stringValue(plan.billingPeriod) || stringValue(plan.interval) || 'monthly',
    features: Array.isArray(plan.features)
      ? plan.features.filter((feature): feature is string => typeof feature === 'string')
      : [],
  };
}

export function unwrapSubscriptionHistory(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const envelope = record(value);
  return Array.isArray(envelope.subscriptions) ? envelope.subscriptions : [];
}

export function getSubscriptionCheckoutUrl(value: unknown): string | null {
  // C5: upgrade responses send paymentUrl; the Prisma Subscription model has
  // no payment URL field (plan/expiresAt only), so absent => undefined/null
  // (no checkout). Also accept authorization_url/authorizationUrl aliases.
  const rec = record(value);
  return (
    stringValue(rec.paymentUrl) ||
    stringValue(rec.authorizationUrl) ||
    stringValue(rec.authorization_url) ||
    null
  );
}

/**
 * Shared NGN money formatting for consultation fees and other naira amounts.
 * - null/undefined/''/non-numeric → 'Contact provider'
 * - 0 (or negative) → 'Invalid' (a fee must be a positive amount)
 */
export function formatNGN(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Contact provider';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 'Contact provider';
  if (n <= 0) return 'Invalid';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}
