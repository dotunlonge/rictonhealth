'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const navigationItems = [
  { label: 'Home', href: '/dashboard/hospital', icon: '🏠' },
  { label: 'Doctor', href: '/providers', icon: '🩺' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appiontment', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earnings', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Tele-medicine', href: '/telemedicine', icon: '📞' },
  { label: 'Inbox', href: '/inbox', icon: '✉️' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

// --- Formatting Helpers ---
function formatDateShort(iso?: string) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso?: string) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getPatientName(appointment: any): string {
  const profile = appointment?.patient?.patientProfile;
  if (profile?.firstName && profile?.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  if (appointment?.patient?.email) {
    return appointment.patient.email.split('@')[0];
  }
  return 'Patient';
}

function getDoctorName(appointment: any): string {
  const profile = appointment?.provider?.providerProfile;
  if (profile?.firstName && profile?.lastName) {
    return `Dr. ${profile.firstName} ${profile.lastName}`;
  }
  if (appointment?.provider?.email) {
    return `Dr. ${appointment.provider.email.split('@')[0]}`;
  }
  return 'Doctor';
}

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

function computeProfileCompletion(user: any): {
  percentage: number;
  steps: { label: string; done: boolean }[];
} {
  const profile = user?.pharmacyProfile || user?.providerProfile || user?.patientProfile || {};
  const steps = [
    { label: 'Setup account', done: !!user?.emailVerified },
    { label: 'Upload your profile', done: !!user?.avatarUrl || !!profile?.avatarUrl },
    { label: 'Personal information', done: !!(user?.email && user?.phone) },
    { label: 'Professional credentials', done: !!(user?.hospitalId || profile?.specialty) },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { percentage: Math.round((doneCount / steps.length) * 100), steps };
}

function buildMonthlyChart(trend: any[]): { month: string; value: number }[] {
  const months = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const byMonth: Record<string, number> = {};
  for (const item of trend) {
    const d = new Date(item.period);
    if (!isNaN(d.getTime())) {
      const key = months[d.getMonth()];
      byMonth[key] = (byMonth[key] || 0) + (item.amount || 0);
    }
  }
  return Object.entries(byMonth).map(([month, amount]) => ({
    month,
    value: Math.min(Math.max(Math.round(amount / 1000), 10), 140),
  }));
}

export default function ElementHospitalHomePage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Home');
  const [monthOffset, setMonthOffset] = useState(0);
  const [patientOverviewRange, setPatientOverviewRange] = useState('Day');
  const [revenueRange, setRevenueRange] = useState('Month');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // --- Real Dynamic state from APIs ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hospitalStats, setHospitalStats] = useState<{
    totalDoctors: number;
    totalAppointments: number;
    activePatients: number;
  }>({ totalDoctors: 0, totalAppointments: 0, activePatients: 0 });
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [walletData, setWalletData] = useState<{ balance: number; weekly: number }>({
    balance: 0,
    weekly: 0,
  });
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  const adminName = currentUser?.email ? currentUser.email.split('@')[0] : 'Admin';
  const profileData = useMemo(() => computeProfileCompletion(currentUser), [currentUser]);
  const revenueChart = useMemo(() => buildMonthlyChart(revenueTrend), [revenueTrend]);

  const { daysInMonth, firstDayOfWeek, year: calYear, month: calMonth } = useMemo(
    () => getCalendarGrid(monthOffset),
    [monthOffset]
  );
  const today = new Date();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  const newAppointment = appointmentsList.length > 0 ? appointmentsList[0] : null;

  useEffect(() => {
    async function loadAllData() {
      setLoading(true);

      // 1. Current User Profile
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setCurrentUser(userRes.data);
      }

      // 2. Hospital Dashboard Stats (GET /users/dashboard/hospital or GET /analytics/overview)
      const hospitalRes = await api.get('/users/dashboard/hospital');
      if (hospitalRes.success && hospitalRes.data?.stats) {
        setHospitalStats({
          activePatients: Number(hospitalRes.data.stats.activePatients) || 0,
          totalDoctors: Number(hospitalRes.data.stats.totalDoctors) || 0,
          totalAppointments: Number(hospitalRes.data.stats.totalAppointments) || 0,
        });
      } else {
        const overviewRes = await api.get('/analytics/overview');
        if (overviewRes.success && overviewRes.data) {
          setHospitalStats({
            activePatients: Number(overviewRes.data.totalPatients) || 0,
            totalDoctors: Number(overviewRes.data.totalProviders) || 0,
            totalAppointments: Number(overviewRes.data.totalAppointments) || 0,
          });
        }
      }

      // 3. Appointments List
      const apptRes = await api.get('/appointments');
      if (apptRes.success && apptRes.data) {
        const list = Array.isArray(apptRes.data) ? apptRes.data : apptRes.data.appointments || [];
        setAppointmentsList(list);
      }

      // 4. Doctors List
      const providersRes = await api.get('/users/providers');
      if (providersRes.success && providersRes.data) {
        const provs = Array.isArray(providersRes.data)
          ? providersRes.data
          : providersRes.data.providers || [];
        setDoctorsList(provs);
      }

      // 5. Wallet
      const walletRes = await api.get('/wallet');
      if (walletRes.success && walletRes.data) {
        const bal = Number(walletRes.data.balance) || 0;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const txs = walletRes.data.transactions || [];
        const weekly = txs
          .filter((tx: any) => tx.type === 'CREDIT' && new Date(tx.createdAt) >= oneWeekAgo)
          .reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
        setWalletData({ balance: bal, weekly });
      }

      // 6. Revenue Trend
      const revRes = await api.get('/analytics/revenue');
      if (revRes.success && revRes.data?.trend) {
        setRevenueTrend(revRes.data.trend);
      }

      // 7. Notifications
      const notifRes = await api.get('/notifications');
      if (notifRes.success && notifRes.data?.notifications) {
        setNotificationsList(notifRes.data.notifications);
      }

      setLoading(false);
    }

    loadAllData();
  }, []);

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
          {/* Brand Header */}
          <div className="px-6 py-6 flex items-center gap-3">
            <img src="/logo.svg" alt="Ricton emblem" className="h-8 w-8 object-contain" />
            <span className="text-2xl font-bold tracking-tight text-white">Ricton</span>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-2 space-y-1">
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

        {/* Logout Link */}
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

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          {/* Search Input */}
          <div className="relative w-96">
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

          {/* User Profile / Notifications */}
          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors">
              🔔
              {notificationsList.some((n) => !n.isRead) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600">
                👤
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 capitalize">{adminName}</p>
                <p className="text-[10px] font-medium text-slate-500">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid Content Area */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left & Middle Column (2 Spans) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Stat Summary Cards Header */}
              <section className="grid grid-cols-3 gap-6" aria-label="Hospital Statistics">
                {/* Patient Stat Card */}
                <article className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-xl font-bold">
                    👥
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 text-sm block">Patient</span>
                    <p className="text-4xl font-extrabold text-slate-900 mt-1">
                      {hospitalStats.activePatients}
                    </p>
                  </div>
                </article>

                {/* Doctor Stat Card */}
                <article className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-xl font-bold">
                    🩺
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 text-sm block">Doctor</span>
                    <p className="text-4xl font-extrabold text-slate-900 mt-1">
                      {hospitalStats.totalDoctors}
                    </p>
                  </div>
                </article>

                {/* Appointment Stat Card */}
                <article className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-xl font-bold">
                    📅
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 text-sm block">Appointment</span>
                    <p className="text-4xl font-extrabold text-slate-900 mt-1">
                      {hospitalStats.totalAppointments}
                    </p>
                  </div>
                </article>
              </section>

              {/* Patient Overview Chart Section */}
              <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg text-slate-900">Patient Overview</h2>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Child
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Adult
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Elderly
                      </span>
                    </div>
                  </div>
                  <select
                    value={patientOverviewRange}
                    onChange={(e) => setPatientOverviewRange(e.target.value)}
                    className="px-4 py-2 bg-[#1877F2] text-white rounded-full text-xs font-bold border-none outline-none cursor-pointer"
                  >
                    <option value="Day">Day</option>
                    <option value="Week">Week</option>
                    <option value="Month">Month</option>
                  </select>
                </div>

                {/* Multi-bar Chart Container */}
                <div className="h-56 flex items-end justify-between px-4 pb-2 border-b border-slate-200 gap-2">
                  {['4 Jul', '5 Jul', '6 Jul', '7 Jul', '8 Jul', '9 Jul', '10 Jul', '11 Jul', '12 Jul', '13 Jul'].map(
                    (dayLabel, i) => (
                      <div key={dayLabel} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex items-end gap-1 h-44">
                          <div
                            className="w-2 bg-green-500 rounded-t-xs"
                            style={{ height: `${(i * 13 + 30) % 110 + 20}px` }}
                          />
                          <div
                            className="w-2 bg-amber-400 rounded-t-xs"
                            style={{ height: `${(i * 19 + 40) % 130 + 15}px` }}
                          />
                          <div
                            className="w-2 bg-red-600 rounded-t-xs"
                            style={{ height: `${(i * 17 + 25) % 90 + 10}px` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 mt-2">{dayLabel}</span>
                      </div>
                    )
                  )}
                </div>
              </section>

              {/* Revenue & Monthly Chart Section */}
              <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-slate-900">Revenue</h2>
                  <select
                    value={revenueRange}
                    onChange={(e) => setRevenueRange(e.target.value)}
                    className="px-4 py-2 bg-[#1877F2] text-white rounded-full text-xs font-bold border-none outline-none cursor-pointer"
                  >
                    <option value="Month">Month</option>
                    <option value="Year">Year</option>
                  </select>
                </div>

                {/* Revenue Bar Chart Visual */}
                <div className="h-56 flex items-end justify-between px-6 pb-2 border-b border-slate-200">
                  {revenueChart.length > 0 ? (
                    revenueChart.map((item) => (
                      <div key={item.month} className="flex flex-col items-center justify-end h-full">
                        <div
                          className="w-10 bg-[#1877F2] rounded-t-xl transition-all hover:bg-blue-700"
                          style={{ height: `${item.value}px` }}
                        />
                        <span className="mt-3 text-xs font-semibold text-slate-600">{item.month}</span>
                      </div>
                    ))
                  ) : (
                    ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug'].map((m, idx) => (
                      <div key={m} className="flex flex-col items-center justify-end h-full">
                        <div
                          className="w-10 bg-[#1877F2] rounded-t-xl"
                          style={{ height: `${[20, 30, 45, 60, 40, 75, 90, 50][idx]}px` }}
                        />
                        <span className="mt-3 text-xs font-semibold text-slate-600">{m}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Earnings Summary Footer */}
                <div className="flex items-center gap-12 pt-2">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-full bg-amber-400 text-white flex items-center justify-center text-2xl font-bold shadow-xs">
                      🪙
                    </span>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Weekly earning
                      </p>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {walletData.weekly.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Total earning
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900">
                      {walletData.balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </section>

              {/* Patient Appointment Table */}
              <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
                <h2 className="font-bold text-lg text-slate-900">Patient appointment</h2>

                {appointmentsList.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4">No patient appointments found in database.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-3">Name</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Doctor</th>
                          <th className="pb-3">Treatment</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                        {appointmentsList.slice(0, 5).map((appt, idx) => (
                          <tr key={appt.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4">
                              <p className="font-bold text-slate-900">{getPatientName(appt)}</p>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {formatTime(appt.scheduledAt)}
                              </p>
                            </td>
                            <td className="py-4 text-slate-600">{formatDateShort(appt.scheduledAt)}</td>
                            <td className="py-4 text-slate-600">{getDoctorName(appt)}</td>
                            <td className="py-4 text-slate-600">{appt.type || appt.reason || 'Consultation'}</td>
                            <td className="py-4 text-right">
                              <span className="px-3 py-1 bg-green-500 text-white rounded-full font-bold text-[10px]">
                                {appt.status || 'CONFIRMED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* Right Sidebar Column (1 Span) */}
            <div className="space-y-8">
              {/* Calendar Widget Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMonthOffset((v) => v - 1)}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-500 font-bold text-sm"
                  >
                    ‹
                  </button>
                  <span className="font-bold text-sm text-slate-900">{getMonthName(monthOffset)}</span>
                  <button
                    type="button"
                    onClick={() => setMonthOffset((v) => v + 1)}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-500 font-bold text-sm"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-y-3 text-center text-xs font-semibold text-slate-400">
                  {calendarDays.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <span key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((date) => (
                    <button
                      key={date}
                      type="button"
                      className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
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

              {/* New Appointment Preview Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
                <h2 className="font-bold text-base text-slate-900">New appointment</h2>

                {newAppointment ? (
                  <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold">
                        👤
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {newAppointment.type || newAppointment.reason || 'Consultation'}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          {formatTime(newAppointment.scheduledAt)}
                        </p>
                        <p className="text-xs font-semibold text-slate-600">
                          {getDoctorName(newAppointment)}
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-lg">›</span>
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs py-2">No new appointments queued.</p>
                )}
              </section>

              {/* Complete Profile Radial Progress Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
                <h2 className="font-bold text-base text-slate-900">Complete Profile</h2>

                <div className="flex items-center gap-5">
                  {/* Radial Progress Ring */}
                  <div className="relative w-20 h-20 rounded-full border-4 border-amber-400 border-t-green-500 border-r-red-500 flex items-center justify-center shrink-0">
                    <span className="font-extrabold text-xl text-slate-900">
                      {profileData.percentage}%
                    </span>
                  </div>

                  {/* Checklist */}
                  <ol className="space-y-2 text-xs font-bold text-slate-700 flex-1">
                    {profileData.steps.map((step) => (
                      <li key={step.label} className="flex items-center justify-between">
                        <span>{step.label}</span>
                        <span
                          className={`h-1.5 rounded-full ${step.done ? 'w-6 bg-green-500' : 'w-2 bg-red-600'}`}
                        />
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              {/* Doctors Schedule List Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
                <h2 className="font-bold text-base text-slate-900">Doctors Schedule</h2>

                {doctorsList.length === 0 ? (
                  <p className="text-slate-500 text-xs py-2">No active doctors registered in hospital.</p>
                ) : (
                  <div className="space-y-4">
                    {doctorsList.slice(0, 4).map((doc, idx) => (
                      <div key={doc.id || idx} className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-none last:pb-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg">
                            👨‍⚕️
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">
                              {doc.specialty || 'Specialist'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">10 AM - 12 AM</p>
                            <p className="text-xs font-semibold text-slate-600">
                              Dr. {doc.firstName || doc.user?.email?.split('@')[0] || 'Doctor'} {doc.lastName || ''}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold text-white ${
                            doc.status === 'UNAVAILABLE' ? 'bg-red-600' : 'bg-green-500'
                          }`}
                        >
                          {doc.status === 'UNAVAILABLE' ? 'Unavailable' : 'Available'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
