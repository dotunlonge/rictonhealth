'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/store/useAppStore';

function VerifyOtpContent() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user?.role) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (user?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center max-w-md w-full space-y-4">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Already Signed In</h2>
          <p className="text-sm text-slate-500">Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await api.post<{
      token: string;
      refreshToken: string;
      user: { role: string };
    }>('/auth/verify/confirm', {
      email,
      otp: code,
    });

    setIsLoading(false);

    if (res.success) {
      if (res.data?.token) {
        api.setToken(res.data.token, res.data.refreshToken ?? null, res.data?.user?.role ?? null);
      }
      if (res.data?.user) {
        setUser(res.data.user as any);
      }
      const role = res.data?.user.role;
      setSuccessMsg('Account verified successfully! Redirecting to setup...');
      setTimeout(() => {
        if (role === 'HOSPITAL_ADMIN') {
          router.replace('/onboarding/hospital');
        } else if (role === 'CONSULTANT') {
          router.replace('/onboarding/doctor');
        } else if (role === 'PHARMACIST') {
          router.replace('/onboarding/pharmacy');
        } else {
          router.replace('/dashboard');
        }
      }, 1000);
    } else {
      setErrorMsg(res.error?.message || 'Invalid verification code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1c7bcf] text-white shadow-md mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Enter Verification Code
        </h2>
        <p className="text-sm text-slate-600">
          We sent a 6-digit code to <span className="font-semibold text-slate-900">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-[0px_4px_30px_rgba(0,0,0,0.06)] rounded-[32px] sm:px-10 border border-slate-100 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl text-sm font-medium">
              {successMsg}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="code"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wider text-center"
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
                  className="appearance-none block w-full px-4 py-4 border border-slate-300 rounded-2xl shadow-sm tracking-widest text-center text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-[#1c7bcf]/20 focus:border-[#1c7bcf] bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className="w-full h-14 flex items-center justify-center rounded-2xl shadow-md text-base font-extrabold text-white bg-[#1c7bcf] hover:bg-[#1565ad] transition-all disabled:opacity-50 active:scale-[0.99]"
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500 font-semibold">
          Loading...
        </div>
      }
    >
      <VerifyOtpContent />
    </Suspense>
  );
}
