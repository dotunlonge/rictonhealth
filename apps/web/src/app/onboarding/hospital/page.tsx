'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

export default function HospitalOnboardingPage() {
  const [hospitalName, setHospitalName] = useState('');
  const [address, setAddress] = useState('');
  const [license, setLicense] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await api.put('/users/me', {
      hospitalAdminProfile: {
        hospitalName,
        address,
        license,
      },
    });
    setSubmitting(false);

    if (res.success) {
      window.location.href = '/dashboard';
    } else {
      alert(res.error?.message || 'Hospital onboarding failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#E8EEF9] flex flex-col justify-between p-6">
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-lg">
            🏥
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900">Ricton Hospital Onboarding</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full bg-white rounded-3xl p-8 shadow-md border border-slate-200/80 my-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Register Hospital Facility</h1>
          <p className="text-xs text-slate-500 mt-1">Provide facility registration details to manage beds and MDTs</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">Hospital Facility Name</label>
            <input
              type="text"
              required
              placeholder="St. Jude Specialist Hospital"
              value={hospitalName}
              onChange={(e) => setHospitalName(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Facility Operating Address</label>
            <input
              type="text"
              required
              placeholder="12 Healthcare Boulevard, Ikeja, Lagos"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">State Health Board License</label>
            <input
              type="text"
              required
              placeholder="HEFAMAA/HOSP/2026/0491"
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="mt-1 block w-full px-4 py-3 border border-slate-300 rounded-2xl text-xs bg-slate-50 focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering Facility...' : 'Complete Hospital Registration'}
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
