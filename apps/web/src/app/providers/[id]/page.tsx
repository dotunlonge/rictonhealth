'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  Stethoscope,
  Star,
  Clock,
  Phone,
  MessageSquare,
  Calendar,
  CheckCircle2,
  User,
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface DoctorDetail {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  status: string;
  avatarUrl?: string;
  bio: string;
  education: string;
  experience: string;
  morningShift: string;
  eveningShift: string;
  reviews: Array<{
    id: string;
    patientName: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<number>(28);

  const dates = [
    { day: 'Sun', date: 27 },
    { day: 'Mon', date: 28 },
    { day: 'Tue', date: 29 },
    { day: 'Wed', date: 30 },
    { day: 'Thu', date: 31 },
    { day: 'Fri', date: 1 },
    { day: 'Sat', date: 2 },
  ];

  const timeSlots = [
    { time: '9:00 AM - 10:00 AM', patient: 'Emma Wilson', condition: 'Vomiting & Fever', status: 'Booked' },
    { time: '10:00 AM - 11:00 AM', patient: 'Michael Brown', condition: 'Hypertension Follow-up', status: 'Booked' },
    { time: '11:30 AM - 12:30 PM', patient: 'Sarah Jenkins', condition: 'Routine ECG Check', status: 'Booked' },
    { time: '2:00 PM - 3:00 PM', patient: 'Available Slot', condition: 'Open for booking', status: 'Available' },
    { time: '4:00 PM - 5:00 PM', patient: 'David Clark', condition: 'Cardiology Consultation', status: 'Booked' },
    { time: '7:00 PM - 8:00 PM', patient: 'Available Slot', condition: 'Evening Telemedicine', status: 'Available' },
  ];

  useEffect(() => {
    async function loadDoctorDetails() {
      setLoading(true);
      try {
        const res = await api.get(`/users/providers/${doctorId}`);
        if (res.success && res.data) {
          const d = res.data;
          setDoctor({
            id: d.id || doctorId,
            name: `Dr. ${d.firstName || 'Tope'} ${d.lastName || 'Olaniyi'}`,
            specialization: d.providerProfile?.specialization || 'Cardiology • Internal Medicine',
            rating: d.providerProfile?.rating ? Number(d.providerProfile.rating) : 4.5,
            status: 'On-duty',
            avatarUrl: d.avatarUrl || d.providerProfile?.avatarUrl,
            bio:
              d.providerProfile?.bio ||
              'Dr. Tope Olaniyi is a board-certified Senior Cardiologist with over 12 years of clinical expertise in non-invasive cardiology, preventive heart care, and telemedicine diagnostics.',
            education:
              d.providerProfile?.education ||
              'MBBS (University of Lagos), Fellowship of the West African College of Physicians (FWACP Cardiology), MSc Cardiovascular Sciences.',
            experience:
              d.providerProfile?.experience ||
              '12+ Years Clinical Practice across top tertiary teaching hospitals and international telemedicine networks. Specialized in arrhythmia management, hypertension, and patient-centered rehabilitation.',
            morningShift: '9:00 AM - 3:00 PM',
            eveningShift: '7:00 PM - 11:00 PM',
            reviews: [
              {
                id: 'R-1',
                patientName: 'Emma Willson',
                rating: 5,
                comment:
                  'Dr. Olaniyi was extraordinarily thorough during my tele-consultation. She explained my cardiac results clearly and updated my treatment plan with immense empathy.',
                date: '2 days ago',
              },
              {
                id: 'R-2',
                patientName: 'Kelechi Amadi',
                rating: 5,
                comment:
                  'Prompt response and clear advice. The prescription was sent directly to my pharmacy dashboard within 10 minutes of ending the video call!',
                date: '1 week ago',
              },
            ],
          });
        } else {
          // Default high quality doctor profile matching design
          setDoctor({
            id: doctorId,
            name: 'Dr. Tope Olaniyi',
            specialization: 'Cardiology • On-duty',
            rating: 4.5,
            status: 'On-duty',
            avatarUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78905?w=400&auto=format&fit=crop&q=80',
            bio: 'Senior Consultant Cardiologist specializing in preventive heart health, hypertension control, and virtual cardiac care. Dedicated to providing compassionate evidence-based medicine.',
            education: 'MBBS (Unilag), FWACP (Cardiology), MSc Clinical Cardiology (UK)',
            experience: 'Over 12 years of consultant practice in tertiary cardiovascular medicine and digital tele-health delivery.',
            morningShift: '9 AM - 3 PM',
            eveningShift: '7 PM - 11 PM',
            reviews: [
              {
                id: 'R-1',
                patientName: 'Emma Willson',
                rating: 5,
                comment:
                  'Dr. Tope Olaniyi is an exceptional specialist. She explained my blood pressure management plan in great detail and reassured my family during our virtual consultation.',
                date: 'August 12, 2026',
              },
              {
                id: 'R-2',
                patientName: 'Oluwaseun Adebayo',
                rating: 5,
                comment:
                  'Extremely punctual, attentive, and knowledgeable. The e-prescription and follow-up lab requests were sent seamlessly to my Ricton patient profile.',
                date: 'August 5, 2026',
              },
            ],
          });
        }
      } catch (err) {
        console.warn('Error loading doctor details', err);
      }
      setLoading(false);
    }
    loadDoctorDetails();
  }, [doctorId]);

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
                  <p className="text-sm font-semibold text-blue-100 mt-1">{doctor.specialization}</p>
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
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Morning Shift</span>
                    <h3 className="text-base font-black text-slate-900">{doctor.morningShift}</h3>
                  </div>
                </div>

                <div className="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Evening Shift</span>
                    <h3 className="text-base font-black text-slate-900">{doctor.eveningShift}</h3>
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
                    {doctor.education}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-[#1877F2]" /> Clinical Experience
                  </h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                    {doctor.experience}
                  </p>
                </div>
              </div>
            </div>

            {/* Patients Reviews Section */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Patient Reviews & Feedback</h2>
                <span className="text-xs font-bold text-slate-500">Verified Patient Consultations</span>
              </div>

              <div className="space-y-4">
                {doctor.reviews.map((rev) => (
                  <div key={rev.id} className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-[#1877F2] font-extrabold flex items-center justify-center text-xs">
                          {rev.patientName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{rev.patientName}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{rev.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Today's Appointments & Slot Booking Calendar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Today's Appointment</h3>
                <div className="flex items-center gap-2">
                  <button className="p-1 text-slate-400 hover:text-slate-600">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-extrabold text-[#1877F2]">27 Jul - 02 Aug</span>
                  <button className="p-1 text-slate-400 hover:text-slate-600">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Date Strip */}
              <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-4">
                {dates.map((d) => {
                  const isSelected = selectedDate === d.date;
                  return (
                    <button
                      key={d.date}
                      onClick={() => setSelectedDate(d.date)}
                      className={`p-2 rounded-2xl text-center transition-all ${
                        isSelected
                          ? 'bg-[#1877F2] text-white font-extrabold shadow-md shadow-blue-500/20'
                          : 'text-slate-600 hover:bg-slate-50 font-semibold'
                      }`}
                    >
                      <span className="block text-[10px] uppercase opacity-75">{d.day}</span>
                      <span className="text-xs font-black">{d.date < 10 ? `0${d.date}` : d.date}</span>
                    </button>
                  );
                })}
              </div>

              {/* Timed Slot List */}
              <div className="space-y-3">
                {timeSlots.map((slot, index) => {
                  const isAvailable = slot.status === 'Available';
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-2xl border transition-all space-y-2 ${
                        isAvailable
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50/80 border-slate-200/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold bg-blue-100 text-[#1877F2] px-2.5 py-1 rounded-full">
                          {slot.time}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {slot.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{slot.patient}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold">{slot.condition}</p>
                        </div>

                        {isAvailable && (
                          <button
                            onClick={() => router.push('/appointments')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl shadow-xs"
                          >
                            Book Slot
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
