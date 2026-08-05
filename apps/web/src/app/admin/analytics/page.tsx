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

type MetricCard = {
  label: string;
  value: string | number;
  delta?: string;
  icon: string;
  color: string;
};

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [revenue, setRevenue] = useState<any>(null);
  const [appointments, setAppointments] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [providers, setProviders] = useState<any>(null);
  const [pharmacies, setPharmacies] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [revRes, apptRes, usersRes, provRes, pharmRes] = await Promise.all([
        api.get(`/analytics/revenue?range=${range}`),
        api.get(`/analytics/appointments?range=${range}`),
        api.get(`/analytics/users?range=${range}`),
        api.get(`/analytics/providers?range=${range}`),
        api.get(`/analytics/pharmacies?range=${range}`),
      ]);
      if (revRes.success) setRevenue(revRes.data);
      if (apptRes.success) setAppointments(apptRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (provRes.success) setProviders(provRes.data);
      if (pharmRes.success) setPharmacies(pharmRes.data);
      setLoading(false);
    }
    load();
  }, [range]);

  const metricCards: MetricCard[] = [
    {
      label: 'Total Revenue',
      value: revenue?.total ? `₦${Number(revenue.total).toLocaleString()}` : '—',
      delta: revenue?.growth ? `${revenue.growth > 0 ? '+' : ''}${revenue.growth}%` : undefined,
      icon: '💰', color: 'from-green-500 to-emerald-600',
    },
    {
      label: 'Appointments',
      value: appointments?.total ?? '—',
      delta: appointments?.growth ? `${appointments.growth > 0 ? '+' : ''}${appointments.growth}%` : undefined,
      icon: '📅', color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'New Users',
      value: users?.newUsers ?? users?.total ?? '—',
      delta: users?.growth ? `${users.growth > 0 ? '+' : ''}${users.growth}%` : undefined,
      icon: '👥', color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Active Providers',
      value: providers?.active ?? providers?.total ?? '—',
      delta: undefined,
      icon: '🩺', color: 'from-teal-500 to-cyan-600',
    },
    {
      label: 'Pharmacy Orders',
      value: pharmacies?.totalOrders ?? '—',
      delta: undefined,
      icon: '💊', color: 'from-orange-500 to-amber-500',
    },
    {
      label: 'Completion Rate',
      value: appointments?.completionRate ? `${appointments.completionRate}%` : '—',
      delta: undefined,
      icon: '✅', color: 'from-indigo-500 to-violet-600',
    },
  ];

  const rangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '12m', label: 'Last 12 months' },
    { value: 'all', label: 'All time' },
  ];

  // Build a bar chart from revenue data points
  const revenuePoints: any[] = Array.isArray(revenue?.data) ? revenue.data : Array.isArray(revenue) ? revenue : [];
  const maxRev = revenuePoints.length > 0 ? Math.max(...revenuePoints.map((d: any) => d.amount || d.value || 0)) : 1;

  const appointmentPoints: any[] = Array.isArray(appointments?.data) ? appointments.data : Array.isArray(appointments) ? appointments : [];
  const maxAppt = appointmentPoints.length > 0 ? Math.max(...appointmentPoints.map((d: any) => d.count || d.value || 0)) : 1;

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
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/10 transition-all text-sm ${item.href === '/admin/analytics' ? 'bg-[#1877F2] font-semibold' : 'opacity-70 hover:opacity-100'}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="ml-44 flex-1 bg-gradient-to-br from-slate-100 to-slate-200 min-h-screen">
        <div className="px-8 py-8 pb-20">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
              <p className="text-slate-500 text-sm">Revenue, growth, and operational metrics</p>
            </div>
            <div className="flex gap-2">
              {rangeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRange(opt.value)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    range === opt.value ? 'bg-[#1877F2] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {metricCards.map((card) => (
              <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center text-lg mb-3`}>
                  {card.icon}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900">
                    {loading ? <span className="inline-block w-12 h-5 bg-slate-100 rounded animate-pulse" /> : card.value}
                  </span>
                </div>
                {card.delta && !loading && (
                  <span className={`text-xs font-bold ${card.delta.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                    {card.delta} vs prev
                  </span>
                )}
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-5">Revenue Trend</h2>
              {loading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : revenuePoints.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No revenue data for this period</div>
              ) : (
                <div className="flex items-end gap-1 h-40">
                  {revenuePoints.slice(-14).map((d: any, i) => {
                    const val = d.amount || d.value || 0;
                    const pct = maxRev > 0 ? (val / maxRev) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full bg-[#1877F2] rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity relative"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                            ₦{val.toLocaleString()}
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-400 rotate-45 origin-bottom-left whitespace-nowrap">
                          {d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.label || i}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Appointments Chart */}
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-5">Appointments Trend</h2>
              {loading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appointmentPoints.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No appointment data for this period</div>
              ) : (
                <div className="flex items-end gap-1 h-40">
                  {appointmentPoints.slice(-14).map((d: any, i) => {
                    const val = d.count || d.value || 0;
                    const pct = maxAppt > 0 ? (val / maxAppt) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className="w-full bg-purple-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity relative"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">
                            {val} appts
                          </div>
                        </div>
                        <span className="text-[8px] text-slate-400 rotate-45 origin-bottom-left whitespace-nowrap">
                          {d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : d.label || i}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Provider Performance */}
            {providers?.performers && (
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="font-bold text-slate-900 mb-5">Top Providers</h2>
                <div className="space-y-3">
                  {providers.performers.slice(0, 5).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-black text-slate-400 w-5">{i + 1}</span>
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700 text-xs">
                        {p.name?.[0] || 'D'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">Dr. {p.name}</p>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-1">
                          <div className="h-1.5 bg-[#1877F2] rounded-full" style={{ width: `${p.score || 80}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{p.appointments} appts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
