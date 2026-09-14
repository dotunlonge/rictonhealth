'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useRouter, useSearchParams } from 'next/navigation';
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

function AppointmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerIdParam = searchParams.get('providerId') || '';
  const scheduledAtParam = searchParams.get('scheduledAt') || '';
  const dateParam = searchParams.get('date') || '';
  const bookParam = searchParams.get('book') || '';

  const { user, appointments: storeAppointments } = useAppStore();
  const [appointmentsList, setAppointmentsList] = useState<AppointmentRecord[]>(() => {
    const list = storeAppointments || [];
    return list.map((a: any) => ({
      id: a.id,
      patientName: a.patientName || 'Patient Record',
      doctorName: a.doctorName || 'Medical Specialist',
      scheduledAt: a.scheduledAt || '',
      type: a.type || 'VIDEO',
      status: a.status || 'CONFIRMED',
    }));
  });
  const [loading, setLoading] = useState(() => !(storeAppointments && storeAppointments.length > 0));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');

  // Deep links into the Schedule Consultation modal:
  // - Doctor profile "Schedule" CTAs pass ?providerId=…&scheduledAt=…
  // - Dashboard calendar "+ Book Consultation" passes ?date=YYYY-MM-DD&book=true
  // - Dashboard "Book Consultation" (empty state) passes ?book=true
  const hasDeepLink = () => {
    return (
      providerIdParam !== '' ||
      dateParam !== '' ||
      bookParam === 'true' ||
      bookParam === '1' ||
      scheduledAtParam !== ''
    );
  };
  const [showBookModal, setShowBookModal] = useState(() => hasDeepLink());

  // New Booking State — built around the provider's REAL availability grid.
  // The backend rejects any slot outside the provider's configured windows
  // ("Provider is not available on this day" / "outside the availability
  // window" / "must align to the provider slot grid"), so the modal only
  // ever submits a slot returned by GET /appointments/slots/:providerId.
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => providerIdParam);
  const [consultType, setConsultType] = useState<'VIDEO' | 'IN_PERSON'>('VIDEO');
  const [slotDate, setSlotDate] = useState(() => {
    if (scheduledAtParam) {
      const d = new Date(scheduledAtParam);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    // Dashboard calendar deep link (?date=YYYY-MM-DD): validate shape
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomYear = tomorrow.getFullYear();
    const tomMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tomDay = String(tomorrow.getDate()).padStart(2, '0');
    return `${tomYear}-${tomMonth}-${tomDay}`;
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (scheduledAtParam) {
      const d = new Date(scheduledAtParam);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    return '';
  });
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState(false);
  const [booking, setBooking] = useState(false);

  // Synchronize modal state if query parameters change or deep link is navigated to
  useEffect(() => {
    const isDeep =
      providerIdParam !== '' ||
      dateParam !== '' ||
      bookParam === 'true' ||
      bookParam === '1' ||
      scheduledAtParam !== '';
    if (isDeep) {
      setShowBookModal(true);
      if (providerIdParam) {
        setSelectedDoctorId(providerIdParam);
      }
      if (scheduledAtParam) {
        const d = new Date(scheduledAtParam);
        if (!Number.isNaN(d.getTime())) {
          setSlotDate(d.toISOString().slice(0, 10));
          setSelectedSlot(d.toISOString());
        }
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        setSlotDate(dateParam);
      }
    }
  }, [providerIdParam, dateParam, bookParam, scheduledAtParam]);

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
        if (docs.length === 1 && !selectedDoctorId && !providerIdParam) {
          setSelectedDoctorId(docs[0].userId || docs[0].id);
        }
      }

      const rawAppts = apptRes.success
        ? Array.isArray(apptRes.data)
          ? apptRes.data
          : apptRes.data?.appointments || []
        : [];

      setAppointmentsList(
        rawAppts
          .filter((a: any) => a?.id)
          .map((a: any) => {
            const patientProfile = a.patient?.patientProfile || {};
            const patientName =
              patientProfile.firstName || patientProfile.lastName
                ? `${patientProfile.firstName || ''} ${patientProfile.lastName || ''}`.trim()
                : a.patient?.email || 'Patient Record';
            const providerProfile = a.provider?.providerProfile || {};
            const doctorName =
              providerProfile.firstName || providerProfile.lastName
                ? `Dr. ${providerProfile.firstName || ''} ${providerProfile.lastName || ''}`.trim()
                : a.provider?.email || 'Medical Specialist';
            return {
              id: a.id,
              patientName,
              doctorName,
              scheduledAt: a.scheduledAt
                ? new Date(a.scheduledAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—',
              type: a.type || 'VIDEO',
              status: a.status || 'PENDING',
            };
          })
      );
      setLoading(false);
    }
    loadData();
  }, [providerIdParam, selectedDoctorId]);

  const closeBookModal = () => {
    setShowBookModal(false);
    setSlots([]);
    setSlotsError(null);
    setSelectedSlot('');
    setDoctorError(null);
    setBookingMsg(null);
    if (typeof window !== 'undefined' && window.location.search) {
      router.replace('/appointments');
    }
  };

  // Load the provider's real availability grid whenever doctor or date changes.
  useEffect(() => {
    if (!showBookModal || !selectedDoctorId) return;
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      const res = await api.get(
        `/appointments/slots/${encodeURIComponent(selectedDoctorId)}?date=${encodeURIComponent(slotDate)}`
      );
      if (cancelled) return;
      setSlotsLoading(false);
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.slots || [];
        setSlots(list.filter((s: unknown) => typeof s === 'string'));
        // Drop a preselected slot if it is no longer on the grid.
        setSelectedSlot((prev) => (prev && list.includes(prev) ? prev : ''));
      } else {
        setSlots([]);
        // Never surface a raw "Validation error" string to patients — it is
        // a wire-protocol detail, not an explanation of what went wrong.
        const raw = res.error?.message || '';
        setSlotsError(
          !raw || /validation error/i.test(raw)
            ? 'We couldn’t check this doctor’s availability right now. Please try again.'
            : raw
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showBookModal, selectedDoctorId, slotDate]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (booking) return;

    // The backend requires a real provider — there is no "first available"
    // concept server-side, so an empty choice must stop here with guidance
    // instead of a red 400 from the API.
    if (!selectedDoctorId) {
      setDoctorError('Please choose a medical specialist first.');
      return;
    }
    setDoctorError(null);

    if (!selectedSlot) {
      setBookingMsg('Please pick an available time slot for this doctor.');
      setBookingError(true);
      setTimeout(() => setBookingMsg(null), 4000);
      return;
    }

    setBooking(true);
    const providerId =
      doctorsList.find((d) => (d.userId || d.id) === selectedDoctorId)?.userId ||
      doctorsList.find((d) => (d.userId || d.id) === selectedDoctorId)?.id ||
      selectedDoctorId;
    const selectedDoc = doctorsList.find((d) => (d.userId || d.id) === selectedDoctorId);
    const doctorName =
      selectedDoc?.firstName || selectedDoc?.lastName
        ? `Dr. ${selectedDoc.firstName || ''} ${selectedDoc.lastName || ''}`.trim()
        : 'Medical Specialist';

    // selectedSlot always comes from the availability grid, so it is
    // future-dated, minute-aligned, inside the provider window, and free.
    const res = await api.post(
      '/appointments',
      {
        providerId,
        scheduledAt: selectedSlot,
        type: consultType,
      },
      {
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`,
      }
    );

    setBooking(false);

    if (res.success && res.data?.id) {
      const newAppt: AppointmentRecord = {
        id: res.data.id,
        patientName: user?.firstName
          ? `${user.firstName} ${user.lastName || ''}`.trim()
          : user?.email || 'Patient Record',
        doctorName,
        scheduledAt: new Date(res.data.scheduledAt || selectedSlot).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        type: res.data.type || consultType,
        status: res.data.status || 'PENDING',
      };

      setAppointmentsList((prev) => [newAppt, ...prev]);
      closeBookModal();
      setBookingMsg('Appointment request sent. Awaiting provider confirmation.');
      setBookingError(false);
      setTimeout(() => setBookingMsg(null), 4000);
    } else {
      // Rare now (slot taken in a race, availability changed): say exactly
      // that and invite picking another slot instead of a dead end.
      const raw = res.error?.message || 'Failed to book appointment. Please try again.';
      const taken = /taken|conflict|processing|overlap/i.test(raw);
      setBookingMsg(taken ? 'That slot was just taken. Please pick another available time.' : raw);
      setBookingError(true);
      setTimeout(() => setBookingMsg(null), 6000);
    }
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
    const confirmed = appointmentsList.filter(
      (a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED'
    ).length;
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
              Book online telemedicine sessions, view specialist availability, and manage
              consultation schedules
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
          <div
            role={bookingError ? 'alert' : 'status'}
            className={`p-4 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
              bookingError
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {bookingError ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{bookingMsg}</span>
          </div>
        )}

        {/* Status Count Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Confirmed Sessions
              </span>
              <p className="text-3xl font-black text-slate-900 mt-1">{counts.confirmed}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Pending Approval
              </span>
              <p className="text-3xl font-black text-amber-600 mt-1">{counts.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cancelled / Closed
              </span>
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
                      <p className="text-xs font-bold text-slate-600">
                        No scheduled appointments found
                      </p>
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
                            <p className="font-extrabold text-slate-900 text-xs">
                              {apt.patientName}
                            </p>
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
            <div
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs"
              onClick={closeBookModal}
            />
            <form
              onSubmit={handleBookAppointment}
              className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900">Schedule Consultation</h2>
                <button
                  type="button"
                  onClick={closeBookModal}
                  aria-label="Close schedule consultation dialog"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label htmlFor="book-doctor" className="block font-bold text-slate-700 mb-1">
                    Select Medical Specialist <span aria-hidden="true">*</span>
                  </label>
                  <select
                    id="book-doctor"
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      setDoctorError(null);
                      setSelectedSlot('');
                    }}
                    aria-required="true"
                    aria-invalid={doctorError ? true : undefined}
                    aria-describedby={doctorError ? 'book-doctor-error' : undefined}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  >
                    <option value="">Choose a doctor to see real availability</option>
                    {doctorsList.map((doc) => (
                      <option key={doc.userId || doc.id} value={doc.userId || doc.id}>
                        Dr. {doc.firstName || ''} {doc.lastName || ''} (
                        {doc.specialty || doc.providerProfile?.specialization || 'General Practice'}
                        )
                      </option>
                    ))}
                  </select>
                  {doctorError && (
                    <p
                      id="book-doctor-error"
                      role="alert"
                      className="mt-1 font-semibold text-red-600"
                    >
                      {doctorError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Type</label>
                  <select
                    value={consultType}
                    onChange={(e) => setConsultType(e.target.value as 'VIDEO' | 'IN_PERSON')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  >
                    <option value="VIDEO">Video Consultation</option>
                    <option value="IN_PERSON">In-Person Visit</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="book-date" className="block font-bold text-slate-700">
                      Day
                    </label>
                    {dateParam && slotDate === dateParam && (
                      <span className="text-[10px] font-bold text-[#1877F2] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        Autofilled from calendar
                      </span>
                    )}
                  </div>
                  <input
                    id="book-date"
                    type="date"
                    required
                    value={slotDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSlotDate(e.target.value);
                        setSelectedSlot('');
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div>
                  <span id="book-slots-label" className="block font-bold text-slate-700 mb-1">
                    Available Time Slots <span aria-hidden="true">*</span>
                  </span>
                  {!selectedDoctorId ? (
                    <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-500">
                      Choose a doctor first — real open slots appear here.
                    </p>
                  ) : slotsLoading ? (
                    <p role="status" className="p-3 font-semibold text-slate-500">
                      Checking this doctor’s availability…
                    </p>
                  ) : slotsError ? (
                    <p
                      role="alert"
                      className="p-3 rounded-xl bg-red-50 border border-red-200 font-semibold text-red-600"
                    >
                      {slotsError}
                    </p>
                  ) : slots.length === 0 ? (
                    <p
                      role="status"
                      className="p-3 rounded-xl bg-amber-50 border border-amber-200 font-semibold text-amber-700"
                    >
                      No open slots on this day. Try another date.
                    </p>
                  ) : (
                    <div
                      role="radiogroup"
                      aria-labelledby="book-slots-label"
                      className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto"
                    >
                      {slots.map((slot) => {
                        const label = new Date(slot).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const active = selectedSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-2 py-2.5 rounded-xl font-bold border transition-all ${
                              active
                                ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-md'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#1877F2]'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={booking || !selectedDoctorId || !selectedSlot}
                className="w-full py-3 bg-[#1877F2] hover:bg-[#1565C0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20"
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

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold">
          Loading Appointments...
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}
