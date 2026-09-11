'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const navItems = [
  { label: 'Overview', href: '/admin', icon: '📊' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Providers', href: '/admin/providers', icon: '🩺' },
  { label: 'Hospitals', href: '/admin/hospitals', icon: '🏥' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { label: 'Audit Log', href: '/admin/audit', icon: '📋' },
];

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await api.get('/admin/providers/pending');
      if (res.success) {
        setProviders(Array.isArray(res.data) ? res.data : res.data?.providers || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleVerify = async (providerId: string) => {
    setVerifying(providerId);
    const res = await api.post(`/admin/providers/${providerId}/verify`, { verified: true });
    setVerifying(null);
    if (res.success) {
      setProviders((prev) => prev.filter((p) => p.id !== providerId));
    } else {
      alert(res.error?.message || 'Verification failed.');
    }
  };

  return (
    <div className="min-h-screen flex font-sans">
      <aside className="w-44 bg-slate-900 text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1877F2] rounded-lg flex items-center justify-center text-sm font-bold">R</div>
          <div>
            <span className="text-base font-bold">Ricton</span>
            <p className="text-[9px] text-slate-400 -mt-0.5">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 mt-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/10 transition-all text-sm ${item.href === '/admin/providers' ? 'bg-[#1877F2] font-semibold' : 'opacity-70 hover:opacity-100'}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="ml-44 flex-1 bg-gradient-to-br from-slate-100 to-slate-200 min-h-screen">
        <div className="px-8 py-8 pb-20">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Provider Verification</h1>
            <p className="text-slate-500 text-sm">{providers.length} providers pending verification</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-bold text-slate-600 uppercase">
                  <th className="py-4 px-6 text-left">Provider</th>
                  <th className="py-4 px-4 text-center">Specialization</th>
                  <th className="py-4 px-4 text-center">License No.</th>
                  <th className="py-4 px-4 text-center">Hospital</th>
                  <th className="py-4 px-4 text-center">Applied</th>
                  <th className="py-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading providers...
                    </td>
                  </tr>
                ) : providers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="text-4xl mb-3">✅</div>
                      <p className="font-semibold text-slate-700">All caught up!</p>
                      <p className="text-slate-400 text-sm">No providers pending verification</p>
                    </td>
                  </tr>
                ) : (
                  providers.map((provider) => (
                    <tr key={provider.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                            {provider.firstName?.[0] || 'D'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              Dr. {provider.firstName} {provider.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{provider.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-700">{provider.specialization || '—'}</td>
                      <td className="py-4 px-4 text-center text-slate-600 font-mono text-xs">{provider.licenseNumber || '—'}</td>
                      <td className="py-4 px-4 text-center text-slate-600">{provider.hospital?.name || '—'}</td>
                      <td className="py-4 px-4 text-center text-xs text-slate-500">
                        {provider.createdAt ? new Date(provider.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleVerify(provider.id)}
                          disabled={verifying === provider.id}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-bold px-5 py-1.5 rounded-full transition-colors"
                        >
                          {verifying === provider.id ? 'Verifying...' : 'Verify ✓'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
