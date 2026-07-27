'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

export default function PharmacyOnboardingPage() {
  const [pharmacyName, setPharmacyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await api.put('/users/me', {
      pharmacyProfile: {
        pharmacyName,
        licenseNumber,
        onboardingComplete: true,
      },
    });
    setSubmitting(false);

    if (res.success) {
      window.location.href = '/dashboard';
    } else {
      alert(res.error?.message || 'Pharmacy onboarding failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EEF9] flex flex-col justify-between p-6">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-lg">
            💊
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Ricton Pharmacy Onboarding</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full bg-white rounded-3xl p-8 shadow-md border border-slate-200/80 my-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pharmacy Store Registration</h1>
          <p className="text-xs text-slate-500 mt-1">Provide Pharmacists Council of Nigeria (PCN) credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">Pharmacy Store Name</label>
            <input
              type="text"
              required
              placeholder="MedPlus Pharmacy Store"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">PCN License Number</label>
            <input
              type="text"
              required
              placeholder="PCN/REG/2026/1940"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering Pharmacy...' : 'Complete Pharmacy Registration'}
            </button>
          </div>
        </form>
      </main>

      <footer className="text-center text-xs text-slate-400">
        © 2026 Ricton Healthcare Platform
      </footer>
    </div>
  );
}
