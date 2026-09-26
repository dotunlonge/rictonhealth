'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { homeForRole, landingForUser } from '@/lib/role-home';
import {
  triggerAppleAuth,
  loginWithGoogleToken,
  loginWithAppleToken,
  setPendingOAuthRoleSelection,
} from '@/lib/oauth';
import Navbar from '@/components/Navbar';
import { useAppStore } from '@/store/useAppStore';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import {
  AppleIcon,
  AuthCard,
  AuthDivider,
  AuthError,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthPrimaryButton,
  SocialButton,
} from '@/components/auth/auth-ui';

export default function LogInPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Google popup flow gets its own busy flag: sharing the form-wide flag
  // locked the entire page when the popup closed without a credential, and
  // showed "Signing in with Google…" during plain password submits.
  const [oauthBusy, setOauthBusy] = useState(false);
  const formBusy = isLoading || oauthBusy;
  const [errorMsg, setErrorMsg] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [oauthProvider, setOauthProvider] = useState<'GOOGLE' | 'APPLE' | null>(null);
  const [oauthToken, setOauthToken] = useState('');
  const user = useAppStore((state) => state.user);

  const canContinue = requires2FA
    ? totpCode.length === 6
    : email.trim().length > 0 && password.length > 0;

  const redirectAfterAuth = async (u: any) => {
    // Returning staff land in their workspace — onboarding only when their
    // profile record is actually missing (fresh profile from /users/me).
    let full = u;
    if (u?.role === 'CONSULTANT' || u?.role === 'PHARMACIST' || u?.role === 'HOSPITAL_ADMIN') {
      try {
        const fresh = await useAppStore.getState().fetchUser();
        if (fresh) full = fresh;
      } catch {
        // Fall through to the role-based default below.
      }
    }
    router.replace(landingForUser(full) ?? homeForRole(u?.role));
  };

  // Already signed in (restored session, or middleware-hinted cookie)? Skip
  // the form immediately and land on the correct dashboard for the role.
  useEffect(() => {
    const currentUser = useAppStore.getState().user;
    if (currentUser) {
      redirectAfterAuth(currentUser);
      return;
    }
    let cancelled = false;
    (async () => {
      const ok = await useAppStore.getState().restoreSession();
      if (cancelled || !ok) return;
      redirectAfterAuth(useAppStore.getState().user);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user) {
    return (
      <main className="bg-slate-50 min-h-screen w-full flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="bg-white p-8 sm:p-12 rounded-[32px] shadow-sm border border-slate-100 text-center max-w-md w-full space-y-4">
          <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Already Signed In
          </h2>
          <p className="text-sm font-medium text-slate-500">
            Redirecting to your healthcare dashboard…
          </p>
        </div>
      </main>
    );
  }

  const executeLoginWithCode = async (codeStr: string) => {
    if (codeStr.length !== 6 || isLoading) return;
    setIsLoading(true);
    setErrorMsg('');

    let res: any;
    if (oauthProvider === 'GOOGLE' && oauthToken) {
      res = await loginWithGoogleToken(oauthToken, 'PATIENT', codeStr);
    } else if (oauthProvider === 'APPLE' && oauthToken) {
      res = await loginWithAppleToken(oauthToken, 'PATIENT', codeStr);
    } else {
      res = await api.post('/auth/login', {
        email: email.includes('@') ? email : undefined,
        phone: !email.includes('@') ? email : undefined,
        password,
        totpCode: codeStr,
      });
    }

    setIsLoading(false);

    const accessToken = res.data?.token || res.data?.accessToken;
    if (res.success && accessToken) {
      api.setToken(accessToken, res.data?.refreshToken ?? null, res.data?.user?.role ?? null);
      if (res.data.user) {
        setUser(res.data.user);
      }
      redirectAfterAuth(res.data.user);
    } else {
      setErrorMsg(res.error?.message || '2FA verification failed. Please enter valid code.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue || formBusy) return;

    if (requires2FA) {
      await executeLoginWithCode(totpCode);
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const res = await api.post('/auth/login', {
      email: email.includes('@') ? email : undefined,
      phone: !email.includes('@') ? email : undefined,
      password,
    });

    setIsLoading(false);

    if (res.data?.requires2FA) {
      setRequires2FA(true);
      setOauthProvider(null);
      setOauthToken('');
      setErrorMsg(
        'Two-Factor Authentication (2FA) is enabled for your account. Enter the 6-digit code from your Authenticator app below.'
      );
      return;
    }

    const accessToken = res.data?.token || res.data?.accessToken;
    if (res.success && accessToken) {
      api.setToken(accessToken, res.data?.refreshToken ?? null, res.data?.user?.role ?? null);
      if (res.data.user) {
        setUser(res.data.user);
      }
      redirectAfterAuth(res.data.user);
    } else {
      setErrorMsg(res.error?.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setOauthBusy(true);
    setErrorMsg('');
    try {
      const res = await loginWithGoogleToken(credential);
      setOauthBusy(false);

      if (res.data?.requires2FA) {
        if (res.data.email) setEmail(res.data.email);
        setRequires2FA(true);
        setOauthProvider('GOOGLE');
        if (res.data.token) setOauthToken(res.data.token);
        setErrorMsg(
          'Two-Factor Authentication (2FA) is enabled for your Google account. Enter the 6-digit code from your Authenticator app below.'
        );
        return;
      }

      if (res.data?.requiresRoleSelection || res.data?.needsRoleSelection) {
        const providerToken = res.data.token || res.data.oauthToken;
        if (!providerToken) {
          setErrorMsg('Google did not return a valid account setup credential. Please try again.');
          return;
        }
        setPendingOAuthRoleSelection({
          email: res.data.email || '',
          provider: 'google',
          token: providerToken,
        });
        router.push('/oauth/select-role');
        return;
      }

      if (res.success && res.data?.token) {
        api.setToken(res.data.token, res.data?.refreshToken ?? null, res.data?.user?.role ?? null);
        if (res.data.user) {
          setUser(res.data.user);
        }
        redirectAfterAuth(res.data.user);
      } else {
        setErrorMsg(res.error?.message || 'Google Sign-In failed.');
      }
    } catch (err: unknown) {
      setOauthBusy(false);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Google Sign-In failed.');
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await triggerAppleAuth('');
      setIsLoading(false);

      if (res.data?.requires2FA) {
        if (res.data.email) setEmail(res.data.email);
        setRequires2FA(true);
        setOauthProvider('APPLE');
        if (res.data.token) setOauthToken(res.data.token);
        setErrorMsg(
          'Two-Factor Authentication (2FA) is enabled for your Apple account. Enter the 6-digit code from your Authenticator app below.'
        );
        return;
      }

      if (res.success && res.data?.requiresRoleSelection) {
        if (!res.data.token) {
          setErrorMsg('Apple did not return a valid account setup credential. Please try again.');
          return;
        }
        setPendingOAuthRoleSelection({
          email: res.data.email || '',
          provider: 'apple',
          token: res.data.token,
        });
        router.push('/oauth/select-role');
        return;
      }

      if (res.success && res.data?.token) {
        api.setToken(res.data.token, res.data?.refreshToken ?? null, res.data?.user?.role ?? null);
        if (res.data.user) {
          setUser(res.data.user);
        }
        await redirectAfterAuth(res.data.user);
      } else {
        setErrorMsg(res.error?.message || 'Apple Sign-In failed.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Apple Sign-In failed.');
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-slate-900 pb-16">
      <Navbar />

      <div className="px-4 sm:px-6 mt-8 sm:mt-12">
        <AuthCard labelledBy="login-heading">
          <AuthHeading id="login-heading" title="Your details" />

          {errorMsg && <AuthError message={errorMsg} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthField
              id="login-email"
              label="Email address or phone"
              value={email}
              onChange={setEmail}
              required
              autoComplete="username"
              inputMode="email"
            />
            <AuthField
              id="login-password"
              label="Password"
              value={password}
              onChange={setPassword}
              required={!requires2FA}
              autoComplete="current-password"
              secure
            />

            {requires2FA && (
              <div className="space-y-3 rounded-[20px] border border-blue-200 bg-blue-50/70 p-6">
                <label
                  htmlFor="login-totp"
                  className="block text-center text-xs font-bold tracking-wider text-slate-800 uppercase"
                >
                  2FA Authentication Code
                </label>
                <input
                  id="login-totp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTotpCode(val);
                    if (val.length === 6 && !isLoading) {
                      executeLoginWithCode(val);
                    }
                  }}
                  className="h-14 w-full rounded-2xl border border-blue-300 bg-white px-4 text-center font-mono text-xl font-extrabold tracking-widest text-slate-900 focus:ring-2 focus:ring-[#1c7bcf] focus:outline-none"
                />
                <p className="text-center text-xs font-semibold text-slate-500">
                  Open Google Authenticator or Authy to view your 6-digit code.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-4">
              <Link
                href="/forgot-password"
                className="text-[15px] font-semibold text-[#2f6fd6] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <AuthPrimaryButton disabled={!canContinue || formBusy}>
              {oauthBusy
                ? 'Waiting for Google…'
                : isLoading
                  ? 'Verifying 2FA...'
                  : requires2FA
                    ? 'Verify 2FA & Log In'
                    : 'Log In'}
            </AuthPrimaryButton>
          </form>

          <AuthDivider label="Or Login With" />

          <div className="grid min-w-0 grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onError={setErrorMsg}
              busy={oauthBusy}
              text="signin_with"
            />
            <SocialButton
              label="Sign in with Apple"
              icon={<AppleIcon />}
              onClick={handleAppleAuth}
              disabled={formBusy}
            />
          </div>

          <AuthFooter text="Don't Have An Account?" linkLabel="Register Now" href="/register" />
        </AuthCard>
      </div>
    </main>
  );
}
