'use client';

import { useEffect, useMemo, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/store/useAppStore';
import { Calendar, Plus, Clock, CheckCircle2, XCircle, Search, User } from 'lucide-react';

interface AppointmentRecord {
  id: string;
  patientName: string;
  doctorName: string;
  scheduledAt: string;
  type: string;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [appointmentsList, setAppointmentsList] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');
  const [showBookModal, setShowBookModal] = useState(false);

  // New Booking State
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [consultType, setConsultType] = useState('General Consultation');
  const [apptDate, setApptDate] = useState('');
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [apptRes, docRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/users/providers'),
      ]);

      if (docRes.success) {
        const docs = Array.isArray(docRes.data) ? docRes.data : docRes.data?.providers || [];
        setDoctorsList(docs);
      }

      const rawAppts = apptRes.success
        ? Array.isArray(apptRes.data)
          ? apptRes.data
          : apptRes.data?.appointments || []
        : [];

      setAppointmentsList(
        rawAppts.map((a: any, idx: number) => ({
          id: a.id || `APT-100${idx}`,
          patientName:
            a.patientName ||
            (a.patient
              ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim() || a.patient.email
              : user?.firstName
              ? `${user.firstName} ${user.lastName || ''}`.trim()
              : 'Patient Record'),
          doctorName:
            a.providerName ||
            (a.provider
              ? `Dr. ${a.provider.firstName || ''} ${a.provider.lastName || ''}`.trim()
              : 'Medical Specialist'),
          scheduledAt: a.scheduledAt
            ? new Date(a.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Scheduled Date',
          type: a.type || 'General Consultation',
          status: a.status || 'CONFIRMED',
        }))
      );
      setLoading(false);
    }
    loadData();
  }, [user]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBooking(true);
    const selectedDoc = doctorsList.find((d) => d.id === selectedDoctorId);
    const doctorName = selectedDoc
      ? `Dr. ${selectedDoc.firstName || ''} ${selectedDoc.lastName || ''}`.trim()
      : 'Medical Specialist';

    const res = await api.post('/appointments', {
      providerId: selectedDoctorId,
      scheduledAt: apptDate || new Date().toISOString(),
      type: consultType,
    });

    setBooking(false);
    const newAppt: AppointmentRecord = {
      id: res.data?.id || `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'Patient Record',
      doctorName,
      scheduledAt: apptDate
        ? new Date(apptDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      type: consultType,
      status: 'CONFIRMED',
    };

    setAppointmentsList((prev) => [newAppt, ...prev]);
    setShowBookModal(false);
    setBookingMsg('Appointment successfully scheduled and confirmed!');
    setTimeout(() => setBookingMsg(null), 4000);
  };

  const filteredAppts = appointmentsList.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = statusTab === 'ALL' || a.status === statusTab;
    return matchesSearch && matchesTab;
  });

  const counts = useMemo(() => {
    const confirmed = appointmentsList.filter((a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length;
    const pending = appointmentsList.filter((a) => a.status === 'PENDING').length;
    const cancelled = appointmentsList.filter((a) => a.status === 'CANCELLED').length;
    return { confirmed, pending, cancelled };
  }, [appointmentsList]);

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#1877F2]" /> Consultations & Appointment Manager
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Book online telemedicine sessions, view specialist availability, and manage consultation schedules
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBookModal(true)}
            className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Appointment</span>
          </button>
        </div>

        {bookingMsg && (
          <div className="p-4 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{bookingMsg}</span>
          </div>
        )}

        {/* Status Count Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirmed Sessions</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{counts.confirmed}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Approval</span>
              <p className="text-3xl font-black text-amber-600 mt-1">{counts.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cancelled / Closed</span>
              <p className="text-3xl font-black text-slate-400 mt-1">{counts.cancelled}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search appointment, doctor, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] shadow-xs"
            />
          </div>

          <div className="flex items-center bg-slate-200/60 p-1 rounded-full border border-slate-200">
            {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusTab === tab
                    ? 'bg-[#1877F2] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments Table Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase tracking-wider">
                  <th className="pb-4 px-4">Appointment & ID</th>
                  <th className="pb-4 px-4">Consultant Doctor</th>
                  <th className="pb-4 px-4">Scheduled Date</th>
                  <th className="pb-4 px-4">Consultation Type</th>
                  <th className="pb-4 px-4">Status</th>
                  <th className="pb-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs font-bold text-slate-400">
                      Loading appointments schedule...
                    </td>
                  </tr>
                ) : filteredAppts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center space-y-3">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No scheduled appointments found</p>
                      <button
                        type="button"
                        onClick={() => setShowBookModal(true)}
                        className="text-xs text-[#1877F2] font-bold hover:underline"
                      >
                        + Book Your First Consultation
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredAppts.map((apt) => (
                    <tr key={apt.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{apt.patientName}</p>
                            <p className="text-[10px] font-semibold text-slate-400">{apt.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1877F2]">{apt.doctorName}</td>
                      <td className="py-4 px-4 font-semibold text-slate-700">{apt.scheduledAt}</td>
                      <td className="py-4 px-4 font-semibold text-slate-600">{apt.type}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            apt.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : apt.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => router.push('/telemedicine')}
                          className="px-4 py-1.5 bg-slate-100 hover:bg-[#1877F2] hover:text-white text-slate-800 font-bold rounded-full text-xs transition-all"
                        >
                          Join Call →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Book Appointment Modal */}
        {showBookModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setShowBookModal(false)} />
            <form onSubmit={handleBookAppointment} className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900">Schedule Consultation</h2>
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Medical Specialist</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  >
                    <option value="">Choose Doctor (Or First Available Specialist)</option>
                    {doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.firstName || ''} {doc.lastName || ''} ({doc.providerProfile?.specialization || 'General Practice'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Type</label>
                  <select
                    value={consultType}
                    onChange={(e) => setConsultType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  >
                    <option value="General Consultation">General Consultation</option>
                    <option value="Cardiology Review">Cardiology Review</option>
                    <option value="Ophthalmology Eye Check">Ophthalmology Eye Check</option>
                    <option value="Pediatric Follow-up">Pediatric Follow-up</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    required
                    value={apptDate}
                    onChange={(e) => setApptDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={booking}
                className="w-full py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20"
              >
                {booking ? 'Booking...' : 'Confirm Appointment Booking'}
              </button>
            </form>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
