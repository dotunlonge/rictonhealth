'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { Stethoscope, Star, Clock, CheckCircle2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProviderDoctor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  shiftHours: string;
  experienceYears: number;
  avatarUrl?: string;
  isAvailable: boolean;
}

export default function ProvidersPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderDoctor[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProviders() {
      setLoading(true);
      const res = await api.get('/users/providers');
      const rawList = res.success
        ? Array.isArray(res.data)
          ? res.data
          : res.data?.providers || []
        : [];

      setProviders(
        rawList.map((p: any) => ({
          id: p.id,
          name: `Dr. ${p.firstName || 'Medical'} ${p.lastName || 'Specialist'}`,
          specialization: p.providerProfile?.specialization || 'General Practice & Telemedicine',
          rating: p.providerProfile?.rating ? Number(p.providerProfile.rating) : 5.0,
          shiftHours: '9:00 AM - 5:00 PM',
          experienceYears: p.providerProfile?.experienceYears || 5,
          avatarUrl: p.avatarUrl || p.providerProfile?.avatarUrl,
          isAvailable: true,
        }))
      );
      setLoading(false);
    }
    loadProviders();
  }, []);

  const filteredProviders = providers.filter(
    (p) => selectedSpecialty === 'All' || p.specialization.toLowerCase().includes(selectedSpecialty.toLowerCase())
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
              Book online consultations, view shift availability, and review verified healthcare providers
            </p>
          </div>

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
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            Loading verified medical specialists directory...
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">No medical specialists currently registered under this specialty</p>
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
                        <img src={doc.avatarUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-7 h-7" />
                      )}
                    </div>

                    <div>
                      <h2 className="font-extrabold text-slate-900 text-sm">{doc.name}</h2>
                      <p className="text-xs font-bold text-[#1877F2]">{doc.specialization}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{doc.experienceYears} Years Clinical Experience</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span className="text-xs font-black text-slate-900">{doc.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Clock className="w-4 h-4 text-[#1877F2]" />
                    <span>{doc.shiftHours}</span>
                  </div>

                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Available Today</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                    Book Appointment
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
