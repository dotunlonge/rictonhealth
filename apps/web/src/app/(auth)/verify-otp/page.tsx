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

    const role = searchParams.get('role') || '';

    if (res.success) {
      setSuccessMsg('Account verified successfully! Redirecting to setup...');
      setTimeout(() => {
        if (role === 'HOSPITAL_ADMIN') {
          router.push('/onboarding/hospital');
        } else if (role === 'CONSULTANT') {
          router.push('/onboarding/doctor');
        } else if (role === 'PHARMACIST') {
          router.push('/onboarding/pharmacy');
        } else {
          router.push('/login');
        }
      }, 1500);
    } else {
      setErrorMsg(res.error?.message || 'Invalid verification code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1c7bcf] text-white shadow-md mx-auto">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500 font-semibold">Loading...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}
