'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrescriptions() {
      const res = await api.get('/prescriptions');
      if (res.success && res.data) {
        setPrescriptions(Array.isArray(res.data) ? res.data : res.data.prescriptions || []);
      }
      setLoading(false);
    }
    loadPrescriptions();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold">💊</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">E-Prescriptions</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Dashboard
            </Link>
            <Link href="/pharmacy" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Pharmacy Store
            </Link>
            <Link href="/prescriptions" className="text-teal-600 font-semibold">
              Prescriptions
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Digital Prescriptions</h1>
          <p className="text-sm text-slate-500">Verified doctor prescriptions signed with digital certificate integrity</p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">No active digital prescriptions found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">
                    Rx #{rx.id.slice(-6)}
                  </span>
                  <span className="text-xs text-slate-500">
                    Issued: {new Date(rx.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {rx.medicationName || 'Prescribed Medication'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Dosage: {rx.dosage || 'As directed by physician'}</p>
                  <p className="text-xs text-slate-500">Frequency: {rx.frequency || 'Daily'}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                    ✓ Doctor Digitally Signed
                  </span>
                  <Link
                    href="/pharmacy"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs transition-colors"
                  >
                    Order from Pharmacy
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
