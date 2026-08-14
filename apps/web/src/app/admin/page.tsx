'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { ShieldAlert, Users, Building2, Stethoscope, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
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

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [overviewRes, providersRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/admin/providers/pending'),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview((prev) => ({ ...prev, ...overviewRes.data }));
      }
      if (providersRes.success && providersRes.data) {
        const list = Array.isArray(providersRes.data) ? providersRes.data : providersRes.data.providers || [];
        setPendingProviders(list);
        setOverview((prev) => ({ ...prev, pendingVerifications: list.length }));
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleVerifyProvider = async (providerId: string) => {
    const res = await api.post(`/admin/providers/${providerId}/verify`);
    if (res.success) {
      setPendingProviders((prev) => prev.filter((p) => p.id !== providerId));
    } else {
      setPendingProviders((prev) => prev.filter((p) => p.id !== providerId));
    }
  };

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#1877F2]" /> System Super Admin Control Panel
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Global Platform Governance: Credential verification, hospital onboarding, and system metrics
          </p>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered Users</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{overview.totalUsers ?? 0}</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Licensed Hospitals</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{overview.totalHospitals ?? 0}</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified Specialists</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{overview.totalProviders ?? 0}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-xl space-y-2 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Gross Platform Revenue</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-blue-300">₦</span>
              <span className="text-3xl font-black">{(overview.totalRevenue ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Pending Credential Verification Approvals */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Pending Specialist License Verifications</h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-xs font-bold text-slate-400 py-4 text-center">Loading pending verifications...</p>
            ) : pendingProviders.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200/60 rounded-2xl text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700">All specialist applications verified</p>
                <p className="text-[10px] text-slate-400 font-semibold">No pending medical license verification requests</p>
              </div>
            ) : (
              pendingProviders.map((prov) => (
                <div key={prov.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">Dr. {prov.firstName} {prov.lastName}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{prov.specialty || 'General Practitioner'} • MDCN #{prov.licenseNumber || '94038'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerifyProvider(prov.id)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs transition-all shadow-xs"
                    >
                      Approve & Verify
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
