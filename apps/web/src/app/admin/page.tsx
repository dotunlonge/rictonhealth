'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  ShieldAlert,
  Users,
  Building2,
  Stethoscope,
  BarChart3,
  CheckCircle2,
  XCircle,
  Package,
  Inbox,
  LifeBuoy,
  FileText,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

type OverviewData = {
  totalUsers?: number;
  totalHospitals?: number;
  totalProviders?: number;
  totalAppointments?: number;
  totalRevenue?: number;
  pendingVerifications?: number;
};

export default function AdminDashboard() {
  const { user } = useAppStore();
  const [overview, setOverview] = useState<OverviewData>({
    totalUsers: 0,
    totalHospitals: 0,
    totalProviders: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
  });
  const [pendingProviders, setPendingProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyError, setVerifyError] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    const [overviewRes, providersRes] = await Promise.all([
      api.get('/analytics/overview'),
      api.get('/admin/providers/pending'),
    ]);

    if (overviewRes.success && overviewRes.data) {
      setOverview((prev) => ({ ...prev, ...overviewRes.data }));
    }
    if (providersRes.success && providersRes.data) {
      const list = Array.isArray(providersRes.data)
        ? providersRes.data
        : providersRes.data.providers || [];
      setPendingProviders(list);
      setOverview((prev) => ({ ...prev, pendingVerifications: list.length }));
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleVerifyProvider = async (providerId: string, verified: boolean) => {
    setVerifyError('');
    const res = await api.post(`/admin/providers/${providerId}/verify`, { verified });
    if (res.success) {
      setPendingProviders((prev) => prev.filter((p) => p.id !== providerId));
      setOverview((prev) => ({
        ...prev,
        pendingVerifications: Math.max((prev.pendingVerifications ?? 1) - 1, 0),
      }));
    } else {
      setVerifyError(res.error?.message || 'Failed to verify provider. Please try again.');
    }
  };

  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    email: '',
    phone: '',
  });
  const [hospitalMsg, setHospitalMsg] = useState<string | null>(null);
  const [hospitalError, setHospitalError] = useState(false);
  const [creatingHospital, setCreatingHospital] = useState(false);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setHospitalMsg(null);
    setCreatingHospital(true);
    const res = await api.post('/admin/hospitals', hospitalForm);
    setCreatingHospital(false);
    if (res.success) {
      setHospitalMsg(`Hospital “${hospitalForm.name}” onboarded successfully.`);
      setHospitalError(false);
      setHospitalForm({
        name: '',
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        email: '',
        phone: '',
      });
      void loadData();
    } else {
      setHospitalMsg(
        res.error?.message ||
          'Failed to onboard hospital. All of name, address, city, state, country, email, phone are required.'
      );
      setHospitalError(true);
    }
  };

  const quickNav = [
    {
      label: 'Platform Analytics',
      href: '/admin/analytics',
      icon: BarChart3,
      desc: 'Financial settlements, consultation volume & provider growth trends',
      badge: 'Live Metrics',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      label: 'Provider Approvals',
      href: '/admin/providers',
      icon: Stethoscope,
      desc: 'Verify MDCN medical licenses, credentials & clinical practice authority',
      badge: `${pendingProviders.length} Pending`,
      badgeAlert: pendingProviders.length > 0,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      label: 'Hospital Applications',
      href: '/admin/hospital-applications',
      icon: Building2,
      desc: 'Accredit health facilities, verify CAC registration & activate facility admins',
      badge: 'Review Queue',
      color: 'from-amber-500 to-orange-600',
    },
    {
      label: 'Support Triage',
      href: '/admin/support',
      icon: LifeBuoy,
      desc: 'Triage patient inquiries, clinical disputes, and compliance complaints',
      badge: 'Help Desk',
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'User Directory',
      href: '/admin/users',
      icon: Users,
      desc: 'Manage accounts, toggle suspensions, and provision privileged administrators',
      badge: 'Governance',
      color: 'from-sky-500 to-blue-600',
    },
    {
      label: 'Security Operations',
      href: '/admin/security',
      icon: ShieldAlert,
      desc: 'SmartGuard threat detection, credential stuffing defense & rate telemetry',
      badge: 'SecOps',
      color: 'from-rose-500 to-red-600',
    },
  ];

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <ShieldAlert className="w-3.5 h-3.5" /> Super Admin Center
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Global Jurisdiction</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              System Executive Dashboard
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Platform governance: Medical credential verification, facility onboarding, and telemetry oversight.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              disabled={loading}
              title="Refresh Dashboard"
              className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Registered Users
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
              ) : (
                (overview.totalUsers ?? 0).toLocaleString()
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500">Patients & Clinicians</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Licensed Hospitals
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
              ) : (
                (overview.totalHospitals ?? 0).toLocaleString()
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500">Accredited Health Facilities</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Verified Specialists
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
              ) : (
                (overview.totalProviders ?? 0).toLocaleString()
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500">Licensed Doctors & Consultants</p>
          </div>

          <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-lg shadow-blue-900/20 space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Platform Revenue
              </span>
              <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-blue-300">₦</span>
              <span className="text-3xl font-black">
                {loading ? (
                  <span className="inline-block w-24 h-8 bg-white/20 rounded animate-pulse" />
                ) : (
                  (overview.totalRevenue ?? 0).toLocaleString()
                )}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-300">Settled Transactions</p>
          </div>
        </div>

        {/* Quick Hub Navigation Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Executive Control Hub</h2>
              <p className="text-xs text-slate-500">Direct access to regulatory, clinical, and security consoles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {quickNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#1877F2]/40 transition-all group flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.badgeAlert
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-[#1877F2] transition-colors flex items-center gap-1.5">
                        {item.label}
                        <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#1877F2]" />
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs font-bold text-[#1877F2] flex items-center gap-1">
                    Open Console →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Pending Credential Verification Approvals */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Pending Specialist License Verifications
              </h2>
              <p className="text-xs text-slate-500">
                Doctors awaiting MDCN accreditation approval before entering clinical rotation
              </p>
            </div>
            <Link
              href="/admin/providers"
              className="text-xs font-bold text-[#1877F2] hover:underline flex items-center gap-1"
            >
              Full Verification Queue →
            </Link>
          </div>

          {verifyError && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-2xl">
              {verifyError}
            </p>
          )}

          <div className="space-y-3">
            {loading ? (
              <p className="text-xs font-bold text-slate-400 py-6 text-center">
                Loading pending verifications...
              </p>
            ) : pendingProviders.length === 0 ? (
              <div className="p-8 bg-slate-50 border border-slate-200/60 rounded-2xl text-center space-y-1">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-slate-800">
                  All Specialist Applications Verified
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  There are no doctors currently waiting in the verification queue.
                </p>
              </div>
            ) : (
              pendingProviders.slice(0, 5).map((prov) => (
                <div
                  key={prov.id}
                  className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#1877F2] font-bold flex items-center justify-center text-xs">
                      {prov.firstName?.[0] || 'D'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">
                        Dr. {prov.firstName} {prov.lastName}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {prov.specialty || 'General Practitioner'}
                        {prov.licenseNumber ? ` • MDCN #${prov.licenseNumber}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerifyProvider(prov.id, true)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyProvider(prov.id, false)}
                      className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hospital Onboarding Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Quick Hospital Onboarding</h2>
            <p className="text-xs text-slate-500">
              Directly register a new healthcare center or regional clinic
            </p>
          </div>

          {hospitalMsg && (
            <p
              className={`text-xs font-bold p-3.5 rounded-2xl border ${
                hospitalError
                  ? 'text-rose-600 bg-rose-50 border-rose-200'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              {hospitalMsg}
            </p>
          )}

          <form onSubmit={handleCreateHospital} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {(
              [
                ['name', 'Hospital name'],
                ['address', 'Street address'],
                ['city', 'City'],
                ['state', 'State'],
                ['country', 'Country'],
                ['email', 'Contact email'],
                ['phone', 'Contact phone'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {label}
                </label>
                <input
                  required
                  value={hospitalForm[key]}
                  onChange={(e) => setHospitalForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={label}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
            ))}

            <div className="md:col-span-2 pt-2">
              <button
                type="submit"
                disabled={creatingHospital}
                className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {creatingHospital ? 'Onboarding in progress...' : 'Confirm Facility Registration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}
