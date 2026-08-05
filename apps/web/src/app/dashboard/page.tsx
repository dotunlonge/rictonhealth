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
  { label: 'Tele-medicine', href: '/telemedicine', icon: '📞' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function formatTimeRange(iso: string, durationMinutes: number = 60) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmt(start)} - ${fmt(end)}`;
}

function getPatientName(appointment: any): string {
  const profile = appointment.patient?.patientProfile;
  if (profile?.firstName && profile?.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  return appointment.patient?.email || 'Patient';
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
  const profile = user?.providerProfile || user?.patientProfile || {};
  const steps = [
    { label: 'Setup account', done: !!user?.emailVerified },
    { label: 'Upload your profile', done: !!user?.avatarUrl || !!profile?.avatarUrl },
    { label: 'Personal information', done: !!(profile?.firstName || user?.email) },
    { label: 'Professional credentials', done: !!profile?.specialty },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { percentage: Math.round((doneCount / steps.length) * 100), steps };
}

function buildMonthlyChart(trend: any[]): { month: string; value: number }[] {
  const months = ['Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const byMonth: Record<string, number> = {};
  for (const item of trend) {
    const d = new Date(item.period);
    const key = months[d.getMonth()];
    byMonth[key] = (byMonth[key] || 0) + item.amount;
  }
  return Object.entries(byMonth).map(([month, amount]) => ({
    month,
    value: Math.min(Math.max(Math.round(amount / 1000), 20), 140),
  }));
}

export default function ElementDoctorHomePage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Home');
  const [monthOffset, setMonthOffset] = useState(0);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic API State
  const [userProfile, setUserProfile] = useState<any>(null);
  const [providerStats, setProviderStats] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(35000);
  const [weeklyTransactions, setWeeklyTransactions] = useState<number>(3700);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [rewardsBalance, setRewardsBalance] = useState<number>(12000);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [ratingScore, setRatingScore] = useState<number>(4.5);

  const doctorFirstName = userProfile?.providerProfile?.firstName || 'Olivia';
  const doctorLastName = userProfile?.providerProfile?.lastName || 'Martins';
  const doctorFullName = [doctorFirstName, doctorLastName].filter(Boolean).join(' ');
  const avatarUrl = userProfile?.providerProfile?.avatarUrl || null;

  const nextAppointment = upcomingAppointments[0] || {
    id: 'next-1',
    patient: { patientProfile: { firstName: 'Kolawole', lastName: 'Samson' } },
    type: 'Consultation',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 60,
  };

  const todaySchedules = upcomingAppointments.length > 0 ? upcomingAppointments : [
    {
      id: 'sched-1',
      patient: { patientProfile: { firstName: 'Ayobami', lastName: 'Agboola' } },
      type: 'Eye treatment',
      scheduledAt: new Date().toISOString(),
      durationMinutes: 60,
    },
    {
      id: 'sched-2',
      patient: { patientProfile: { firstName: 'Oreoluwa', lastName: 'Martins' } },
      type: 'Routine Checkup',
      scheduledAt: new Date(Date.now() + 5400000).toISOString(),
      durationMinutes: 60,
    },
  ];

  const totalAppointments = providerStats?.totalAppointments ?? 270;
  const pendingAppointments = providerStats?.pendingAppointments ?? 34;

  const profileData = useMemo(() => computeProfileCompletion(userProfile), [userProfile]);
  const chartValues = useMemo(() => buildMonthlyChart(revenueTrend), [revenueTrend]);

  const { daysInMonth, firstDayOfWeek, year: calYear, month: calMonth } = useMemo(
    () => getCalendarGrid(monthOffset),
    [monthOffset]
  );
  const today = new Date();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  useEffect(() => {
    async function loadData() {
      // 1. User Profile
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setUserProfile(userRes.data);
        if (userRes.data.providerProfile?.rating) {
          setRatingScore(Number(userRes.data.providerProfile.rating));
        }
      }

      // 2. Provider Dashboard Stats
      const dashRes = await api.get('/users/dashboard/provider');
      if (dashRes.success && dashRes.data) {
        setProviderStats(dashRes.data.stats);
        if (dashRes.data.upcomingAppointments?.length) {
          setUpcomingAppointments(dashRes.data.upcomingAppointments);
        }
      }

      // 3. Wallet
      const walletRes = await api.get('/wallet');
      if (walletRes.success && walletRes.data) {
        if (walletRes.data.balance) setWalletBalance(Number(walletRes.data.balance));
      }

      // 4. Revenue
      const revRes = await api.get('/analytics/revenue');
      if (revRes.success && revRes.data?.trend) {
        setRevenueTrend(revRes.data.trend);
      }

      // 5. Rewards
      const rewardsRes = await api.get('/rewards/balance');
      if (rewardsRes.success && rewardsRes.data?.balance) {
        setRewardsBalance(rewardsRes.data.balance);
      }

      // 6. Notifications
      const notifRes = await api.get('/notifications');
      if (notifRes.success && notifRes.data?.notifications) {
        setNotificationsList(notifRes.data.notifications);
      }
    }

    loadData();
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
          {/* User Avatar & Name Header */}
          <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-white/10 space-y-3">
            <div className="w-20 h-20 rounded-full border-2 border-white/40 overflow-hidden bg-white/20 flex items-center justify-center shadow-inner">
              {avatarUrl ? (
                <img src={avatarUrl} alt={doctorFullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👩‍⚕️</span>
              )}
            </div>
            <h2 className="font-bold text-lg text-white leading-snug">{doctorFullName}</h2>
          </div>

          {/* Nav Links */}
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

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
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

          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors">
              🔔
              {notificationsList.some((n) => !n.isRead) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </header>

        {/* Dashboard Workspace Grid */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome {doctorFirstName}
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (2 Spans) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Next Appointment Card */}
              <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-4">
                <h2 className="font-bold text-base text-slate-900">Next appointment</h2>
                <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#0A192F] text-white flex items-center justify-center text-2xl font-bold">
                      👤
                    </div>
                    <div>
                      <p className="font-bold text-base text-slate-900">
                        {getPatientName(nextAppointment)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {nextAppointment.type || 'Consultation'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center text-lg font-bold">
                        📅
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        {formatDate(nextAppointment.scheduledAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center text-lg font-bold">
                        ⏰
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        {formatTimeRange(nextAppointment.scheduledAt, nextAppointment.durationMinutes)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Total & Pending Appointment Cards */}
              <section className="grid grid-cols-2 gap-6">
                <article className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Total appointment
                    </p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalAppointments}</p>
                  </div>
                </article>

                <article className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-slate-400 text-white flex items-center justify-center text-2xl font-bold">
                    📋
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Pending appointment
                    </p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1">{pendingAppointments}</p>
                  </div>
                </article>
              </section>

              {/* Today Schedule Purple Cards Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-base text-slate-900">Today Schedule</h2>
                    <p className="text-xs text-slate-500 font-medium">June 27th, 2025</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllSchedules((v) => !v)}
                    className="px-6 py-2 border-2 border-[#1877F2] text-[#1877F2] rounded-full text-xs font-bold hover:bg-[#1877F2] hover:text-white transition-all"
                  >
                    View all
                  </button>
                </div>

                <div className="space-y-4">
                  {todaySchedules.slice(0, showAllSchedules ? todaySchedules.length : 2).map((sched, i) => (
                    <div
                      key={sched.id || i}
                      className="bg-[#9747FF] text-white rounded-3xl p-6 shadow-md flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white text-[#9747FF] flex items-center justify-center text-xl font-bold">
                          👤
                        </div>
                        <div>
                          <p className="font-bold text-base">{getPatientName(sched)}</p>
                          <p className="text-xs opacity-90">{sched.type || 'Consultation'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl">
                        <span className="w-8 h-8 rounded-lg bg-white text-[#9747FF] flex items-center justify-center text-sm font-bold">
                          🕒
                        </span>
                        <span className="font-bold text-sm">
                          {formatTimeRange(sched.scheduledAt, sched.durationMinutes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Revenue & Earnings Bar Chart Section */}
              <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
                <div className="flex items-center gap-12 border-b border-slate-100 pb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 rounded-full bg-amber-400 text-white flex items-center justify-center text-2xl font-bold shadow-xs">
                      🪙
                    </span>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Weekly earning
                      </p>
                      <p className="text-2xl font-extrabold text-slate-900">
                        {weeklyTransactions.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Total earning
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900">
                      {walletBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Monthly Bar Chart */}
                <div className="h-56 flex items-end justify-between px-6 pb-2 border-b border-slate-200">
                  {chartValues.length > 0 ? (
                    chartValues.map((item) => (
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
                          style={{ height: `${[100, 45, 140, 110, 85, 140, 125, 60][idx]}px` }}
                        />
                        <span className="mt-3 text-xs font-semibold text-slate-600">{m}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            {/* Right Column (1 Span) */}
            <div className="space-y-8">
              {/* Calendar Widget Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMonthOffset((v) => v - 1)}
                    className="text-slate-400 font-bold text-sm"
                  >
                    ‹
                  </button>
                  <span className="font-bold text-sm text-slate-900">{getMonthName(monthOffset)}</span>
                  <button
                    type="button"
                    onClick={() => setMonthOffset((v) => v + 1)}
                    className="text-slate-400 font-bold text-sm"
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

              {/* Complete Profile Radial Progress Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
                <h2 className="font-bold text-base text-slate-900">Complete Profile</h2>

                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 rounded-full border-4 border-amber-400 border-t-green-500 border-r-red-500 flex items-center justify-center shrink-0">
                    <span className="font-extrabold text-xl text-slate-900">
                      {profileData.percentage}%
                    </span>
                  </div>

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

              {/* Rating Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
                <h2 className="font-bold text-base text-slate-900">Rating</h2>

                <div className="flex items-center justify-between">
                  <div className="space-y-2.5 flex-1 pr-4">
                    {[
                      { label: 'Communication', pct: 100 },
                      { label: 'Efficiency', pct: 90 },
                      { label: 'Punctuality', pct: 85 },
                      { label: 'Reliability', pct: 60 },
                      { label: 'Work ethics', pct: 50 },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-600">
                          <span>{item.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-amber-400/20 rounded-2xl border border-amber-300">
                    <span className="text-2xl font-black text-slate-900">★ {ratingScore.toFixed(1)}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">Based on review</span>
                  </div>
                </div>
              </section>

              {/* Rewards Points Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-slate-900">Rewards</h2>
                  <p className="text-3xl font-extrabold text-slate-900 mt-2">
                    {rewardsBalance.toLocaleString()}
                  </p>
                </div>
                <span className="text-4xl">🪙</span>
              </section>

              {/* Notifications List Card */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
                <h2 className="font-bold text-base text-slate-900">Notification</h2>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="h-12 rounded-2xl bg-slate-100/70 border border-slate-200/50" />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
