/**
 * Role homes + onboarding completion (single source of truth).
 *
 * Returning staff must land in their workspace — not back in onboarding.
 * A staff profile counts as onboarded when the record their onboarding flow
 * actually persists exists:
 * - CONSULTANT: providerProfile with a license number (registration only
 *   pre-fills names + a default specialty, so specialty alone proves nothing)
 * - PHARMACIST: pharmacyProfile with a pharmacy name
 * - HOSPITAL_ADMIN: a linked hospital record
 */
export type StaffRole = 'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';

export function homeForRole(role: StaffRole | string | undefined | null): string {
  if (role === 'SUPER_ADMIN') return '/admin';
  if (role === 'HOSPITAL_ADMIN') return '/dashboard/hospital';
  if (role === 'PHARMACIST') return '/dashboard/pharmacy';
  return '/dashboard';
}

export function onboardingForRole(role: StaffRole | string | undefined | null): string {
  if (role === 'HOSPITAL_ADMIN') return '/onboarding/hospital';
  if (role === 'CONSULTANT') return '/onboarding/doctor';
  if (role === 'PHARMACIST') return '/onboarding/pharmacy';
  return '/dashboard';
}

interface ProfileLike {
  role?: string | null;
  providerProfile?: {
    specialty?: string | null;
    specialization?: string | null;
    licenseNumber?: string | null;
  } | null;
  pharmacyProfile?: { pharmacyName?: string | null } | null;
  hospital?: unknown;
  hospitalId?: string | null;
}

/** Null = onboarded (or a role with no onboarding); otherwise the setup path. */
export function pendingOnboarding(user: ProfileLike | null | undefined): string | null {
  if (!user) return null;
  if (user.role === 'CONSULTANT') {
    return user.providerProfile?.licenseNumber ? null : '/onboarding/doctor';
  }
  if (user.role === 'PHARMACIST') {
    return user.pharmacyProfile?.pharmacyName ? null : '/onboarding/pharmacy';
  }
  if (user.role === 'HOSPITAL_ADMIN') {
    return user.hospital || user.hospitalId ? null : '/onboarding/hospital';
  }
  return null;
}

/** Post-auth landing: setup only when actually incomplete, else the role home. */
export function landingForUser(user: ProfileLike | null | undefined): string {
  return pendingOnboarding(user) || homeForRole(user?.role);
}
