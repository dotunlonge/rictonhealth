export type UserRole = 'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN' | 'SUPER_ADMIN';

export interface MobileUser {
  id: string;
  email: string | null;
  phone?: string | null;
  role: UserRole;
  status: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

export interface SignInInput {
  email?: string;
  phone?: string;
  password: string;
  totpCode?: string;
}

export type SignInResult =
  | { kind: 'authenticated'; user: MobileUser }
  | { kind: 'two-factor-required'; email: string };

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'PATIENT' | 'CONSULTANT' | 'PHARMACIST';
  consentVersion?: string;
}

export type RegisterResult =
  | { kind: 'authenticated'; user: MobileUser }
  | { kind: 'verification-required'; email: string };

export interface OtpVerifyInput {
  email: string;
  code: string;
}
