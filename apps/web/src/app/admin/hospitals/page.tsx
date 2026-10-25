'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  FileCheck2,
  UserCheck,
  Clock,
  Sparkles,
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
  users?: Array<{ email: string | null; status: string }>;
  isActive: boolean;
  createdAt?: string;
};

function AdminHospitalsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'pending' ? 'PENDING' : 'ALL';

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING'>(initialTab);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [pendingHospitals, setPendingHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [creating, setCreating] = useState(false);

  // Decision modal for pending applications
  const [decisionModal, setDecisionModal] = useState<{
    hospital: Hospital;
    verified: boolean;
  } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  // Add hospital form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
  });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const [allRes, pendingRes] = await Promise.all([
      api.get('/admin/hospitals'),
      api.get<{ hospitals: Hospital[] }>('/admin/hospitals/pending'),
    ]);

    if (allRes.success) {
      setHospitals(Array.isArray(allRes.data) ? allRes.data : allRes.data?.hospitals || []);
    } else {
      setFeedback({ message: allRes.error?.message || 'Failed to load hospital roster.', type: 'error' });
    }

    if (pendingRes.success) {
      setPendingHospitals(pendingRes.data?.hospitals || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  // Handle direct hospital onboarding (+ Add Hospital)
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);

    const res = await api.post('/admin/hospitals', formData);
    setCreating(false);

    if (res.success && res.data) {
      setHospitals((prev) => [res.data, ...prev]);
      setShowAddModal(false);
      setFeedback({
        message: `Hospital "${formData.name}" has been onboarded and activated.`,
        type: 'success',
      });
      setFormData({ name: '', email: '', phone: '', address: '', city: '', state: '', country: 'Nigeria' });
    } else {
      setFeedback({
        message: res.error?.message || 'Failed to onboard hospital. Check all required fields.',
        type: 'error',
      });
    }
  };

  // Handle application decision (approve / reject pending applicant)
  const executeDecision = async () => {
    if (!decisionModal) return;
    const { hospital, verified } = decisionModal;
    if (!verified && !decisionNotes.trim()) {
      setFeedback({ message: 'A rejection reason is strictly required.', type: 'error' });
      return;
    }

    setActing(hospital.id);
    setFeedback(null);
    const r = await api.post(`/admin/hospitals/${hospital.id}/verify`, {
      verified,
      notes: decisionNotes.trim() || undefined,
    });
    setActing(null);

    if (r.success) {
      setPendingHospitals((all) => all.filter((h) => h.id !== hospital.id));
      if (verified) {
        setHospitals((all) => [{ ...hospital, isActive: true }, ...all]);
      }
      setFeedback({
        message: verified
          ? `Hospital "${hospital.name}" approved. Linked facility admins have been activated.`
          : `Hospital application for "${hospital.name}" rejected.`,
        type: 'success',
      });
      setDecisionModal(null);
      setDecisionNotes('');
    } else {
      setFeedback({ message: r.error?.message || 'Decision failed.', type: 'error' });
    }
  };

  const currentList = activeTab === 'ALL' ? hospitals : pendingHospitals;

  const filteredList = currentList.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (h.name || '').toLowerCase();
    const email = (h.email || '').toLowerCase();
    const city = (h.address?.city || '').toLowerCase();
    const state = (h.address?.state || '').toLowerCase();
    const reg = (h.registrationNumber || '').toLowerCase();
    return name.includes(q) || email.includes(q) || city.includes(q) || state.includes(q) || reg.includes(q);
  });

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <Building2 className="w-3.5 h-3.5" /> Institutional Network & Facilities
              </span>
              <span className="text-xs text-slate-400 font-semibold">• {hospitals.length} Licensed Hospitals</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Hospital Management
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Onboard new healthcare centers, review accreditation applications, and oversee licensed clinical facilities.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add New Hospital
            </button>
            <button
              onClick={() => void loadAllData()}
              disabled={loading}
              title="Refresh Hospital List"
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

        {/* Tabs & Search Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          {/* Toggle Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ALL'
                  ? 'bg-white text-[#1877F2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Licensed Hospitals ({hospitals.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'PENDING'
                  ? 'bg-white text-[#1877F2] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Pending Applications ({pendingHospitals.length})
              {pendingHospitals.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'ALL'
                  ? 'Search hospitals by name, city, state, or email...'
                  : 'Search applications by name, CAC reg no, or email...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>
        </div>

        {/* Content List: Licensed Hospitals vs Pending Applications */}
        {loading ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading facilities...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-base">
              {activeTab === 'ALL' ? 'No Licensed Hospitals Found' : 'No Pending Applications'}
            </h3>
            <p className="text-slate-400 text-xs mt-1">
              {activeTab === 'ALL'
                ? 'Try a different search term, or click "+ Add New Hospital" to onboard one.'
                : 'All submitted facility onboarding requests have been verified.'}
            </p>
          </div>
        ) : activeTab === 'ALL' ? (
          /* Grid of Licensed Hospitals */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredList.map((h) => {
              const addr = h.address;
              const locationStr = [addr?.line1, addr?.city, addr?.state].filter(Boolean).join(', ');

              return (
                <div
                  key={h.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1877F2] to-blue-700 text-white font-extrabold flex items-center justify-center text-base shadow-sm">
                        {h.name?.[0] || 'H'}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          h.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {h.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5" />}
                        {h.isActive ? 'Licensed Active' : 'Inactive'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-snug">{h.name}</h3>
                      {locationStr && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{locationStr}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
                      {h.email && (
                        <p className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{h.email}</span>
                        </p>
                      )}
                      {h.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{h.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>
                      {h.createdAt
                        ? `Onboarded ${new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                        : 'Institutional Network'}
                    </span>
                    <span className="text-[#1877F2] font-bold">Licensed Facility</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List of Pending Hospital Applications */
          <div className="space-y-4">
            {filteredList.map((h) => {
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1877F2] flex items-center justify-center font-bold text-xs">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-700 truncate">
                            Admin: {primaryAdmin?.email || 'No linked applicant'}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            Status: <span className="text-amber-600 font-bold">{primaryAdmin?.status || 'PENDING'}</span> (will activate upon approval)
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          <FileCheck2 className="w-4 h-4" />
                        </div>
                        <div className="text-xs">
                          <p className="font-bold text-slate-700">Accreditation Files</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-semibold">
                            <span className={docs.licenseFileUploaded ? 'text-emerald-700' : 'text-slate-400'}>
                              • License: {docs.licenseFileUploaded ? 'Supplied' : 'Not attached'}
                            </span>
                            <span className={docs.cacFileUploaded ? 'text-emerald-700' : 'text-slate-400'}>
                              • CAC: {docs.cacFileUploaded ? 'Supplied' : 'Not attached'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Pending */}
                  <div className="flex lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0">
                    <button
                      onClick={() => {
                        setDecisionModal({ hospital: h, verified: true });
                        setDecisionNotes('');
                      }}
                      disabled={acting === h.id}
                      className="flex-1 lg:flex-none px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve Facility
                    </button>
                    <button
                      onClick={() => {
                        setDecisionModal({ hospital: h, verified: false });
                        setDecisionNotes('');
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

        {/* Modal: + Add New Hospital */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-[#1877F2] flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">
                      Register & Onboard Hospital
                    </h3>
                    <p className="text-xs text-slate-500">
                      Add a licensed healthcare facility directly into the active platform network.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Facility Name *
                    </label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Lagos University Teaching Hospital"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Official Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@facility.org"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contact Phone *
                    </label>
                    <input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 800 000 0000"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Physical Street Address *
                    </label>
                    <input
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address / landmark"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      City *
                    </label>
                    <input
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City (e.g. Ikeja, Abuja)"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      State *
                    </label>
                    <input
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="State (e.g. Lagos State)"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {creating ? 'Onboarding...' : 'Confirm Facility Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Pending Decision (Approve / Reject) */}
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

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider mb-2">
                  {decisionModal.verified ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  rows={3}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder={
                    decisionModal.verified
                      ? 'Add any special accreditation conditions...'
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
                  disabled={acting !== null || (!decisionModal.verified && !decisionNotes.trim())}
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

export default function AdminHospitalsPage() {
  return (
    <Suspense
      fallback={
        <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
          <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-3 text-slate-500 font-medium">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading Hospital Management...</span>
            </div>
          </div>
        </SidebarLayout>
      }
    >
      <AdminHospitalsContent />
    </Suspense>
  );
}

