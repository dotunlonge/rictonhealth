'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthActions } from '@/store/useAppStore';

export default function LogoutPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Logging you out...');
  const { logout } = useAuthActions();

  useEffect(() => {
    let cancelled = false;

    async function performLogout() {
      // Store logout invalidates the server session ({ refreshToken }) before
      // clearing local state. API failure is non-blocking.
      await logout();
      if (!cancelled) {
        setStatus('You have been securely logged out.');
        setTimeout(() => router.replace('/login'), 600);
      }
    }

    performLogout();
    return () => {
      cancelled = true;
    };
  }, [logout, router]);

  return (
    <main className="bg-slate-50 min-h-screen w-full flex items-center justify-center font-sans antialiased text-slate-900 p-8">
      <div className="bg-white rounded-[40px] shadow-[0px_4px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-12 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <img
            src="/logo.svg"
            alt="Ricton Logo"
            className="w-10 h-10 object-contain opacity-50 grayscale"
          />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Goodbye!</h1>

        <p className="text-slate-500 font-medium">{status}</p>

        {status === 'Logging you out...' && (
          <div className="w-8 h-8 border-4 border-[#1c7bcf] border-t-transparent rounded-full animate-spin mx-auto mt-6" />
        )}
      </div>
    </main>
  );
}
