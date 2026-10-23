'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { loginWithGoogleToken, triggerAppleAuth } from '@/lib/oauth';
import Navbar from '@/components/Navbar';
import { useAppStore } from '@/store/useAppStore';
import { onboardingForRole, landingForUser } from '@/lib/role-home';
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
  RolePills,
  SocialButton,
} from '@/components/auth/auth-ui';

const ROLE_OPTIONS = [
  {
    key: 'PATIENT',
    label: 'Patient',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
  {
    key: 'CONSULTANT',
    label: 'Doctor',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-3-3v6m-9 1a9 9 0 1118 0 9 9 0 01-18 0z"
        />
      </svg>
    ),
  },
  {
    key: 'PHARMACIST',
    label: 'Pharmacist',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.8.568l-.4.4a2 2 0 000 2.828l.4.4a2 2 0 001.8.568l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.8-.568l.4-.4a2 2 0 000-2.828l-.4-.4z"
        />
      </svg>
    ),
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const [role, setRole] = useState<'PATIENT' | 'CONSULTANT' | 'PHARMACIST'>('PATIENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Google popup flow gets its own busy flag (see login page): sharing the
  // form-wide flag locked the page when the popup closed without consent.
  const [oauthBusy, setOauthBusy] = useState(false);
  const formBusy = isLoading || oauthBusy;
  const [errorMsg, setErrorMsg] = useState('');
  // Apple Sign-In is part of the auth design and always renders (see login).

  // Already signed in? Land on setup if the staff profile is incomplete,
  // otherwise the role home. Mirrors the login page: consult a fresh /users/me
  // for staff so a stale in-memory profile can't hide an unfinished setup.
  const redirectAfterAuth = async (u: any) => {
    let full = u;
    if (u?.role === 'CONSULTANT' || u?.role === 'PHARMACIST') {
      try {
        const fresh = await useAppStore.getState().fetchUser();
        if (fresh) full = fresh;
      } catch {
        /* fall through with what we have */
      }
    }
    router.replace(landingForUser(full) ?? '/dashboard');
  };

  // Already signed in (restored session, or middleware-hinted cookie)? Skip
  // the registration form and land on the correct dashboard for the role.
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

  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.length >= 8;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue || formBusy) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/register', {
        email,
        phone,
        password,
        role,
        firstName,
        lastName,
        consentVersion: '1.0',
      });

      if (!res.success) {
        setErrorMsg(res.error?.message || 'Registration failed. Please try again.');
        return;
      }

      const verification = await api.post('/auth/verify-email', { email });
      if (!verification.success) {
        setErrorMsg(
          verification.error?.message ||
            'Your account was created, but the verification code could not be sent. Try again.'
        );
        return;
      }

      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setOauthBusy(true);
    setErrorMsg('');
    try {
      const res = await loginWithGoogleToken(credential, role);
      setOauthBusy(false);
      if (res.success && res.data?.token) {
        // Trust the role the SERVER returned: the backend only applies the
        // requested role when creating an account, so an existing account keeps
        // its real role. Routing off the local form state sent people to the
        // wrong home (and skipped onboarding entirely).
        const serverRole = res.data?.user?.role ?? role;
        api.setToken(res.data.token, res.data?.refreshToken ?? null, serverRole);
        if (res.data.user) {
          setUser(res.data.user);
        }
        router.push(onboardingForRole(serverRole));
      } else {
        setErrorMsg(res.error?.message || 'Google Sign-Up failed.');
      }
    } catch (err: unknown) {
      setOauthBusy(false);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Google Sign-Up failed.');
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await triggerAppleAuth(role);
      setIsLoading(false);
      if (res.success && res.data?.token) {
        const serverRole = res.data?.user?.role ?? role;
        api.setToken(res.data.token, res.data?.refreshToken ?? null, serverRole);
        if (res.data.user) {
          setUser(res.data.user);
        }
        // Apple used to hardcode /dashboard, so doctor/pharmacist sign-ups
        // never reached setup until they signed out and back in.
        router.push(onboardingForRole(serverRole));
      } else {
        setErrorMsg(res.error?.message || 'Apple Sign-Up failed.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Apple Sign-Up failed.');
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-slate-900 pb-16">
      <Navbar />

      <div className="px-4 sm:px-6 mt-8 sm:mt-12">
        <AuthCard labelledBy="register-heading">
          <AuthHeading
            id="register-heading"
            title="Create Your Account"
            subtitle="Join as a patient, clinician, or pharmacist. Hospitals are provisioned by Ricton admins after verification."
          />

          {errorMsg && <AuthError message={errorMsg} />}

          <RolePills
            label="I am joining as:"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(key) => setRole(key as typeof role)}
          />
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-slate-600">
            Registering a hospital? Ask a Ricton super-admin to provision your HOSPITAL_ADMIN
            account — hospital self-registration is disabled to prevent privilege escalation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AuthField
                id="register-first-name"
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                required
                autoComplete="given-name"
              />
              <AuthField
                id="register-last-name"
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                required
                autoComplete="family-name"
              />
            </div>
            <AuthField
              id="register-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={setEmail}
              required
              autoComplete="email"
              inputMode="email"
            />
            <AuthField
              id="register-phone"
              label="Phone Number (+234...)"
              type="tel"
              value={phone}
              onChange={setPhone}
              required
              autoComplete="tel"
              inputMode="tel"
            />
            <AuthField
              id="register-password"
              label="Password (8+ characters)"
              value={password}
              onChange={setPassword}
              required
              autoComplete="new-password"
              secure
            />

            <AuthPrimaryButton disabled={!canContinue || formBusy}>
              {oauthBusy
                ? 'Waiting for Google…'
                : isLoading
                  ? 'Creating Account...'
                  : 'Continue to Verification'}
            </AuthPrimaryButton>
          </form>

          <AuthDivider label="Or Fast Register With" />

          <div className="grid min-w-0 grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onError={setErrorMsg}
              busy={oauthBusy}
              text="signup_with"
            />
            <SocialButton
              label="Sign up with Apple"
              icon={<AppleIcon />}
              onClick={handleAppleAuth}
              disabled={formBusy}
            />
          </div>

          <AuthFooter text="Already have an account?" linkLabel="Sign In" href="/login" />
        </AuthCard>
      </div>
    </main>
  );
}
