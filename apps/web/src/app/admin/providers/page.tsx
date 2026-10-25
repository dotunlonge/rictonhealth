'use client';

import { useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  Stethoscope,
  Pill,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Search,
  Building2,
  Calendar,
  FileCheck,
  ShieldAlert,
  X,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

type RoleTab = 'DOCTOR' | 'PHARMACIST';

type PendingProvider = {
  id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  specialty?: string;
  licenseNumber?: string;
  hospital?: { id: string; name: string } | null;
  pharmacyName?: string;
  role?: string;
  type?: string;
  createdAt?: string;
  submittedAt?: string;
};

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<PendingProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<RoleTab>('DOCTOR');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal dialog states
  const [activeModal, setActiveModal] = useState<{
    type: 'REJECT' | 'SUSPEND';
    provider: PendingProvider;
  } | null>(null);
  const [modalReason, setModalReason] = useState('');

  const load = useCallback(async (role: RoleTab) => {
    setLoading(true);
    const res = await api.get(
      role === 'PHARMACIST'
        ? '/admin/providers/pending?role=PHARMACIST'
        : '/admin/providers/pending'
    );
    if (res.success) {
      const list = Array.isArray(res.data) ? res.data : res.data?.providers || [];
      const filtered =
        role === 'PHARMACIST'
          ? list.filter(
              (p: any) => p.role === 'PHARMACIST' || p.pharmacyName || p.type === 'PHARMACIST'
            )
          : list.filter((p: any) => !p.role || p.role !== 'PHARMACIST' || !p.pharmacyName);
      setProviders(filtered);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(roleTab);
  }, [load, roleTab]);

  const handleVerify = async (providerId: string) => {
    setActing(providerId);
    setFeedback(null);
    const res = await api.post(`/admin/providers/${providerId}/verify`, { verified: true });
    setActing(null);
    if (res.success) {
      setProviders((prev) => prev.filter((p) => p.id !== providerId));
      setFeedback({ message: 'Provider medical license successfully approved and activated.', type: 'success' });
    } else {
      setFeedback({ message: res.error?.message || 'Verification decision failed.', type: 'error' });
    }
  };

  const executeModalAction = async () => {
    if (!activeModal || !modalReason.trim()) return;
    const { type, provider } = activeModal;
    setActing(provider.id);
    setFeedback(null);

    if (type === 'REJECT') {
      const res = await api.post(`/admin/providers/${provider.id}/verify`, {
        verified: false,
        notes: modalReason.trim(),
      });
      setActing(null);
      if (res.success) {
        setProviders((prev) => prev.filter((p) => p.id !== provider.id));
        setFeedback({ message: `Application for ${provider.firstName || provider.pharmacyName || 'provider'} rejected.`, type: 'success' });
        setActiveModal(null);
        setModalReason('');
      } else {
        setFeedback({ message: res.error?.message || 'Rejection failed.', type: 'error' });
      }
    } else if (type === 'SUSPEND') {
      const userId = provider.userId;
      if (!userId) {
        setFeedback({ message: 'No linked user account found to suspend.', type: 'error' });
        setActing(null);
        return;
      }
      const res = await api.patch(`/admin/users/${userId}/status`, {
        status: 'SUSPENDED',
        reason: modalReason.trim(),
      });
      setActing(null);
      if (res.success) {
        setProviders((prev) => prev.filter((p) => p.id !== provider.id));
        setFeedback({ message: `Provider account suspended.`, type: 'success' });
        setActiveModal(null);
        setModalReason('');
      } else {
        setFeedback({ message: res.error?.message || 'Suspension failed.', type: 'error' });
      }
    }
  };

  const isPharmacist = roleTab === 'PHARMACIST';

  const filteredProviders = providers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${p.firstName || ''} ${p.lastName || ''} ${p.pharmacyName || ''}`.toLowerCase();
    const email = (p.email || '').toLowerCase();
    const spec = (p.specialization || p.specialty || '').toLowerCase();
    const license = (p.licenseNumber || '').toLowerCase();
    return name.includes(q) || email.includes(q) || spec.includes(q) || license.includes(q);
  });

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <FileCheck className="w-3.5 h-3.5" /> MDCN & PCN Regulatory Queue
              </span>
              <span className="text-xs text-slate-400 font-semibold">• High Priority Triage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Provider Approvals & Licensure
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Verify medical credentials, practice licenses, and facility affiliations before granting platform booking authority.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/60 shadow-inner">
              <button
                onClick={() => setRoleTab('DOCTOR')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  roleTab === 'DOCTOR'
                    ? 'bg-white text-[#1877F2] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" /> Medical Doctors
              </button>
              <button
                onClick={() => setRoleTab('PHARMACIST')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  roleTab === 'PHARMACIST'
                    ? 'bg-white text-[#1877F2] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pill className="w-3.5 h-3.5" /> Pharmacists
              </button>
            </div>

            <button
              onClick={() => void load(roleTab)}
              disabled={loading}
              title="Refresh Queue"
              className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertOctagon className="w-4 h-4 text-rose-600" />}
              {feedback.message}
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search by name, email, specialty, or license number...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>
          <div className="text-xs font-bold text-slate-500">
            Showing {filteredProviders.length} of {providers.length} pending
          </div>
        </div>

        {/* Providers Table / Cards */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-4 px-6">{isPharmacist ? 'Pharmacy / Pharmacist' : 'Physician'}</th>
                  <th className="py-4 px-4 text-center">Specialization</th>
                  <th className="py-4 px-4 text-center">License / MDCN</th>
                  <th className="py-4 px-4 text-center">Affiliated Facility</th>
                  <th className="py-4 px-4 text-center">Submitted</th>
                  <th className="py-4 px-6 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400">
                      <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      Loading verification queue...
                    </td>
                  </tr>
                ) : filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                        ✓
                      </div>
                      <p className="font-bold text-slate-800 text-base">Queue Cleared</p>
                      <p className="text-slate-400 text-xs mt-1">
                        No {isPharmacist ? 'pharmacists' : 'doctors'} currently pending verification
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map((provider) => {
                    const initials =
                      provider.firstName?.[0] || provider.pharmacyName?.[0] || (isPharmacist ? 'P' : 'D');
                    return (
                      <tr key={provider.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                              {initials.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {isPharmacist
                                  ? provider.pharmacyName || `${provider.firstName || ''} ${provider.lastName || ''}`
                                  : `Dr. ${provider.firstName || ''} ${provider.lastName || ''}`}
                              </p>
                              <p className="text-xs text-slate-500 font-medium">{provider.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#1877F2]">
                            {provider.specialization || provider.specialty || 'General Practice'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {provider.licenseNumber || 'Verified Pending'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center text-xs text-slate-600 font-medium">
                          {provider.hospital?.name ? (
                            <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              {provider.hospital.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">Independent</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center text-xs text-slate-500">
                          {provider.createdAt || provider.submittedAt ? (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(provider.createdAt || provider.submittedAt!).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleVerify(provider.id)}
                              disabled={acting === provider.id}
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                setActiveModal({ type: 'REJECT', provider });
                                setModalReason('');
                              }}
                              disabled={acting === provider.id}
                              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button
                              onClick={() => {
                                setActiveModal({ type: 'SUSPEND', provider });
                                setModalReason('');
                              }}
                              disabled={acting === provider.id}
                              className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Dialog for Reject / Suspend */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                      activeModal.type === 'REJECT' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">
                      {activeModal.type === 'REJECT' ? 'Reject Application' : 'Suspend Account'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target: {activeModal.provider.firstName || activeModal.provider.pharmacyName || 'Provider'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                  Mandatory Audit Reason
                </label>
                <textarea
                  rows={3}
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder={
                    activeModal.type === 'REJECT'
                      ? 'Specify why credentials were rejected (e.g., license expired, unverified degree)...'
                      : 'Specify violation or reason for account suspension...'
                  }
                  className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void executeModalAction()}
                  disabled={!modalReason.trim() || acting !== null}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 ${
                    activeModal.type === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {acting ? 'Processing...' : activeModal.type === 'REJECT' ? 'Confirm Rejection' : 'Confirm Suspension'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
