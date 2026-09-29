'use client';

import { useCallback, useEffect, useState } from 'react';
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

type RoleTab = 'DOCTOR' | 'PHARMACIST';

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<RoleTab>('DOCTOR');

  const load = useCallback(async (role: RoleTab) => {
    setLoading(true);
    // #124 Pharmacist queue: role filter tab. Backend currently serves
    // provider profiles on /admin/providers/pending; the role param is
    // forwarded so the queue can split DOCTOR vs PHARMACIST once supported.
    const query = role === 'PHARMACIST' ? '?role=PHARMACIST' : '';
    const res = await api.get(`/admin/providers/pending${query}`);
    if (res.success) {
      const list = Array.isArray(res.data) ? res.data : res.data?.providers || [];
      // Client-side role split until the backend filters: pharmacist rows
      // carry pharmacyName / PHARMACIST role markers.
      const filtered =
        role === 'PHARMACIST'
          ? list.filter(
              (p: any) =>
                p.role === 'PHARMACIST' || p.pharmacyName || p.type === 'PHARMACIST'
            )
          : list.filter(
              (p: any) =>
                !p.role || p.role !== 'PHARMACIST' || !p.pharmacyName
            );
      // When backend ignores ?role= and returns doctors-only, the pharmacist
      // tab correctly shows empty rather than mislabelled doctors.
      setProviders(role === 'PHARMACIST' && !query ? [] : filtered);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(roleTab);
  }, [load, roleTab]);

  const handleVerify = async (providerId: string) => {
    setActing(providerId);
    const res = await api.post(`/admin/providers/${providerId}/verify`, { verified: true });
    setActing(null);
    if (res.success) {
      setProviders((prev) => prev.filter((p) => p.id !== providerId));
    } else {
      alert(res.error?.message || 'Verification failed.');
    }
  };

  // #138 Reject: calls the existing verify endpoint with verified:false
  // (server writes a PROVIDER_REJECTED audit row).
  const handleReject = async (providerId: string) => {
    const reason = window.prompt('Rejection reason (recorded in audit log):') ?? '';
    if (reason === null) return;
    setActing(providerId);
    const res = await api.post(`/admin/providers/${providerId}/verify`, {
      verified: false,
      notes: reason,
    });
    setActing(null);
    if (res.success) {
      setProviders((prev) => prev.filter((p) => p.id !== providerId));
    } else {
      alert(res.error?.message || 'Rejection failed.');
    }
  };

  // #138 Suspend: suspends the underlying user account (audited via
  // USER_STATUS_UPDATED_SUSPENDED) and drops the row from the queue.
  const handleSuspend = async (provider: any) => {
    const userId = provider.userId;
    if (!userId) {
      alert('No linked user account to suspend.');
      return;
    }
    const reason = window.prompt(`Suspend ${provider.email || provider.firstName || provider.id}? Enter reason:`) ?? '';
    if (reason === null) return;
    setActing(provider.id);
    const res = await api.patch(`/admin/users/${userId}/status`, {
      status: 'SUSPENDED',
      reason: reason || 'Suspended from provider queue',
    });
    setActing(null);
    if (res.success) {
      setProviders((prev) => prev.filter((p) => p.id !== provider.id));
    } else {
      alert(res.error?.message || 'Suspend failed.');
    }
  };

  const isPharmacist = roleTab === 'PHARMACIST';

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
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Provider Verification</h1>
              <p className="text-slate-500 text-sm">{providers.length} providers pending verification</p>
            </div>
            <div className="flex gap-2 bg-white rounded-full p-1 shadow-sm">
              {(['DOCTOR', 'PHARMACIST'] as RoleTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRoleTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    roleTab === tab ? 'bg-[#1877F2] text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'DOCTOR' ? '🩺 Doctors' : '💊 Pharmacists'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-xs font-bold text-slate-600 uppercase">
                  <th className="py-4 px-6 text-left">{isPharmacist ? 'Pharmacy' : 'Provider'}</th>
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
                      <p className="text-slate-400 text-sm">
                        No {isPharmacist ? 'pharmacists' : 'providers'} pending verification
                      </p>
                    </td>
                  </tr>
                ) : (
                  providers.map((provider) => (
                    <tr key={provider.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                            {provider.firstName?.[0] || provider.pharmacyName?.[0] || 'D'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {isPharmacist
                                ? provider.pharmacyName || `${provider.firstName || ''} ${provider.lastName || ''}`
                                : `Dr. ${provider.firstName} ${provider.lastName}`}
                            </p>
                            <p className="text-xs text-slate-500">{provider.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-700">{provider.specialization || provider.specialty || '—'}</td>
                      <td className="py-4 px-4 text-center text-slate-600 font-mono text-xs">{provider.licenseNumber || '—'}</td>
                      <td className="py-4 px-4 text-center text-slate-600">{provider.hospital?.name || '—'}</td>
                      <td className="py-4 px-4 text-center text-xs text-slate-500">
                        {provider.createdAt || provider.submittedAt ? new Date(provider.createdAt || provider.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleVerify(provider.id)}
                            disabled={acting === provider.id}
                            className="bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                          >
                            {acting === provider.id ? '...' : 'Verify ✓'}
                          </button>
                          <button
                            onClick={() => handleReject(provider.id)}
                            disabled={acting === provider.id}
                            className="bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleSuspend(provider)}
                            disabled={acting === provider.id}
                            className="bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                          >
                            Suspend
                          </button>
                        </div>
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
