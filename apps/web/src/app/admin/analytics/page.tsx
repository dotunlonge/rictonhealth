'use client';

import { useEffect, useState, useTransition } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Award,
  ShoppingBag,
  RefreshCw,
  ArrowUpRight,
  Stethoscope,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

type RevenueAnalytics = {
  totalRevenue: number;
  byType: Record<string, number>;
  trend: Array<{ period: string; amount: number }>;
};

type AppointmentAnalytics = {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  trend: Array<{ period: string; count: number }>;
};

type UserAnalytics = {
  totalUsers: number;
  byRole: Record<string, number>;
  trend: Array<{ period: string; count: number }>;
};

type ProviderAnalytics = {
  providers: Array<{
    providerId: string;
    name: string;
    specialty: string | null;
    appointmentCount: number;
    completedCount: number;
    rating: number | null;
  }>;
  total: number;
};

type PharmacyAnalytics = {
  totalOrders: number;
};

const RANGE_OPTIONS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '12m', label: '12 Months' },
  { value: 'all', label: 'All Time' },
];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState('30d');
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [appointments, setAppointments] = useState<AppointmentAnalytics | null>(null);
  const [users, setUsers] = useState<UserAnalytics | null>(null);
  const [providers, setProviders] = useState<ProviderAnalytics | null>(null);
  const [pharmacies, setPharmacies] = useState<PharmacyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadData = async (selectedRange: string) => {
    setLoading(true);
    const [revRes, apptRes, usersRes, provRes, pharmRes] = await Promise.all([
      api.get(`/analytics/revenue?range=${selectedRange}`),
      api.get(`/analytics/appointments?range=${selectedRange}`),
      api.get(`/analytics/users?range=${selectedRange}`),
      api.get(`/analytics/providers?range=${selectedRange}`),
      api.get(`/analytics/pharmacies?range=${selectedRange}`),
    ]);

    if (revRes.success) setRevenue(revRes.data);
    if (apptRes.success) setAppointments(apptRes.data);
    if (usersRes.success) setUsers(usersRes.data);
    if (provRes.success) setProviders(provRes.data);
    if (pharmRes.success) setPharmacies(pharmRes.data);
    setLoading(false);
  };

  useEffect(() => {
    void loadData(range);
  }, [range]);

  const handleRangeChange = (newRange: string) => {
    setRange(newRange);
    startTransition(() => {
      void loadData(newRange);
    });
  };

  const completionRate = appointments?.total
    ? Math.round(((appointments.byStatus?.COMPLETED ?? 0) / appointments.total) * 100)
    : 0;

  const totalRevNum = Number(revenue?.totalRevenue ?? 0);
  const formattedRevenue = `₦${totalRevNum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const revenuePoints = revenue?.trend ?? [];
  const maxRev = revenuePoints.length > 0 ? Math.max(...revenuePoints.map((p) => p.amount), 1) : 1;

  const appointmentPoints = appointments?.trend ?? [];
  const maxAppt = appointmentPoints.length > 0 ? Math.max(...appointmentPoints.map((p) => p.count), 1) : 1;

  const topProviders = [...(providers?.providers ?? [])]
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, 6);

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Top Header & Range Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Telemetry
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Updated every 60s</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Platform Analytics & Growth
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Cross-system financial settlements, consultation throughput, and provider SLA metrics.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60 shadow-inner">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleRangeChange(opt.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    range === opt.value
                      ? 'bg-white text-[#1877F2] shadow-xs scale-102'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => void loadData(range)}
              disabled={loading}
              title="Refresh Analytics"
              className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 6 High-Impact Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Revenue */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-white to-white p-5 rounded-3xl border border-emerald-200/60 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800/80">
                Gross Revenue
              </span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? <span className="inline-block w-20 h-7 bg-slate-100 rounded animate-pulse" /> : formattedRevenue}
            </div>
            <p className="text-[11px] font-semibold text-emerald-700 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Settled transactions
            </p>
          </div>

          {/* Card 2: Appointments */}
          <div className="bg-gradient-to-br from-blue-500/10 via-white to-white p-5 rounded-3xl border border-blue-200/60 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800/80">
                Consultations
              </span>
              <div className="w-9 h-9 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" /> : (appointments?.total ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-semibold text-blue-700 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Booked visits
            </p>
          </div>

          {/* Card 3: Completion Rate */}
          <div className="bg-gradient-to-br from-violet-500/10 via-white to-white p-5 rounded-3xl border border-violet-200/60 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-800/80">
                Completion Rate
              </span>
              <div className="w-9 h-9 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/20 group-hover:scale-105 transition-transform">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? <span className="inline-block w-14 h-7 bg-slate-100 rounded animate-pulse" /> : `${completionRate}%`}
            </div>
            <p className="text-[11px] font-semibold text-violet-700 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Fulfilled clinical visits
            </p>
          </div>

          {/* Card 4: Platform Users */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-white to-white p-5 rounded-3xl border border-indigo-200/60 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800/80">
                Total Users
              </span>
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" /> : (users?.totalUsers ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-semibold text-indigo-700 mt-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Registered accounts
            </p>
          </div>

          {/* Card 5: Active Providers */}
          <div className="bg-gradient-to-br from-sky-500/10 via-white to-white p-5 rounded-3xl border border-sky-200/60 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800/80">
                Specialists
              </span>
              <div className="w-9 h-9 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? <span className="inline-block w-14 h-7 bg-slate-100 rounded animate-pulse" /> : (providers?.total ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-semibold text-sky-700 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Licensed doctors
            </p>
          </div>

          {/* Card 6: Pharmacy Orders */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-white p-5 rounded-3xl border border-amber-200/60 shadow-xs hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80">
                Pharmacy Orders
              </span>
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? <span className="inline-block w-14 h-7 bg-slate-100 rounded animate-pulse" /> : (pharmacies?.totalOrders ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] font-semibold text-amber-700 mt-2 flex items-center gap-1">
              <ShoppingBag className="w-3 h-3" /> Prescriptions fulfilled
            </p>
          </div>
        </div>

        {/* Chart Grids: Revenue & Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Revenue Progression</h3>
                <p className="text-xs text-slate-500">Historical settlement volume over selected timeframe</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Direct Pay & Wallet
              </div>
            </div>

            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : revenuePoints.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
                <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
                No settlement data recorded for this window
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-2 h-48 pt-6">
                  {revenuePoints.slice(-14).map((d) => {
                    const val = d.amount;
                    const pct = maxRev > 0 ? (val / maxRev) * 100 : 0;
                    return (
                      <div key={d.period} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div
                          className="w-full bg-gradient-to-t from-[#1877F2] to-sky-400 rounded-t-lg transition-all group-hover:scale-y-105 group-hover:from-blue-600 group-hover:to-sky-300 relative"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg z-10 whitespace-nowrap">
                            ₦{val.toLocaleString()}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                          {new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Appointments Trend Chart */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Consultation Throughput</h3>
                <p className="text-xs text-slate-500">Booking demand and patient appointments</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-50 text-[#1877F2] text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Bookings
              </div>
            </div>

            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : appointmentPoints.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
                <Calendar className="w-8 h-8 mb-2 opacity-40" />
                No consultation events recorded for this window
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-2 h-48 pt-6">
                  {appointmentPoints.slice(-14).map((d) => {
                    const val = d.count;
                    const pct = maxAppt > 0 ? (val / maxAppt) * 100 : 0;
                    return (
                      <div key={d.period} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div
                          className="w-full bg-gradient-to-t from-violet-600 to-fuchsia-400 rounded-t-lg transition-all group-hover:scale-y-105 relative"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg z-10 whitespace-nowrap">
                            {val} visits
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
                          {new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Specialists & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Specialist Leaderboard */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Top Performing Specialists</h3>
                <p className="text-xs text-slate-500">Doctors ranked by fulfilled appointments and patient ratings</p>
              </div>
              <span className="text-xs font-bold text-[#1877F2]">Clinical Leaderboard</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : topProviders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No provider activity recorded for this period
              </div>
            ) : (
              <div className="space-y-3">
                {topProviders.map((p, index) => {
                  const rate = p.appointmentCount > 0 ? Math.round((p.completedCount / p.appointmentCount) * 100) : 0;
                  return (
                    <div
                      key={p.providerId}
                      className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                    >
                      <span className="text-sm font-extrabold text-slate-400 w-5 text-center">
                        {index + 1}
                      </span>
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                        {p.name ? p.name.charAt(0).toUpperCase() : 'D'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">Dr. {p.name}</p>
                          {p.specialty && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#1877F2]">
                              {p.specialty}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[140px]">
                            <div
                              className="h-full bg-[#1877F2] rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {p.completedCount}/{p.appointmentCount} fulfilled ({rate}%)
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">
                          {p.completedCount}
                        </span>
                        <p className="text-[10px] font-semibold text-slate-400">Completed</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operational Breakdown Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-slate-900 mb-1">Ecosystem Status</h3>
              <p className="text-xs text-slate-500 mb-6">Consultation channels and user roles breakdown</p>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Telemedicine / Video Call</span>
                    <span className="text-[#1877F2]">{appointments?.byType?.VIRTUAL ?? 0} sessions</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1877F2] rounded-full"
                      style={{
                        width: `${appointments?.total ? Math.min(100, Math.round(((appointments?.byType?.VIRTUAL ?? 0) / appointments.total) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Physical In-Clinic Visits</span>
                    <span className="text-purple-600">{appointments?.byType?.PHYSICAL ?? 0} visits</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${appointments?.total ? Math.min(100, Math.round(((appointments?.byType?.PHYSICAL ?? 0) / appointments.total) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Platform Patients</span>
                    <span className="text-emerald-600">{users?.byRole?.PATIENT ?? 0} active</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${users?.totalUsers ? Math.min(100, Math.round(((users?.byRole?.PATIENT ?? 0) / users.totalUsers) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Audit Compliant</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> ISO 27001 & NDPR
              </span>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
