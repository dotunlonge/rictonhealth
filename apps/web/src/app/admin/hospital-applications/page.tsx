'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Search,
  ExternalLink,
  AlertCircle,
  X,
  Mail,
  Phone,
  FileCheck2,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

type Hospital = {
  id: string;
  name: string;
  registrationNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: { line1?: string; city?: string; state?: string; country?: string } | null;
  documents?: {
    licenseFileUploaded?: boolean;
    cacFileUploaded?: boolean;
    accreditationDoc?: boolean;
  } | null;
  users?: Array<{ email: string | null; status: string; firstName?: string; lastName?: string }>;
  createdAt?: string;
};

export default function HospitalApplicationsPage() {
  const [items, setItems] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal dialog states
  const [decisionModal, setDecisionModal] = useState<{
    hospital: Hospital;
    verified: boolean;
  } | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await api.get<{ hospitals: Hospital[] }>('/admin/hospitals/pending');
    if (r.success) {
      setItems(r.data?.hospitals || []);
    } else {
      setFeedback({
        message: r.error?.message || 'Unable to load pending hospital applications.',
        type: 'error',
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const executeDecision = async () => {
    if (!decisionModal) return;
    const { hospital, verified } = decisionModal;
    if (!verified && !notes.trim()) {
      setFeedback({ message: 'A rejection reason is strictly required.', type: 'error' });
      return;
    }

    setActing(hospital.id);
    setFeedback(null);
    const r = await api.post(`/admin/hospitals/${hospital.id}/verify`, {
      verified,
      notes: notes.trim() || undefined,
    });
    setActing(null);

    if (r.success) {
      setItems((all) => all.filter((h) => h.id !== hospital.id));
      setFeedback({
        message: verified
          ? `Hospital "${hospital.name}" approved. Linked facility admins have been activated.`
          : `Hospital application for "${hospital.name}" rejected.`,
        type: 'success',
      });
      setDecisionModal(null);
      setNotes('');
    } else {
      setFeedback({ message: r.error?.message || 'Decision failed.', type: 'error' });
    }
  };

  const filteredItems = items.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (h.name || '').toLowerCase();
    const reg = (h.registrationNumber || '').toLowerCase();
    const email = (h.email || '').toLowerCase();
    const adminEmail = (h.users?.[0]?.email || '').toLowerCase();
    return name.includes(q) || reg.includes(q) || email.includes(q) || adminEmail.includes(q);
  });

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <Building2 className="w-3.5 h-3.5" /> Institutional Accreditation Queue
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Healthcare Facilities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Hospital Applications & Facility Review
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Verify legal corporate registration (CAC), facility certifications, and approve linked Hospital Administrators.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/hospitals"
              className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              All Licensed Hospitals <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => void load()}
              disabled={loading}
              title="Refresh Applications"
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
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              {feedback.message}
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by hospital name, CAC registration number, or applicant email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>
          <div className="text-xs font-bold text-slate-500">
            {filteredItems.length} facility applications pending review
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading pending hospital applications...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl">
              ✓
            </div>
            <h3 className="font-bold text-slate-800 text-base">All Caught Up!</h3>
            <p className="text-slate-400 text-xs mt-1">
              There are no pending healthcare facility applications awaiting verification.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredItems.map((h) => {
              const primaryAdmin = h.users?.[0];
              const docs = h.documents || {};
              return (
                <div
                  key={h.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-4 flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1877F2] to-blue-700 text-white font-black flex items-center justify-center text-lg shadow-sm shrink-0">
                        {h.name?.[0] || 'H'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-lg font-extrabold text-slate-900">{h.name}</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Awaiting Accreditation
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                          <span>
                            <strong>CAC / Reg No:</strong> {h.registrationNumber || 'Pending Submission'}
                          </span>
                          {h.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {h.email}
                            </span>
                          )}
                          {h.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> {h.phone}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Metadata Badges & Checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {/* Linked Facility Administrator */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1877F2] flex items-center justify-center font-bold text-xs">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-700 truncate">
                            Admin: {primaryAdmin?.email || 'No linked admin applicant'}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            Current Status: <span className="text-amber-600 font-bold">{primaryAdmin?.status || 'PENDING'}</span> (will activate upon approval)
                          </p>
                        </div>
                      </div>

                      {/* Regulatory Documents Status */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-slate-700">Compliance Files</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-semibold">
                            <span className={docs.licenseFileUploaded ? 'text-emerald-700' : 'text-slate-400'}>
                              • License: {docs.licenseFileUploaded ? 'Supplied' : 'Not attached'}
                            </span>
                            <span className={docs.cacFileUploaded ? 'text-emerald-700' : 'text-slate-400'}>
                              • CAC Certificate: {docs.cacFileUploaded ? 'Supplied' : 'Not attached'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0">
                    <button
                      onClick={() => {
                        setDecisionModal({ hospital: h, verified: true });
                        setNotes('');
                      }}
                      disabled={acting === h.id}
                      className="flex-1 lg:flex-none px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Facility
                    </button>
                    <button
                      onClick={() => {
                        setDecisionModal({ hospital: h, verified: false });
                        setNotes('');
                      }}
                      disabled={acting === h.id}
                      className="flex-1 lg:flex-none px-6 py-2.5 rounded-2xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Decision Dialog Modal */}
        {decisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                      decisionModal.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {decisionModal.verified ? <ShieldCheck className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">
                      {decisionModal.verified ? 'Approve Hospital' : 'Reject Application'}
                    </h3>
                    <p className="text-xs text-slate-500">{decisionModal.hospital.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDecisionModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {decisionModal.verified ? (
                <div className="text-xs text-slate-600 leading-relaxed bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-2xl">
                  Approving this hospital activates the facility profile and elevates the linked applicant (
                  <strong>{decisionModal.hospital.users?.[0]?.email || 'Facility Admin'}</strong>) to an active
                  <strong> HOSPITAL_ADMIN</strong>.
                </div>
              ) : (
                <div className="text-xs text-slate-600 leading-relaxed bg-rose-50/70 border border-rose-100 p-3.5 rounded-2xl">
                  Rejection will log an immutable audit event and prevent the applicant from managing platform doctors or patient appointments.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                  {decisionModal.verified ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    decisionModal.verified
                      ? 'Add any special accreditation conditions or references...'
                      : 'Provide explicit reasons why this facility was rejected...'
                  }
                  className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void executeDecision()}
                  disabled={acting !== null || (!decisionModal.verified && !notes.trim())}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 ${
                    decisionModal.verified ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {acting ? 'Processing...' : decisionModal.verified ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
