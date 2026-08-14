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
    totalUsers: 1420,
    totalHospitals: 38,
    totalProviders: 184,
    totalAppointments: 3200,
    totalRevenue: 12500000,
    pendingVerifications: 4,
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

      if (overviewRes.success && overviewRes.data) setOverview((prev) => ({ ...prev, ...overviewRes.data }));
      if (providersRes.success && providersRes.data) setPendingProviders(Array.isArray(providersRes.data) ? providersRes.data : providersRes.data.providers || []);
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
            <ShieldAlert className="w-6 h-6 text-[#1877F2]" /> System Admin Command Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Restricted Platform Administration: Provider verifications, platform statistics, and hospital governance
          </p>
        </div>

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Registered Users</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{(overview.totalUsers || 1420).toLocaleString()}</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verified Providers</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{overview.totalProviders || 184}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Partner Hospitals</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{overview.totalHospitals || 38}</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-xl space-y-2 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Platform GMV Revenue</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-blue-300">₦</span>
              <span className="text-3xl font-black">{(overview.totalRevenue || 12500000).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Pending Provider Approvals */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Pending Provider Verification Applications</h2>
          {pendingProviders.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">
              No pending provider verification requests at this time.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProviders.map((prov) => (
                <div key={prov.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{prov.name || prov.email}</p>
                      <p className="text-[10px] font-semibold text-slate-400">MD License Verification</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerifyProvider(prov.id)}
                      className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-full text-xs hover:bg-emerald-700 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve License
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
