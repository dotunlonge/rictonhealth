'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const navigationItems = [
  { label: 'Home', href: '/dashboard', icon: '🏠' },
  { label: 'Doctor', href: '/providers', icon: '🩺' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appointments', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earnings', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Telemedicine', href: '/telemedicine', icon: '📞' },
  { label: 'Inbox', href: '/inbox', icon: '✉️' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

function getMonthName(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getCalendarGrid(offset: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + offset;
  const target = new Date(year, month, 1);
  const daysInMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = target.getDay();
  return { daysInMonth, firstDayOfWeek, year: target.getFullYear(), month: target.getMonth() };
}

function formatDateFull(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Appointments');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM');
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [calendarView, setCalendarView] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Dynamic API Data ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Pane States ---
  const [showBookPane, setShowBookPane] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  const { daysInMonth, firstDayOfWeek, year: calYear, month: calMonth } = useMemo(
    () => getCalendarGrid(monthOffset),
    [monthOffset]
  );
  const today = new Date();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  // User details
  const doctorName = userProfile?.providerProfile?.firstName
    ? `${userProfile.providerProfile.title || 'Dr.'} ${userProfile.providerProfile.firstName} ${userProfile.providerProfile.lastName}`
    : 'Admin User';
  const avatarUrl = userProfile?.providerProfile?.avatarUrl || null;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setUserProfile(userRes.data);
      }

      // 2. Appointments List (Mocking for now to match UI perfectly)
      const mockAppts = Array.from({ length: 8 }).map((_, i) => ({
        id: `APT-100${i}`,
        patientName: i % 2 === 0 ? 'Alex Johnson' : 'Sarah Connor',
        email: 'alex@example.com',
        scheduledAt: new Date(Date.now() + i * 86400000).toISOString(),
        type: i % 3 === 0 ? 'Follow-up' : 'Consultation',
        status: i % 4 === 0 ? 'CANCELLED' : (i % 2 === 0 ? 'CONFIRMED' : 'PENDING'),
        doctorName: 'Dr. Smith'
      }));
      setAppointmentsList(mockAppts);
      setLoading(false);
    }
    loadData();
  }, []);

  // Compute counts by status
  const counts = useMemo(() => {
    const booked = appointmentsList.filter((a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED').length;
    const pending = appointmentsList.filter((a) => a.status === 'PENDING').length;
    const cancelled = appointmentsList.filter((a) => a.status === 'CANCELLED').length;
    return { booked, pending, cancelled };
  }, [appointmentsList]);

  // Filtered appointments by table dropdown
  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'Booked') {
      return appointmentsList.filter((a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED');
    }
    if (statusFilter === 'Cancelled') {
      return appointmentsList.filter((a) => a.status === 'CANCELLED');
    }
    return appointmentsList.filter((a) => a.status === 'PENDING' || !a.status);
  }, [appointmentsList, statusFilter]);

  const morningSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'];
  const eveningSlots = ['1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

  const handleLogout = () => {
    api.setToken(null);
    api.clearToken();
    router.push('/login');
  };

  return (
    <main className="bg-[#E8EEF9] min-h-screen flex font-sans antialiased text-slate-800 overflow-hidden relative">
      {/* Blue Left Sidebar */}
      <aside className="w-60 bg-[#1877F2] text-white flex flex-col justify-between shrink-0 shadow-lg sticky top-0 h-screen z-20">
        <div>
          <div className="px-6 py-6 flex items-center gap-3 border-b border-white/10">
            <img src="/logo.svg" alt="Ricton emblem" className="h-8 w-8 object-contain" />
            <span className="text-2xl font-bold tracking-tight text-white">Ricton</span>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-4 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setActiveNav(item.label)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  activeNav === item.label
                    ? 'bg-white text-[#1877F2] font-bold shadow-md'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all text-left"
          >
            <span className="text-lg">↪️</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 z-10 shadow-sm relative">
          <div className="absolute inset-0 bg-[#E8EEF9] opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1877F2 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }} />
          <div className="relative w-96 z-10">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search for patient, doctor, or appointment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4 z-10">
            <button 
              onClick={() => setShowBookPane(true)}
              className="px-6 py-2.5 bg-[#1877F2] hover:bg-blue-700 text-white font-bold rounded-full text-xs shadow-md transition-colors flex items-center gap-2"
            >
              <span>+</span> Book Appointment
            </button>
            <button className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors border border-slate-200">
              🔔
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600">
                👤
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6 relative z-0">
          {/* Top Calendar & Time Slots Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar Card */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMonthOffset((v) => v - 1)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    ‹
                  </button>
                  <span className="font-bold text-sm text-slate-900">{getMonthName(monthOffset)}</span>
                  <button
                    type="button"
                    onClick={() => setMonthOffset((v) => v + 1)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                  >
                    ›
                  </button>
                </div>

                {/* View Pills */}
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 p-1 rounded-full">
                  {(['Day', 'Week', 'Month', 'Year'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setCalendarView(view)}
                      className={`px-3 py-1 rounded-full transition-all ${
                        calendarView === view
                          ? 'bg-[#1877F2] text-white font-bold shadow-xs'
                          : 'hover:text-slate-800'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 gap-1">
                {calendarDays.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              {/* Date Grid */}
              <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-700 gap-y-3">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((date) => (
                  <button
                    key={date}
                    type="button"
                    className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCurrentMonth && date === today.getDate()
                        ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </section>

            {/* Time Slot Picker Card */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Morning</span>
                    <p className="text-[10px] text-slate-400">9:00 AM to 12:00 PM</p>
                  </div>
                  <button type="button" className="text-[10px] font-bold text-[#1877F2] hover:underline">
                    + Add slot
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {morningSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedSlot === slot
                          ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Afternoon / Evening</span>
                    <p className="text-[10px] text-slate-400">1:00 PM to 4:00 PM</p>
                  </div>
                  <button type="button" className="text-[10px] font-bold text-[#1877F2] hover:underline">
                    + Add slot
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {eveningSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedSlot === slot
                          ? 'bg-[#1877F2] text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Summary Badges Bar */}
          <section className="flex items-center gap-4" aria-label="Appointment Counters">
            <div className="px-6 py-3 bg-[#06bb00] text-white font-extrabold text-xs rounded-full flex items-center gap-3 shadow-xs">
              <span>Booked</span>
              <span className="bg-white text-[#06bb00] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">
                {counts.booked}
              </span>
            </div>
            <div className="px-6 py-3 bg-amber-400 text-white font-extrabold text-xs rounded-full flex items-center gap-3 shadow-xs">
              <span>Pending</span>
              <span className="bg-white text-amber-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">
                {counts.pending}
              </span>
            </div>
            <div className="px-6 py-3 bg-red-600 text-white font-extrabold text-xs rounded-full flex items-center gap-3 shadow-xs">
              <span>Cancelled</span>
              <span className="bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">
                {counts.cancelled}
              </span>
            </div>
          </section>

          {/* Filter Dropdown & Appointments Table Card */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-end">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-5 py-2 bg-[#1877F2] text-white rounded-full text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="Pending">Pending</option>
                <option value="Booked">Booked</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 font-bold tracking-wider">
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Patient</th>
                    <th className="pb-3 px-4">Date/Time</th>
                    <th className="pb-3 px-4">Type</th>
                    <th className="pb-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-medium">
                        No {statusFilter.toLowerCase()} appointments found.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => {
                      return (
                        <tr 
                          key={appt.id} 
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                          onClick={() => setSelectedAppointment(appt)}
                        >
                          <td className="py-4 px-4 font-bold text-slate-700">{statusFilter}</td>
                          <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                              👤
                            </div>
                            {appt.patientName}
                          </td>
                          <td className="py-4 px-4 text-slate-600">
                            <p className="font-bold text-slate-800">{formatDateFull(appt.scheduledAt)}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{formatTime(appt.scheduledAt)}</p>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-600">
                            {appt.type}
                          </td>
                          <td className="py-4 px-4">
                            <button className="text-[#1877F2] font-bold text-xs hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                              Manage →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Slide-over Pane: Book Appointment */}
      {showBookPane && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowBookPane(false)} />
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Book Appointment</h2>
              <button onClick={() => setShowBookPane(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Patient</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
                  <input type="text" placeholder="Search by name or ID" className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Doctor</label>
                <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white appearance-none">
                  <option>Any Available Doctor</option>
                  <option>Dr. Smith (Cardiology)</option>
                  <option>Dr. Jane (Pediatrics)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Appointment Type</label>
                <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white appearance-none">
                  <option>In-Person Consultation</option>
                  <option>Telemedicine / Video Call</option>
                  <option>Follow-up</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date</label>
                  <input type="date" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Time</label>
                  <input type="time" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Visit</label>
                <textarea rows={4} placeholder="Describe the symptoms or reason for visit..." className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white resize-none"></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setShowBookPane(false)}
                className="w-full py-3.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Pane: Appointment Details (Reschedule) */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAppointment(null)} />
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-[#E8EEF9]">
              <h2 className="text-xl font-bold text-slate-900">Appointment Details</h2>
              <button onClick={() => setSelectedAppointment(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors font-bold">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedAppointment.patientName}</h3>
                  <p className="text-sm font-medium text-slate-500">{selectedAppointment.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm font-bold text-slate-900">{formatDateFull(selectedAppointment.scheduledAt)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                  <p className="text-sm font-bold text-slate-900">{formatTime(selectedAppointment.scheduledAt)}</p>
                </div>
                <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor</p>
                  <p className="text-sm font-bold text-[#1877F2]">{selectedAppointment.doctorName}</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2">Actions</h4>
                <div className="space-y-3">
                  <button className="w-full py-3 px-4 bg-white border border-[#1877F2] text-[#1877F2] font-bold rounded-xl text-sm shadow-sm hover:bg-blue-50 transition-colors text-left flex justify-between items-center">
                    Reschedule Appointment
                    <span>📅</span>
                  </button>
                  <button className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 font-bold rounded-xl text-sm shadow-sm hover:bg-red-50 transition-colors text-left flex justify-between items-center">
                    Cancel Appointment
                    <span>❌</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
