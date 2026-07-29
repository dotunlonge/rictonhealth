'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const navigationItems = [
  { label: 'Home', href: '/dashboard', icon: '🏠' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appiontment', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earns', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Tele-medicine', href: '/telemedicine/demo', icon: '📞' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
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
  const [activeNav, setActiveNav] = useState('Appiontment');
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

  const { daysInMonth, firstDayOfWeek, year: calYear, month: calMonth } = useMemo(
    () => getCalendarGrid(monthOffset),
    [monthOffset]
  );
  const today = new Date();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  // User details
  const doctorName = userProfile?.providerProfile?.firstName
    ? `${userProfile.providerProfile.title || 'Dr.'} ${userProfile.providerProfile.firstName} ${userProfile.providerProfile.lastName}`
    : 'Olivia Martins';
  const avatarUrl = userProfile?.providerProfile?.avatarUrl || null;

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // 1. User Profile
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setUserProfile(userRes.data);
      }

      // 2. Appointments List
      const apptsRes = await api.get('/appointments');
      if (apptsRes.success && apptsRes.data) {
        const list = Array.isArray(apptsRes.data) ? apptsRes.data : apptsRes.data.appointments || [];
        setAppointmentsList(list);
      }

      // 3. Provider Availability Slots for Selected Date
      if (userRes.data?.id) {
        const dateStr = new Date().toISOString().split('T')[0];
        const slotsRes = await api.get(`/appointments/availability/${userRes.data.id}?date=${dateStr}`);
        if (slotsRes.success && Array.isArray(slotsRes.data)) {
          const formatted = slotsRes.data.map((iso: string) => formatTime(iso));
          setAvailableSlots(formatted);
        }
      }

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

  const morningSlots = availableSlots.length > 0
    ? availableSlots.filter((s) => s.includes('AM') || s.startsWith('12:'))
    : ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM'];

  const eveningSlots = availableSlots.length > 0
    ? availableSlots.filter((s) => s.includes('PM') && !s.startsWith('12:'))
    : ['7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM', '12:00 AM', '1:00 AM'];

  const handleLogout = () => {
    api.setToken(null);
    api.clearToken();
    router.push('/login');
  };

  return (
    <main className="bg-[#E8EEF9] min-h-screen flex font-sans antialiased text-slate-800">
      {/* Blue Left Sidebar */}
      <aside className="w-60 bg-[#1877F2] text-white flex flex-col justify-between shrink-0 shadow-lg sticky top-0 h-screen z-20">
        <div>
          {/* User Avatar & Name Header */}
          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-white/10 space-y-3">
            <div className="w-20 h-20 rounded-full border-2 border-white/40 overflow-hidden bg-white/20 flex items-center justify-center shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt={doctorName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👩‍⚕️</span>
              )}
            </div>
            <h2 className="font-bold text-lg text-white leading-snug">{doctorName}</h2>
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="relative w-96">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search for anything"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors">
              🔔
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          {/* Top Calendar & Time Slots Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar Card */}
            <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
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
                    className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrentMonth && date === today.getDate()
                        ? 'bg-[#1877F2] text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </section>

            {/* Time Slot Picker Card */}
            <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-6">
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
                          ? 'bg-[#1877F2] text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                    <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">Evening</span>
                    <p className="text-[10px] text-slate-400">7:00 PM to 1:00 AM</p>
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
                          ? 'bg-[#1877F2] text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
          <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
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
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Patient</th>
                    <th className="pb-3">Date/Time</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Contact</th>
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
                      const patientName = appt.patient?.patientProfile?.firstName
                        ? `${appt.patient.patientProfile.firstName} ${appt.patient.patientProfile.lastName}`
                        : 'John Doe';
                      const email = appt.patient?.email || 'Doe@gmail.com';
                      return (
                        <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 font-bold text-slate-700">{statusFilter}</td>
                          <td className="py-4 font-bold text-slate-900">{patientName}</td>
                          <td className="py-4 text-slate-600">
                            <p>{formatDateFull(appt.scheduledAt)}</p>
                            <p className="text-[10px] text-slate-400">{formatTime(appt.scheduledAt)}</p>
                          </td>
                          <td className="py-4 font-medium text-slate-700">
                            {appt.type || appt.reason || 'New Patient'}
                          </td>
                          <td className="py-4 text-slate-600">{email}</td>
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
    </main>
  );
}
