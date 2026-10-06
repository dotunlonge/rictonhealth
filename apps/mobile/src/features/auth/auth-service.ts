import { GATEWAY_PATHS } from '@ricton/api-contract';

import { apiClient, ApiClient, ApiClientError } from '@/lib/api/client';
import { tokenStorage, type TokenStorageContract } from '@/lib/auth/token-storage';

import type {
  MobileUser,
  OtpVerifyInput,
  RegisterInput,
  RegisterResult,
  SignInInput,
  SignInResult,
} from './types';

interface LoginResponse {
  token?: string;
  refreshToken?: string;
  requires2FA?: boolean;
  email?: string;
  user?: MobileUser;
}

export class UnsupportedMobileRoleError extends Error {
  constructor() {
    super('This mobile release is currently for patients. Please use the Ricton web portal.');
    this.name = 'UnsupportedMobileRoleError';
  }
}

/** Base URL already ends with `/api`, so strip the canonical `/api` prefix. */
function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

export class AuthService {
  constructor(
    private readonly api: ApiClient = apiClient,
    private readonly storage: TokenStorageContract = tokenStorage
  ) {}

  async signIn(input: SignInInput): Promise<SignInResult> {
    const rawIdentifier = (input.email ?? input.phone ?? '').trim();
    const isEmail = rawIdentifier.includes('@');
    const identifierPayload = isEmail
      ? { email: rawIdentifier.toLowerCase() }
      : { phone: rawIdentifier };
    const response = await this.api.post<LoginResponse>(
      rel(GATEWAY_PATHS.authLogin),
      {
        ...identifierPayload,
        password: input.password,
        ...(input.totpCode ? { totpCode: input.totpCode } : {}),
        rememberMe: true,
      },
      { authenticated: false }
    );

    if (response.requires2FA) {
      return {
        kind: 'two-factor-required',
        email: response.email ?? rawIdentifier.toLowerCase(),
      };
    }

    if (!response.token || !response.refreshToken || !response.user) {
      throw new ApiClientError(
        'The sign-in response was incomplete.',
        'INVALID_SESSION_RESPONSE',
        502
      );
    }

    if (response.user.role !== 'PATIENT') {
      await this.storage.clearTokens();
      throw new UnsupportedMobileRoleError();
    }

    await this.storage.setTokens({
      accessToken: response.token,
      refreshToken: response.refreshToken,
    });

    return { kind: 'authenticated', user: response.user };
  }

  async signInWithProvider(
    provider: 'GOOGLE' | 'APPLE',
    idToken: string,
    totpCode?: string
  ): Promise<SignInResult> {
    const path = provider === 'GOOGLE' ? GATEWAY_PATHS.authGoogle : GATEWAY_PATHS.authApple;
    const response = await this.api.post<LoginResponse>(
      rel(path),
      { token: idToken, role: 'PATIENT', ...(totpCode ? { totpCode } : {}) },
      { authenticated: false }
    );

    if (response.requires2FA) {
      return { kind: 'two-factor-required', email: response.email ?? '' };
    }
    if (!response.token || !response.refreshToken || !response.user) {
      throw new ApiClientError(
        'The sign-in response was incomplete.',
        'INVALID_SESSION_RESPONSE',
        502
      );
    }
    if (response.user.role !== 'PATIENT') {
      await this.storage.clearTokens();
      throw new UnsupportedMobileRoleError();
    }
    await this.storage.setTokens({
      accessToken: response.token,
      refreshToken: response.refreshToken,
    });
    return { kind: 'authenticated', user: response.user };
  }

  async restoreSession(): Promise<MobileUser | null> {
    const tokens = await this.storage.getTokens();
    if (!tokens) return null;

    const user = await this.api.get<MobileUser>(rel(GATEWAY_PATHS.usersMe));
    if (user.role !== 'PATIENT') {
      await this.storage.clearTokens();
      throw new UnsupportedMobileRoleError();
    }
    return user;
  }

  async signOut(options?: { pushToken?: string }): Promise<void> {
    const tokens = await this.storage.getTokens();
    try {
      // Best-effort: revoke the device push token (#112 orphan) so a
      // logged-out device stops receiving pushes. Unknown/absent tokens
      // are no-ops server-side; failures never block logout.
      const pushToken = options?.pushToken?.trim();
      if (pushToken) {
        try {
          await this.api.delete(
            `${rel(GATEWAY_PATHS.notificationPushToken)}/${encodeURIComponent(pushToken)}`
          );
        } catch {
          // ignore — logout must succeed regardless
        }
      }
      if (tokens?.refreshToken) {
        await this.api.post(
          rel(GATEWAY_PATHS.authLogout),
          { refreshToken: tokens.refreshToken },
          { authenticated: false }
        );
      }
    } finally {
      await this.storage.clearTokens();
    }
  }

  async logoutAll(): Promise<void> {
    const tokens = await this.storage.getTokens();
    try {
      await this.api.post(
        rel(GATEWAY_PATHS.authLogoutAll),
        tokens?.refreshToken ? { refreshToken: tokens.refreshToken } : {},
        { authenticated: true }
      );
    } finally {
      await this.storage.clearTokens();
    }
  }

  async register(input: RegisterInput): Promise<RegisterResult> {
    const response = await this.api.post<{
      token?: string;
      refreshToken?: string;
      requiresVerification?: boolean;
      email?: string;
      user?: MobileUser;
    }>(
      rel(GATEWAY_PATHS.authRegister),
      {
        email: input.email.trim().toLowerCase(),
        password: input.password,
        ...(input.firstName ? { firstName: input.firstName } : {}),
        ...(input.lastName ? { lastName: input.lastName } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        role: input.role ?? 'PATIENT',
        consentVersion: input.consentVersion ?? '1.0',
      },
      { authenticated: false }
    );

    if (response.requiresVerification || !response.token) {
      await this.resendOtp(response.email ?? input.email);
      return {
        kind: 'verification-required',
        email: response.email ?? input.email.trim().toLowerCase(),
      };
    }
    if (!response.refreshToken || !response.user) {
      throw new ApiClientError(
        'The registration response was incomplete.',
        'INVALID_SESSION_RESPONSE',
        502
      );
    }
    if (response.user.role !== 'PATIENT') {
      await this.storage.clearTokens();
      throw new UnsupportedMobileRoleError();
    }
    await this.storage.setTokens({
      accessToken: response.token,
      refreshToken: response.refreshToken,
    });
    return { kind: 'authenticated', user: response.user };
  }

  async verifyOtp(input: OtpVerifyInput): Promise<SignInResult> {
    const response = await this.api.post<LoginResponse>(
      rel(GATEWAY_PATHS.authVerifyConfirm),
      { email: input.email.trim().toLowerCase(), otp: input.code.trim() },
      { authenticated: false }
    );
    if (!response.token || !response.refreshToken || !response.user) {
      throw new ApiClientError(
        'The verification response was incomplete.',
        'INVALID_SESSION_RESPONSE',
        502
      );
    }
    if (response.user.role !== 'PATIENT') {
      await this.storage.clearTokens();
      throw new UnsupportedMobileRoleError();
    }
    await this.storage.setTokens({
      accessToken: response.token,
      refreshToken: response.refreshToken,
    });
    return { kind: 'authenticated', user: response.user };
  }

  async resendOtp(email: string): Promise<void> {
    await this.api.post(
      rel(GATEWAY_PATHS.authVerifyEmail),
      { email: email.trim().toLowerCase() },
      { authenticated: false }
    );
  }

  async requestPasswordReset(input: { email: string }): Promise<{ ok: true }> {
    await this.api.post(
      rel(GATEWAY_PATHS.authPasswordForgot),
      { email: input.email.trim().toLowerCase() },
      { authenticated: false }
    );
    return { ok: true as const };
  }

  async confirmPasswordReset(input: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<void> {
    await this.api.post(
      rel(GATEWAY_PATHS.authPasswordReset),
      {
        email: input.email.trim().toLowerCase(),
        otp: input.otp.trim(),
        newPassword: input.newPassword,
      },
      { authenticated: false }
    );
  }
}

export const authService = new AuthService();
