'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { Stethoscope, Star, Clock, CheckCircle2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mapProviderSummary, type ProviderSummary } from '@/lib/api-contract-mappers';
import { useCurrentUser } from '@/store/useAppStore';

export default function ProvidersPage() {
  const router = useRouter();
  const user = useCurrentUser();
  // Provider onboarding is a staff action — patients must never see an
  // "Add / Register Doctor" CTA (it previously routed them into the doctor
  // onboarding flow).
  const canRegisterDoctors = user?.role === 'SUPER_ADMIN' || user?.role === 'HOSPITAL_ADMIN';
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProviders() {
      setLoading(true);
      setLoadError(null);
      const res = await api.get('/users/providers');
      if (!res.success) {
        setProviders([]);
        setLoadError(res.error?.message || 'The medical specialist directory could not be loaded.');
        setLoading(false);
        return;
      }
      const rawList = Array.isArray(res.data) ? res.data : res.data?.providers || [];

      setProviders(rawList.map(mapProviderSummary));
      setLoading(false);
    }
    loadProviders();
  }, []);

  const filteredProviders = providers.filter(
    (p) =>
      selectedSpecialty === 'All' ||
      p.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-[#1877F2]" /> Find Doctors & Medical Specialists
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Book online consultations, view shift availability, and review verified healthcare
              providers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Specialty:</span>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
              >
                <option value="All">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Telemedicine">Telemedicine & Internal Medicine</option>
                <option value="Ophthalmology">Ophthalmology & Eye Care</option>
                <option value="Endocrinology">Endocrinology & Diabetes</option>
                <option value="General">General Practice</option>
              </select>
            </div>

            {canRegisterDoctors && (
              <button
                onClick={() => router.push('/onboarding/doctor')}
                className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0"
              >
                + Add / Register Doctor
              </button>
            )}
          </div>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            Loading verified medical specialists directory...
          </div>
        ) : loadError ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-rose-200/80">
            <Stethoscope className="w-10 h-10 text-rose-300 mx-auto" />
            <p className="text-xs font-bold text-rose-700">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs text-[#1877F2] font-bold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              No medical specialists currently registered under this specialty
            </p>
            <button
              type="button"
              onClick={() => setSelectedSpecialty('All')}
              className="text-xs text-[#1877F2] font-bold hover:underline"
            >
              View All Registered Providers
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredProviders.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 hover:border-[#1877F2]/40 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1877F2] border border-blue-100 flex items-center justify-center font-bold overflow-hidden shrink-0">
                      {doc.avatarUrl ? (
                        <img
                          src={doc.avatarUrl}
                          alt={doc.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <h2 className="font-extrabold text-slate-900 text-sm">{doc.name}</h2>
                      <p className="text-xs font-bold text-[#1877F2]">{doc.specialty}</p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {doc.yearsExperience} Years Clinical Experience
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span className="text-xs font-black text-slate-900">
                      {doc.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Clock className="w-4 h-4 text-[#1877F2]" />
                    <span>View live appointment slots</span>
                  </div>

                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{doc.isVerified ? 'Verified provider' : 'Verification pending'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/providers/${doc.id}`)}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all shadow-xs text-center"
                  >
                    View Doctor Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/telemedicine')}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-blue-200 text-[#1877F2] font-bold rounded-2xl text-xs transition-all shadow-xs text-center"
                  >
                    Direct Call
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/appointments')}
                    className="flex-1 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs transition-all shadow-xs text-center"
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
