'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api-client';
import {
  AuthCard,
  AuthError,
  AuthField,
  AuthFooter,
  AuthHeading,
  AuthPrimaryButton,
} from '@/components/auth/auth-ui';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramEmail = searchParams.get('email') || '';
  const paramOtp = searchParams.get('otp') || searchParams.get('code') || '';
  const paramStep = searchParams.get('step');

  const [identifier, setIdentifier] = useState(paramEmail);
  const [otp, setOtp] = useState(paramOtp);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeRequested, setCodeRequested] = useState(Boolean(paramOtp || paramStep === 'reset'));
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (paramEmail && !identifier) {
      setIdentifier(paramEmail);
    }
    if (paramOtp && !otp) {
      setOtp(paramOtp);
      setCodeRequested(true);
    }
  }, [paramEmail, paramOtp, identifier, otp]);

  // 60-second cooldown timer for resending OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const isEmail = (val: string) => val.includes('@');
  const cleanIdentifier = identifier.trim();

  // Password requirement checks (matches backend StrongPasswordSchema)
  const passwordChecks = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword),
      matches: Boolean(newPassword && newPassword === confirmPassword),
    };
  }, [newPassword, confirmPassword]);

  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.hasUpper &&
    passwordChecks.hasLower &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial &&
    passwordChecks.matches;

  // Step 1: Request OTP code
  const handleRequestCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!cleanIdentifier) {
      setErrorMessage('Please enter your email address or phone number.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const payload = isEmail(cleanIdentifier)
      ? { email: cleanIdentifier.toLowerCase() }
      : { phone: cleanIdentifier };

    const res = await api.post('/auth/password/forgot', payload);
    setSubmitting(false);

    if (res.success) {
      setCodeRequested(true);
      setCooldown(60);
      setStatusMessage('If an account exists, a 6-digit verification code has been sent.');
    } else {
      setErrorMessage(res.error?.message || 'Unable to request password reset code.');
    }
  };

  // Resend OTP code
  const handleResendCode = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErrorMessage(null);

    const payload = isEmail(cleanIdentifier)
      ? { email: cleanIdentifier.toLowerCase() }
      : { phone: cleanIdentifier };

    const res = await api.post('/auth/password/forgot', payload);
    setResending(false);

    if (res.success) {
      setCooldown(60);
      setStatusMessage('A fresh verification code was sent.');
    } else {
      setErrorMessage(res.error?.message || 'Failed to resend reset code.');
    }
  };

  // Step 2: Confirm OTP and set new password
  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('The passwords do not match.');
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage(
        'Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.'
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const payload = {
      ...(isEmail(cleanIdentifier)
        ? { email: cleanIdentifier.toLowerCase() }
        : { phone: cleanIdentifier }),
      otp: otp.trim(),
      newPassword,
    };

    const res = await api.post('/auth/password/reset', payload);
    setSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      setStatusMessage('Your password has been successfully reset. Redirecting to sign in…');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } else {
      setErrorMessage(res.error?.message || 'Failed to reset password. Please verify the code.');
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-slate-900 pb-16">
      <Navbar />

      <div className="px-4 sm:px-6 mt-8 sm:mt-12">
        <AuthCard labelledBy="forgot-password-heading">
          <AuthHeading
            id="forgot-password-heading"
            title={codeRequested ? 'Create new password' : 'Reset your password'}
            subtitle={
              codeRequested
                ? `Enter the 6-digit code sent to ${cleanIdentifier || 'your account'} and choose a new password.`
                : 'Enter your registered email address or phone number and we will send you a reset code.'
            }
          />

          {errorMessage && <AuthError message={errorMessage} />}

          {statusMessage && (
            <div
              role="status"
              className={`rounded-2xl border p-4 text-sm font-semibold flex items-center gap-3 ${
                isSuccess
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-blue-200 bg-blue-50/80 text-blue-800'
              }`}
            >
              <svg
                className="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isSuccess
                      ? 'M5 13l4 4L19 7'
                      : 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  }
                />
              </svg>
              <span>{statusMessage}</span>
            </div>
          )}

          {!codeRequested ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <AuthField
                id="forgot-identifier"
                label="Email address or phone"
                type="text"
                placeholder="name@example.com or +44..."
                value={identifier}
                onChange={setIdentifier}
                required
                autoComplete="username"
                inputMode="email"
              />

              <AuthPrimaryButton disabled={submitting || !cleanIdentifier}>
                {submitting ? 'Sending verification code…' : 'Send reset code'}
              </AuthPrimaryButton>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="forgot-otp"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Six-digit verification code
                </label>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  autoFocus
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  className="h-16 w-full rounded-[20px] border border-slate-200 bg-white px-4 text-center font-mono text-2xl font-extrabold tracking-[0.3em] text-slate-900 outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-300 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20"
                />
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-slate-400">Didn't receive the code?</span>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={cooldown > 0 || resending}
                    className="font-bold text-[#2f6fd6] hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Resending…' : 'Resend code'}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <AuthField
                  id="forgot-new-password"
                  label="New password"
                  placeholder="Enter new password (min. 8 characters)"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  required
                  autoComplete="new-password"
                  secure
                />

                <AuthField
                  id="forgot-confirm-password"
                  label="Confirm new password"
                  placeholder="Re-enter your new password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  required
                  autoComplete="new-password"
                  secure
                />
              </div>

              {/* Password checklist */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Password requirements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className={passwordChecks.minLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {passwordChecks.minLength ? '✓' : '•'}
                    </span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordChecks.hasUpper ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {passwordChecks.hasUpper ? '✓' : '•'}
                    </span>
                    <span>1 uppercase letter (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordChecks.hasLower ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {passwordChecks.hasLower ? '✓' : '•'}
                    </span>
                    <span>1 lowercase letter (a-z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordChecks.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {passwordChecks.hasNumber ? '✓' : '•'}
                    </span>
                    <span>1 number (0-9)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordChecks.hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {passwordChecks.hasSpecial ? '✓' : '•'}
                    </span>
                    <span>1 special character (@$!%*?&)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={passwordChecks.matches ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {passwordChecks.matches ? '✓' : '•'}
                    </span>
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <AuthPrimaryButton
                disabled={submitting || otp.length !== 6 || !isPasswordValid || isSuccess}
              >
                {submitting ? 'Resetting password…' : isSuccess ? 'Password Reset!' : 'Reset Password'}
              </AuthPrimaryButton>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCodeRequested(false);
                    setOtp('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-[#2f6fd6] transition-colors"
                >
                  ← Use a different email or phone number
                </button>
              </div>
            </form>
          )}

          <AuthFooter text="Remember your password?" linkLabel="Sign in" href="/login" />
        </AuthCard>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
