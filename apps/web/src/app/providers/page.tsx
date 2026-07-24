'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadProviders() {
      const res = await api.get('/users/providers');
      if (res.success && res.data) {
        setProviders(Array.isArray(res.data) ? res.data : res.data.providers || []);
      }
      setLoading(false);
    }
    loadProviders();
  }, []);

  const filteredProviders = providers.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.specialization || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold">🏥</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Ricton Health</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Dashboard
            </Link>
            <Link href="/providers" className="text-teal-600 font-semibold">
              Find Doctors
            </Link>
            <Link href="/wallet" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Wallet
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Find Specialists</h1>
            <p className="text-sm text-slate-500">Book virtual appointments with certified medical professionals</p>
          </div>
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search doctor or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Searching healthcare directory...</div>
        ) : filteredProviders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-300 font-medium">No medical specialists match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-bold text-xl flex items-center justify-center border border-teal-200">
                      Dr
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        Dr. {provider.firstName} {provider.lastName}
                      </h3>
                      <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                        {provider.providerProfile?.specialization || 'General Practitioner'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {provider.providerProfile?.bio || 'Certified specialist available for virtual consultations and in-person care.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ₦{provider.providerProfile?.consultationFee || '15,000'} / session
                  </span>
                  <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs transition-colors">
                    Book Appointment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
