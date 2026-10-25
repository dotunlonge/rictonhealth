'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';

type Hospital = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; country?: string } | null;
  isActive: boolean;
  createdAt?: string;
};

export default function AdminHospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
  });

  const loadHospitals = async () => {
    setLoading(true);
    const res = await api.get('/admin/hospitals');
    if (res.success) {
      setHospitals(Array.isArray(res.data) ? res.data : res.data?.hospitals || []);
    } else {
      setFeedback({ message: res.error?.message || 'Failed to load hospitals list.', type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadHospitals();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);

    const res = await api.post('/admin/hospitals', formData);
    setCreating(false);

    if (res.success && res.data) {
      setHospitals((prev) => [res.data, ...prev]);
      setShowForm(false);
      setFeedback({ message: `Hospital "${formData.name}" onboarded successfully.`, type: 'success' });
      setFormData({ name: '', email: '', phone: '', address: '', city: '', state: '', country: 'Nigeria' });
    } else {
      setFeedback({ message: res.error?.message || 'Failed to onboard hospital.', type: 'error' });
    }
  };

  const filteredHospitals = hospitals.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (h.name || '').toLowerCase();
    const email = (h.email || '').toLowerCase();
    const city = (h.address?.city || '').toLowerCase();
    const state = (h.address?.state || '').toLowerCase();
    return name.includes(q) || email.includes(q) || city.includes(q) || state.includes(q);
  });

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <Building2 className="w-3.5 h-3.5" /> Healthcare Institutional Network
              </span>
              <span className="text-xs text-slate-400 font-semibold">• {hospitals.length} Facilities</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Hospital & Medical Center Directory
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Accredited health facilities licensed to run inpatient & outpatient telemedicine consultations.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/hospital-applications"
              className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Review Pending Applications
            </Link>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add New Hospital
            </button>
            <button
              onClick={() => void loadHospitals()}
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

        {/* Create Hospital Modal/Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-3xl p-6 sm:p-7 border border-blue-200 shadow-md space-y-5 animate-in fade-in zoom-in-98"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-[#1877F2] flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Register Licensed Medical Facility
                  </h3>
                  <p className="text-xs text-slate-500">
                    Onboard a hospital or clinic to permit doctor roster attachment and facility billing.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hospital Name *
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
                  Official Facility Email *
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@luth.org.ng"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Official Contact Phone *
                </label>
                <input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+234 800 000 0000"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Physical Street Address *
                </label>
                <input
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Idi-Araba, Surulere"
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
                  placeholder="Lagos"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  State / Territory *
                </label>
                <input
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Lagos State"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50"
              >
                {creating ? 'Onboarding facility...' : 'Confirm Facility Registration'}
              </button>
            </div>
          </form>
        )}

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search hospitals by name, city, state, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>
          <div className="text-xs font-bold text-slate-500">
            {filteredHospitals.length} hospitals listed
          </div>
        </div>

        {/* Hospital Cards Grid */}
        {loading ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading licensed facilities...</p>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
            <h3 className="font-bold text-slate-800 text-base">No Facilities Found</h3>
            <p className="text-slate-400 text-xs mt-1">Try another search keyword or onboard a new facility.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredHospitals.map((h) => {
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
        )}
      </div>
    </SidebarLayout>
  );
}
