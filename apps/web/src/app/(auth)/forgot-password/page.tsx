'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const res = await api.post('/auth/password/forgot', { email: email.trim() });
    setSubmitting(false);
    if (res.success) {
      setCodeRequested(true);
      setIsError(false);
      setMessage('If an account exists, a six-digit reset code has been sent.');
    } else {
      setIsError(true);
      setMessage(res.error?.message || 'Unable to request a reset code.');
    }
  };

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage('The new passwords do not match.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    const res = await api.post('/auth/password/reset', {
      email: email.trim(),
      otp,
      newPassword,
    });
    setSubmitting(false);
    if (res.success) {
      setIsError(false);
      setMessage('Password reset. Redirecting to sign in…');
      setTimeout(() => router.push('/login'), 1200);
    } else {
      setIsError(true);
      setMessage(res.error?.message || 'Unable to reset your password.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <Link href="/" className="text-xl font-black text-[#1877F2]">Ricton</Link>
        <h1 className="mt-6 text-2xl font-extrabold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">
          {codeRequested ? 'Enter the code you received and choose a new password.' : 'We will send a short-lived reset code to your registered email.'}
        </p>

        {message && (
          <div className={`mt-5 rounded-xl border p-3 text-xs font-bold ${isError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
            {message}
          </div>
        )}

        {!codeRequested ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1877F2]" />
            </label>
            <button disabled={submitting} className="w-full rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-6 space-y-4">
            <label className="block text-xs font-bold text-slate-700">
              Six-digit code
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-[#1877F2]" />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              New password
              <input required type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1877F2]" />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              Confirm new password
              <input required type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1877F2]" />
            </label>
            <button disabled={submitting || otp.length !== 6} className="w-full rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? 'Resetting…' : 'Reset password'}
            </button>
            <button type="button" onClick={() => { setCodeRequested(false); setOtp(''); setMessage(''); }} className="w-full text-xs font-bold text-slate-500 hover:text-[#1877F2]">Request another code</button>
          </form>
        )}

        <Link href="/login" className="mt-6 block text-center text-xs font-bold text-[#1877F2]">Back to sign in</Link>
      </section>
    </main>
  );
}
