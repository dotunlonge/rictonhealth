'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  clearPendingOAuthRoleSelection,
  getPendingOAuthRoleSelection,
  loginWithAppleToken,
  loginWithGoogleToken,
} from '@/lib/oauth';
import Navbar from '@/components/Navbar';
import { useAppStore } from '@/store/useAppStore';
import { onboardingForRole, landingForUser } from '@/lib/role-home';

function SelectRoleContent() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const pending = getPendingOAuthRoleSelection();
  const email = pending?.email || '';

  const [selectedRole, setSelectedRole] = useState<'PATIENT' | 'CONSULTANT' | 'PHARMACIST'>(
    'PATIENT'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // A user who arrives here already holding a session goes to setup if their
  // staff profile is incomplete — not blindly to /dashboard.
  useEffect(() => {
    if (user?.role) {
      router.replace(landingForUser(user));
    }
  }, [user, router]);

  if (user?.role) {
    return (
      <main className="bg-slate-50 min-h-screen w-full flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="bg-white p-8 sm:p-12 rounded-[32px] shadow-sm border border-slate-100 text-center max-w-md w-full space-y-4">
          <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <svg className="w-7 h-7 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Already Signed In</h2>
          <p className="text-sm font-medium text-slate-500">Redirecting to your healthcare dashboard…</p>
        </div>
      </main>
    );
  }

  const handleCompleteSignUp = async () => {
    if (!pending?.token) {
      setErrorMsg('Session expired. Please try signing in again.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      let res;
      if (pending.provider === 'apple') {
        res = await loginWithAppleToken(pending.token, selectedRole);
      } else {
        res = await loginWithGoogleToken(pending.token, selectedRole);
      }

      setIsLoading(false);

      if (res.success && res.data?.token) {
        clearPendingOAuthRoleSelection();
        // Route off the role the server actually persisted, not the pill the
        // user tapped — an existing account keeps its real role.
        const serverRole = res.data?.user?.role ?? selectedRole;
        api.setToken(res.data.token, res.data?.refreshToken ?? null, serverRole);
        if (res.data.user) {
          setUser(res.data.user);
        }
        router.push(onboardingForRole(serverRole));
      } else {
        setErrorMsg(res.error?.message || 'Role selection failed. Please try again.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Account creation failed');
    }
  };

  const roles = [
    {
      key: 'PATIENT',
      title: 'Patient',
      desc: 'Access healthcare, book appointments, view prescriptions and lab results.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      key: 'CONSULTANT',
      title: 'Doctor / Consultant',
      desc: 'Provide consultations, write digital prescriptions, manage clinical appointments.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 12h6m-3-3v6m-9 1a9 9 0 1118 0 9 9 0 01-18 0z"
          />
        </svg>
      ),
    },
    {
      key: 'PHARMACIST',
      title: 'Pharmacist',
      desc: 'Fulfill digital prescriptions, manage drug inventory and dispense medication.',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.8.568l-.4.4a2 2 0 000 2.828l.4.4a2 2 0 001.8.568l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.8-.568l.4-.4a2 2 0 000-2.828l-.4-.4z"
          />
        </svg>
      ),
    },
  ];

  return (
    <main className="bg-slate-50 min-h-screen w-full font-sans antialiased text-slate-900 pb-16">
      <Navbar />

      {/* Role Selector Card */}
      <section className="max-w-[720px] mx-auto mt-6 bg-white rounded-[32px] sm:rounded-[40px] shadow-[0px_4px_30px_rgba(0,0,0,0.06)] border border-slate-100 p-8 sm:p-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1c7bcf]/10 text-[#1c7bcf] mx-auto mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome to Ricton!
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
            {email
              ? `Setting up account for ${email}.`
              : 'Please select how you will be using Ricton to finish your account setup.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map((r) => {
            const isSelected = selectedRole === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setSelectedRole(r.key as any)}
                className={`p-6 rounded-3xl text-left border-2 transition-all flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'border-[#1c7bcf] bg-[#1c7bcf]/5 shadow-sm ring-2 ring-[#1c7bcf]/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`p-3 rounded-2xl ${isSelected ? 'bg-[#1c7bcf] text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    {r.icon}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#1c7bcf] bg-[#1c7bcf]' : 'border-slate-300'}`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{r.title}</h3>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed">{r.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleCompleteSignUp}
          disabled={isLoading}
          className="w-full h-16 rounded-2xl font-extrabold text-base text-white bg-[#1c7bcf] hover:bg-[#1565ad] transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
        >
          {isLoading ? 'Finalizing Setup...' : 'Complete Account Setup'}
        </button>
      </section>
    </main>
  );
}

export default function SelectRolePage() {
  return <SelectRoleContent />;
}
