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

const numberValue = (value: unknown, fallback = 0): number => {
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
    rating: numberValue(provider.rating),
    yearsExperience: numberValue(provider.yearsExperience),
    ...(stringValue(provider.avatarUrl) ? { avatarUrl: stringValue(provider.avatarUrl) } : {}),
    isVerified: provider.isVerified === true,
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
      ? { consultationFee: numberValue(provider.consultationFee) }
      : {}),
    ...(stringValue(hospital.name) ? { hospitalName: stringValue(hospital.name) } : {}),
  };
}

export function mapSubscriptionPlan(value: unknown): SubscriptionPlanView {
  const plan = record(value);
  return {
    id: stringValue(plan.id) || stringValue(plan.code) || '',
    name: stringValue(plan.name) || stringValue(plan.code) || 'Unknown',
    price: numberValue(plan.price),
    currency: stringValue(plan.currency) || 'NGN',
    interval: stringValue(plan.billingPeriod) || '',
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
  return stringValue(record(value).paymentUrl) || null;
}
