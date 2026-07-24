'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await api.post('/auth/otp/verify', {
      value: email,
      code,
      type: 'EMAIL_VERIFICATION',
    });

    setIsLoading(false);

    if (res.success) {
      setSuccessMsg('Account verified successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } else {
      setErrorMsg(res.error?.message || 'Invalid verification code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2 text-2xl font-bold text-teal-600 dark:text-teal-400">
          <span className="p-2 bg-teal-600 text-white rounded-xl shadow-md">🔐</span>
          Verification
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-white">
          Enter OTP Code
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          We sent a 6-digit code to <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-700">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm">
              {successMsg}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-center"
              >
                Verification Code
              </label>
              <div className="mt-2">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="appearance-none block w-full px-3 py-3 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm tracking-widest text-center text-2xl font-mono focus:outline-none focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
