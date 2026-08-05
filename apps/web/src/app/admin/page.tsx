'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const HEX_BG = `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`;

const navItems = [
  { label: 'Overview', href: '/admin', icon: '📊' },
  { label: 'Users', href: '/admin/users', icon: '👥' },
  { label: 'Providers', href: '/admin/providers', icon: '🩺' },
  { label: 'Hospitals', href: '/admin/hospitals', icon: '🏥' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { label: 'Audit Log', href: '/admin/audit', icon: '📋' },
];

type OverviewData = {
  totalUsers?: number;
  totalHospitals?: number;
  totalProviders?: number;
  totalAppointments?: number;
  totalRevenue?: number;
  pendingVerifications?: number;
};

export default function AdminDashboard() {
  const [overview, setOverview] = useState<OverviewData>({});
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [pendingProviders, setPendingProviders] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    async function load() {
      const [overviewRes, revenueRes, providersRes, usersRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get(`/analytics/revenue?range=${range}`),
        api.get('/admin/providers/pending'),
        api.get('/admin/users?limit=5'),
      ]);

      if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data);
      if (revenueRes.success && revenueRes.data) setRevenueData(Array.isArray(revenueRes.data) ? revenueRes.data : revenueRes.data.data || []);
      if (providersRes.success && providersRes.data) setPendingProviders(Array.isArray(providersRes.data) ? providersRes.data : providersRes.data.providers || []);
      if (usersRes.success && usersRes.data) setRecentUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.users || []);

      setLoading(false);
    }
    load();
  }, [range]);

  const handleVerifyProvider = async (providerId: string) => {
    const res = await api.post(`/admin/providers/${providerId}/verify`);
    if (res.success) {
      setPendingProviders((prev) => prev.filter((p) => p.id !== providerId));
    } else {
      alert(res.error?.message || 'Verification failed.');
    }
  };

  const statCards = [
    { label: 'Total Users', value: overview.totalUsers, icon: '👥', color: 'bg-blue-500' },
    { label: 'Hospitals', value: overview.totalHospitals, icon: '🏥', color: 'bg-purple-500' },
    { label: 'Providers', value: overview.totalProviders, icon: '🩺', color: 'bg-teal-500' },
    { label: 'Appointments', value: overview.totalAppointments, icon: '📅', color: 'bg-amber-500' },
    { label: 'Total Revenue', value: overview.totalRevenue ? `₦${overview.totalRevenue.toLocaleString()}` : undefined, icon: '💰', color: 'bg-green-500' },
    { label: 'Pending Verif.', value: overview.pendingVerifications, icon: '⚠️', color: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen flex font-sans">
      {/* Sidebar */}
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
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/10 transition-all text-sm ${item.href === '/admin' ? 'bg-[#1877F2] font-semibold' : 'opacity-70 hover:opacity-100'}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <Link href="/dashboard/hospital" className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/10 opacity-70 hover:opacity-100 transition-all text-sm">
            <span>🏠</span>
            <span>Hospital View</span>
          </Link>
        </div>
      </aside>

      <main className="ml-44 flex-1 bg-gradient-to-br from-slate-100 to-slate-200 min-h-screen overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: HEX_BG, backgroundSize: '110px 190px' }} />

        <div className="relative z-10 px-8 py-8 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
              <p className="text-slate-500 text-sm">Platform-wide metrics and management</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="bg-white border border-slate-200 text-sm font-medium text-slate-700 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="12m">Last 12 months</option>
              </select>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className={`w-9 h-9 ${card.color} rounded-xl flex items-center justify-center text-lg mb-3`}>
                  {card.icon}
                </div>
                <div className="text-xl font-black text-slate-900">
                  {loading ? <div className="h-6 w-12 bg-slate-100 rounded animate-pulse" /> : (card.value ?? '—')}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{card.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pending Provider Verifications */}
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-bold text-slate-900">Pending Verifications</h2>
                <Link href="/admin/providers" className="text-sm text-[#1877F2] font-semibold hover:underline">View all</Link>
              </div>
              {pendingProviders.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  {loading ? 'Loading...' : '✅ No pending verifications'}
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingProviders.slice(0, 4).map((provider: any) => (
                    <div key={provider.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-sm text-slate-600">
                          {provider.firstName?.[0] || 'D'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            Dr. {provider.firstName} {provider.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{provider.specialization || 'General Practitioner'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleVerifyProvider(provider.id)}
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Users */}
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-bold text-slate-900">Recent Users</h2>
                <Link href="/admin/users" className="text-sm text-[#1877F2] font-semibold hover:underline">View all</Link>
              </div>
              {recentUsers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">{loading ? 'Loading...' : 'No users found'}</div>
              ) : (
                <div className="space-y-3">
                  {recentUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1877F2]/10 rounded-full flex items-center justify-center font-bold text-xs text-[#1877F2]">
                          {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-600' :
                        user.role === 'CONSULTANT' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'PATIENT' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{user.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Nav Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'User Management', desc: 'View, suspend, verify users', href: '/admin/users', icon: '👥', color: 'bg-blue-500' },
              { title: 'Hospitals', desc: 'Manage hospital facilities', href: '/admin/hospitals', icon: '🏥', color: 'bg-purple-500' },
              { title: 'Analytics', desc: 'Revenue, growth, trends', href: '/admin/analytics', icon: '📈', color: 'bg-green-500' },
              { title: 'Audit Logs', desc: 'Review system activity', href: '/admin/audit', icon: '📋', color: 'bg-amber-500' },
            ].map((card) => (
              <Link key={card.title} href={card.href}
                className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
                <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-xl mb-3`}>
                  {card.icon}
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{card.title}</h3>
                <p className="text-xs text-slate-500">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
