'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { mapProviderDetail, type ProviderDetail } from '@/lib/api-contract-mappers';
import {
  Stethoscope,
  Star,
  Clock,
  Phone,
  MessageSquare,
  User,
  Award,
  BookOpen,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<ProviderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    async function loadDoctorDetails() {
      setLoading(true);
      try {
        const res = await api.get(`/users/providers/${doctorId}`);
        if (res.success && res.data) {
          setDoctor(mapProviderDetail(res.data));
        } else {
          setDoctor(null);
        }
      } catch (err) {
        console.warn('Error loading doctor details', err);
      }
      setLoading(false);
    }
    loadDoctorDetails();
  }, [doctorId]);

  const loadSlots = async (date: string) => {
    setSelectedDate(date);
    if (!date) {
      setTimeSlots([]);
      return;
    }
    setSlotsLoading(true);
    const res = await api.get<string[]>(
      `/appointments/slots/${encodeURIComponent(doctorId)}?date=${encodeURIComponent(date)}`
    );
    setTimeSlots(res.success && Array.isArray(res.data) ? res.data : []);
    setSlotsLoading(false);
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="max-w-6xl mx-auto p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          Loading doctor profile & schedule details...
        </div>
      </SidebarLayout>
    );
  }

  if (!doctor) {
    return (
      <SidebarLayout>
        <div className="max-w-6xl mx-auto p-12 text-center space-y-4 bg-white rounded-3xl border border-slate-200/80">
          <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Doctor profile not found</p>
          <button
            onClick={() => router.push('/providers')}
            className="px-5 py-2.5 bg-[#1877F2] text-white text-xs font-bold rounded-full"
          >
            Back to Doctors Directory
          </button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back Link */}
        <button
          onClick={() => router.push('/providers')}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#1877F2] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to All Doctors
        </button>

        {/* Hero Header Card */}
        <div className="bg-gradient-to-r from-blue-950 via-[#1877F2] to-indigo-900 rounded-[35px] p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Doctor Avatar */}
              <div className="w-32 h-32 rounded-3xl bg-white/10 p-1.5 border border-white/20 shadow-2xl overflow-hidden shrink-0">
                {doctor.avatarUrl ? (
                  <img src={doctor.avatarUrl} alt={doctor.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-2xl">
                    {doctor.name.charAt(4) || 'D'}
                  </div>
                )}
              </div>

              {/* Doctor Details */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{doctor.name}</h1>
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-sm font-semibold text-blue-100 mt-1">{doctor.specialty}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2 flex-wrap justify-center sm:justify-start">
                  <button
                    onClick={() => router.push('/telemedicine')}
                    className="px-5 py-2.5 bg-white text-[#1877F2] hover:bg-blue-50 text-xs font-bold rounded-full shadow-md transition-all flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4 fill-current" /> Call Doctor
                  </button>
                  <button
                    onClick={() => router.push('/inbox')}
                    className="px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold rounded-full transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Send Message
                  </button>
                  <button
                    onClick={() => router.push('/appointments')}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-full shadow-md transition-all"
                  >
                    Book Consultation
                  </button>
                </div>
              </div>
            </div>

            {/* Rating Badge */}
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span className="text-lg font-black">{doctor.rating.toFixed(1)}</span>
              <span className="text-xs font-semibold text-blue-200">Rating</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Left Column (Schedule & About), Right Column (Today's Appointment Calendar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shift Duty Hours Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#1877F2]" /> Duty Shifts & Availability
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-5 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-bold shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Hospital</span>
                    <h3 className="text-base font-black text-slate-900">{doctor.hospitalName || 'Independent provider'}</h3>
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Consultation fee</span>
                    <h3 className="text-base font-black text-slate-900">
                      {doctor.consultationFee !== undefined ? `₦${doctor.consultationFee.toLocaleString()}` : 'Contact provider'}
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* About & Clinical Experience Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#1877F2]" /> About Doctor
                </h2>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-3">{doctor.bio}</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-[#1877F2]" /> Education & Credentials
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                    {doctor.licenseNumber || doctor.email || 'Credentials are pending publication.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-[#1877F2]" /> Clinical Experience
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                    {doctor.yearsExperience} years of clinical experience
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Today's Appointments & Slot Booking Calendar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Live appointment slots</h3>
              </div>

              <label className="block text-xs font-bold text-slate-600">
                Consultation date
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => void loadSlots(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                />
              </label>

              {/* Timed Slot List */}
              <div className="space-y-3">
                {slotsLoading ? (
                  <p className="text-xs font-semibold text-slate-500">Loading live availability…</p>
                ) : timeSlots.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-500">
                    {selectedDate ? 'No available slots for this date.' : 'Choose a date to load availability.'}
                  </p>
                ) : (
                  timeSlots.map((slot) => (
                    <div
                      key={slot}
                      className="p-4 rounded-2xl border transition-all bg-emerald-50/50 border-emerald-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-extrabold text-slate-900">
                          {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => router.push(`/appointments?providerId=${encodeURIComponent(doctorId)}&scheduledAt=${encodeURIComponent(slot)}`)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl shadow-xs"
                        >
                          Book Slot
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
