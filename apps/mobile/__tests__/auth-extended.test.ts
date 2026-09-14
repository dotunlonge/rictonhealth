/** Phase 2 TDD RED: registration, OTP, password recovery, provider, logout-all. */
import fs from 'fs';
import path from 'path';
import { AuthService } from '@/features/auth/auth-service';
import type { ApiClient } from '@/lib/api/client';
import type { TokenStorageContract } from '@/lib/auth/token-storage';

function deps() {
  return {
    api: { post: jest.fn(), get: jest.fn() } as unknown as ApiClient,
    storage: {
      getTokens: jest.fn(),
      setTokens: jest.fn(),
      clearTokens: jest.fn(),
    } as jest.Mocked<TokenStorageContract>,
  };
}

describe('AuthService provider sign-in (B8)', () => {
  it('exchanges a Google ID token for a patient session', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({
      token: 'a',
      refreshToken: 'r',
      user: { id: 'p1', email: 'n@example.com', role: 'PATIENT', status: 'ACTIVE' },
    });
    const s = new AuthService(d.api, d.storage);
    await expect(s.signInWithProvider('GOOGLE', 'google-id-token')).resolves.toMatchObject({
      kind: 'authenticated',
    });
    expect(d.api.post).toHaveBeenCalledWith(
      expect.stringContaining('/oauth/google'),
      expect.objectContaining({ token: 'google-id-token', role: 'PATIENT' }),
      expect.anything()
    );
    expect(d.storage.setTokens).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' });
  });

  it('rejects professional accounts from Apple sign-in', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({
      token: 'a',
      refreshToken: 'r',
      user: { id: 'd1', email: 'd@example.com', role: 'CONSULTANT', status: 'ACTIVE' },
    });
    const s = new AuthService(d.api, d.storage);
    await expect(s.signInWithProvider('APPLE', 'apple-token')).rejects.toMatchObject({
      name: 'UnsupportedMobileRoleError',
    });
  });
});

describe('AuthService extended (Phase 2)', () => {
  it('registers a patient without persisting until verified', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({
      requiresVerification: true,
      email: 'n@example.com',
    });
    const s = new AuthService(d.api, d.storage);
    await expect(
      s.register({ email: 'n@example.com', password: 'StrongPass123!', firstName: 'Ada' })
    ).resolves.toMatchObject({ kind: 'verification-required' });
    expect(d.api.post).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({ consentVersion: '1.0', role: 'PATIENT' }),
      expect.anything()
    );
    expect(d.api.post).toHaveBeenCalledWith(
      '/auth/verify-email',
      { email: 'n@example.com' },
      { authenticated: false }
    );
    expect(d.storage.setTokens).not.toHaveBeenCalled();
  });

  it('verifies OTP and persists patient session', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({
      token: 'a',
      refreshToken: 'r',
      user: { id: 'p1', email: 'n@example.com', role: 'PATIENT', status: 'ACTIVE' },
    });
    const s = new AuthService(d.api, d.storage);
    await expect(s.verifyOtp({ email: 'n@example.com', code: '123456' })).resolves.toMatchObject({
      kind: 'authenticated',
    });
    expect(d.api.post).toHaveBeenCalledWith(
      '/auth/verify/confirm',
      { email: 'n@example.com', otp: '123456' },
      expect.anything()
    );
    expect(d.storage.setTokens).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' });
  });

  it('confirms password reset with the email, OTP, and new password contract', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({ ok: true });
    const s = new AuthService(d.api, d.storage);
    await s.confirmPasswordReset({
      email: 'n@example.com',
      otp: '123456',
      newPassword: 'NewStrongPass123!',
    });
    expect(d.api.post).toHaveBeenCalledWith(
      '/auth/password/reset',
      {
        email: 'n@example.com',
        otp: '123456',
        newPassword: 'NewStrongPass123!',
      },
      { authenticated: false }
    );
  });

  it('requests password reset without leaking existence', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({ ok: true });
    const s = new AuthService(d.api, d.storage);
    await expect(s.requestPasswordReset({ email: 'n@example.com' })).resolves.toEqual({ ok: true });
    expect(d.api.post).toHaveBeenCalledWith(
      '/auth/password/forgot',
      expect.anything(),
      expect.anything()
    );
  });

  it('revokes all sessions via logout-all and clears storage', async () => {
    const d = deps();
    d.storage.getTokens.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
    (d.api.post as jest.Mock).mockResolvedValue({ ok: true });
    const s = new AuthService(d.api, d.storage);
    await s.logoutAll();
    expect(d.api.post).toHaveBeenCalledWith(
      '/auth/logout-all',
      expect.anything(),
      expect.anything()
    );
    expect(d.storage.clearTokens).toHaveBeenCalled();
  });

  it('ships executable registration verification and password-reset screens', () => {
    const mobileRoot = path.resolve(__dirname, '..');
    const register = fs.readFileSync(path.join(mobileRoot, 'app/(auth)/register.tsx'), 'utf8');
    const forgot = fs.readFileSync(path.join(mobileRoot, 'app/(auth)/forgot.tsx'), 'utf8');
    expect(register).toMatch(/verifyOtp/);
    expect(register).toMatch(/auth\.register\.otp/);
    expect(forgot).toMatch(/confirmPasswordReset/);
    expect(forgot).toMatch(/auth\.forgot\.otp/);
    expect(forgot).not.toMatch(/reset link was sent/i);
  });
});
