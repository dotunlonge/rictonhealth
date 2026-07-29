'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const navigation = [
  { label: 'Home', href: '/dashboard', icon: '🏠' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appointment', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earns', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Tele-medicine', href: '/telemedicine/demo', icon: '📞' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Date/time formatting helpers ---
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { month: 'long', day: 'numeric' });
}

function formatDateFull(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTimeRange(iso: string, durationMinutes: number) {
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
  const firstDayOfWeek = target.getDay(); // 0=Sun
  return { daysInMonth, firstDayOfWeek, year: target.getFullYear(), month: target.getMonth() };
}

// --- Profile completion calculator ---
function computeProfileCompletion(user: any): {
  percentage: number;
  steps: { label: string; done: boolean }[];
} {
  const profile = user?.providerProfile || user?.patientProfile || {};
  const steps = [
    { label: 'Setup account', done: !!user?.emailVerified },
    { label: 'Upload your profile', done: !!profile?.avatarUrl },
    { label: 'Personal information', done: !!(profile?.firstName && profile?.lastName) },
    { label: 'Professional credentials', done: !!(profile?.specialty && profile?.licenseNumber) },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { percentage: Math.round((doneCount / steps.length) * 100), steps };
}

// --- Revenue chart helpers ---
function buildMonthlyChart(trend: any[]): { month: string; value: number }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Aggregate by month
  const byMonth: Record<string, number> = {};
  for (const item of trend) {
    const d = new Date(item.period);
    const key = months[d.getMonth()];
    byMonth[key] = (byMonth[key] || 0) + item.amount;
  }
  // Show only months that have data
  return Object.entries(byMonth).map(([month, amount]) => ({
    month,
    value: Math.min(Math.max(Math.round(amount / 100), 30), 280),
  }));
}

export default function ElementDoctorHomePage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Home');
  const [monthOffset, setMonthOffset] = useState(0);
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // --- Dynamic state from API ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [providerStats, setProviderStats] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [weeklyTransactions, setWeeklyTransactions] = useState<number>(0);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [rewardsBalance, setRewardsBalance] = useState<number>(0);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [ratingScore, setRatingScore] = useState<number>(0);

  // --- Derived values ---
  const doctorFirstName = userProfile?.providerProfile?.firstName || '';
  const doctorLastName = userProfile?.providerProfile?.lastName || '';
  const doctorFullName = [doctorFirstName, doctorLastName].filter(Boolean).join(' ') || 'Doctor';
  const specialty = userProfile?.providerProfile?.specialty || 'Specialist';

  const nextAppointment = upcomingAppointments[0] || null;
  const todaySchedules = upcomingAppointments;
  const totalAppointments = providerStats?.totalAppointments ?? 0;
  const pendingAppointments = providerStats?.pendingAppointments ?? 0;
  const totalEarnings = Number(providerStats?.totalEarnings ?? walletBalance);

  const profileData = useMemo(() => computeProfileCompletion(userProfile), [userProfile]);
  const chartValues = useMemo(() => buildMonthlyChart(revenueTrend), [revenueTrend]);

  const { daysInMonth, firstDayOfWeek, year: calYear, month: calMonth } = useMemo(
    () => getCalendarGrid(monthOffset),
    [monthOffset]
  );
  const today = new Date();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  useEffect(() => {
    async function loadAll() {
      setLoading(true);

      // 1. Fetch user profile via GET /users/me
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setUserProfile(userRes.data);
        if (userRes.data.providerProfile?.rating) {
          setRatingScore(Number(userRes.data.providerProfile.rating));
        }
      }

      // 2. Fetch provider dashboard (stats + upcoming appointments)
      //    via GET /users/dashboard/provider
      const dashRes = await api.get('/users/dashboard/provider');
      if (dashRes.success && dashRes.data) {
        setProviderStats(dashRes.data.stats);
        setUpcomingAppointments(dashRes.data.upcomingAppointments || []);
      }

      // 3. Fetch wallet balance via GET /wallet
      const walletRes = await api.get('/wallet');
      if (walletRes.success && walletRes.data) {
        setWalletBalance(Number(walletRes.data.balance) || 0);

        // Compute weekly from recent transactions
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const txs = walletRes.data.transactions || [];
        const weeklySum = txs
          .filter((tx: any) => tx.type === 'CREDIT' && new Date(tx.createdAt) >= oneWeekAgo)
          .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);
        setWeeklyTransactions(weeklySum);
      }

      // 4. Fetch revenue trend via GET /analytics/revenue
      const revenueRes = await api.get('/analytics/revenue');
      if (revenueRes.success && revenueRes.data?.trend) {
        setRevenueTrend(revenueRes.data.trend);
      }

      // 5. Fetch rewards balance via GET /rewards/balance
      const rewardsRes = await api.get('/rewards/balance');
      if (rewardsRes.success && rewardsRes.data) {
        setRewardsBalance(rewardsRes.data.balance || 0);
      }

      // 6. Fetch notifications via GET /notifications
      const notifRes = await api.get('/notifications');
      if (notifRes.success && notifRes.data?.notifications) {
        setNotificationsList(notifRes.data.notifications);
      }

      setLoading(false);
    }

    loadAll();
  }, []);

  const toggleReadNotification = async (id: string) => {
    setReadNotifications((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
    await api.patch(`/notifications/${id}/read`, {});
  };

  const handleLogout = () => {
    api.setToken(null);
    api.clearToken();
    router.push('/login');
  };

  return (
    <main className="bg-slate-50 min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-slate-900">
      {/* Header Navigation */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="Ricton emblem" className="h-10 w-10 object-contain" />
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Ricton</span>
        </Link>

        {/* Search Input Bar */}
        <label className="relative flex items-center w-full max-w-xl h-11 rounded-full bg-slate-100 px-5 border border-slate-200">
          <span className="mr-3 text-slate-400 text-sm">🔍</span>
          <input
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 outline-none"
            aria-label="Search dashboard"
            placeholder="Search patient, appointment, treatment..."
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>

        {/* Notifications Icon */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Open notifications"
            className="relative p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
          >
            <span className="text-lg">🔔</span>
            {notificationsList.some((n) => !n.isRead && !readNotifications.includes(n.id)) && (
              <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-600 border-2 border-white" />
            )}
          </button>
        </div>
      </header>

      {/* Main Grid Viewport: Sidebar & Workspace */}
      <div className="flex max-w-[1600px] mx-auto pt-6 px-6 gap-8 pb-16">
        {/* Left Sidebar Component */}
        <aside className="w-64 bg-[#1c7bcf] rounded-3xl p-6 text-white shrink-0 space-y-8 shadow-xl self-start sticky top-28">
          {/* User Profile Card */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className="w-24 h-24 rounded-full bg-white/20 border-2 border-white p-1 overflow-hidden shadow-inner flex items-center justify-center">
              <span className="text-4xl">👩‍⚕️</span>
            </div>
            <h2 className="font-bold text-xl tracking-tight text-white">
              {doctorFullName}
            </h2>
            <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-semibold">
              {specialty}
            </span>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Primary navigation">
            <ul className="space-y-2">
              {navigation.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setActiveNav(item.label)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-base font-semibold transition-all ${
                      activeNav === item.label
                        ? 'bg-white text-[#1c7bcf] shadow-md'
                        : 'text-white/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-all text-left"
                >
                  <span className="text-xl">↪️</span>
                  <span>Logout</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Workspace Dashboard Content Grid */}
        <div className="flex-1 space-y-8 min-w-0">
          {/* Welcome Header */}
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome&nbsp;{doctorFirstName || 'Doctor'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Here is your daily medical consultation and performance breakdown.</p>
          </div>

          {/* Next Appointment Hero Banner */}
          <section
            className="bg-[#f6f3f3] rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-6"
            aria-labelledby="next-appointment-title"
          >
            <h2
              id="next-appointment-title"
              className="font-bold text-xl text-slate-900"
            >
              Next appointment
            </h2>
            {nextAppointment ? (
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#0a1a3a] text-white flex items-center justify-center text-2xl font-bold">
                    👨
                  </div>
                  <div>
                    <p className="font-bold text-xl text-slate-900">
                      {getPatientName(nextAppointment)}
                    </p>
                    <p className="font-medium text-slate-600 text-sm">
                      {nextAppointment.type || nextAppointment.reason || 'Consultation'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1c7bcf] text-white text-lg">
                      📅
                    </span>
                    <span className="font-semibold text-lg text-slate-900">
                      {formatDate(nextAppointment.scheduledAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1c7bcf] text-white text-lg">
                      ⏰
                    </span>
                    <span className="font-semibold text-lg text-slate-900">
                      {formatTimeRange(nextAppointment.scheduledAt, nextAppointment.durationMinutes || 60)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No upcoming appointments scheduled.</p>
            )}
          </section>

          {/* Appointment Statistics Cards */}
          <section
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            aria-label="Appointment statistics"
          >
            <article className="flex items-center rounded-3xl bg-[#f6f3f3] p-6 border border-slate-200/60 shadow-xs">
              <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#06bb00] text-white text-3xl font-bold shadow-md">
                ✓
              </span>
              <div className="ml-5">
                <p className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                  Total appointment
                </p>
                <p className="font-extrabold text-4xl text-slate-900 mt-1">
                  {totalAppointments}
                </p>
              </div>
            </article>

            <article className="flex items-center rounded-3xl bg-[#f6f3f3] p-6 border border-slate-200/60 shadow-xs">
              <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-[#8a8b93] text-white text-3xl font-bold shadow-md">
                ⏳
              </span>
              <div className="ml-5">
                <p className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                  Pending appointment
                </p>
                <p className="font-extrabold text-4xl text-slate-900 mt-1">
                  {pendingAppointments}
                </p>
              </div>
            </article>
          </section>

          {/* Today's Schedule Card */}
          <section
            className="bg-[#f6f3f3] rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-6"
            aria-labelledby="schedule-title"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  id="schedule-title"
                  className="font-bold text-xl text-slate-900"
                >
                  Today Schedule
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  {new Date().toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              {todaySchedules.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllSchedules((value) => !value)}
                  className="px-6 py-2.5 rounded-full border-2 border-[#1c7bcf] font-semibold text-sm text-[#1c7bcf] hover:bg-[#1c7bcf] hover:text-white transition-colors"
                >
                  {showAllSchedules ? 'Show less' : 'View all'}
                </button>
              )}
            </div>

            {todaySchedules.length === 0 ? (
              <p className="text-slate-500 text-sm">No appointments scheduled for today.</p>
            ) : (
              todaySchedules.slice(0, showAllSchedules ? todaySchedules.length : 1).map((schedule, idx) => (
                <article key={schedule.id || idx} className="flex flex-wrap items-center justify-between rounded-2xl bg-[#9747ff] p-6 text-white shadow-md gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-white text-[#9747ff] flex items-center justify-center font-bold text-xl">
                      👩
                    </div>
                    <div>
                      <p className="font-bold text-xl">{getPatientName(schedule)}</p>
                      <p className="font-medium opacity-90 text-sm">{schedule.type || schedule.reason || 'Consultation'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#9747ff] text-base font-bold">
                      🕒
                    </span>
                    <span className="font-bold text-lg">
                      {formatTimeRange(schedule.scheduledAt, schedule.durationMinutes || 60)}
                    </span>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Earnings Analytics & Bar Chart */}
          <section
            className="bg-[#f6f3f3] rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-8"
            aria-labelledby="earnings-title"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#feb60d] text-white text-3xl font-bold shadow-md">
                  🪙
                </span>
                <div>
                  <p className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                    Weekly earning
                  </p>
                  <p className="font-extrabold text-3xl text-slate-900 mt-1">
                    ₦{weeklyTransactions.toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="font-bold text-xs text-slate-600 uppercase tracking-wider">
                  Total earning
                </p>
                <p
                  id="earnings-title"
                  className="font-extrabold text-3xl text-slate-900 mt-1"
                >
                  ₦{totalEarnings.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Monthly Chart Visual */}
            <div className="pt-4 border-t border-slate-200">
              {chartValues.length > 0 ? (
                <div className="h-60 flex items-end justify-between px-4 pb-2 border-b border-slate-300">
                  {chartValues.map((item) => (
                    <div
                      key={item.month}
                      className="flex h-full w-12 flex-col items-center justify-end"
                    >
                      <div
                        className="w-8 rounded-t-lg bg-[#1c7bcf] transition-all hover:bg-[#1561a7]"
                        style={{ height: `${item.value}px` }}
                        aria-label={`${item.month}: ₦${item.value}`}
                      />
                      <span className="mt-2 text-xs font-semibold text-slate-600">
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-8">No revenue data available yet.</p>
              )}
            </div>
          </section>

          {/* Bottom Grid: Calendar, Profile Completion, Rating, Rewards, Notifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Calendar Widget Card */}
            <section
              className="bg-white rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-6"
              aria-label="Calendar"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-600 font-bold"
                  onClick={() => setMonthOffset((value) => value - 1)}
                >
                  ‹
                </button>
                <span className="font-bold text-base text-slate-900">
                  {getMonthName(monthOffset)}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-600 font-bold"
                  onClick={() => setMonthOffset((value) => value + 1)}
                >
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-y-3 text-center text-xs font-semibold text-slate-500">
                {calendarDays.map((day) => (
                  <span key={day}>{day}</span>
                ))}
                {/* Empty cells before 1st of month */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((date) => (
                  <button
                    key={date}
                    type="button"
                    aria-label={`${getMonthName(monthOffset)} ${date}`}
                    className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrentMonth && date === today.getDate()
                        ? 'bg-[#1c7bcf] text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </section>

            {/* Profile Completion Card */}
            <section
              className="bg-[#f6f3f3] rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-6"
              aria-labelledby="profile-title"
            >
              <h2
                id="profile-title"
                className="font-bold text-xl text-slate-900"
              >
                Complete Profile
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24 rounded-full bg-white border-4 border-[#1c7bcf] flex items-center justify-center shadow-inner shrink-0">
                  <span className="font-extrabold text-2xl text-slate-900">
                    {profileData.percentage}%
                  </span>
                </div>
                <ol className="space-y-2 font-bold text-sm text-slate-800">
                  {profileData.steps.map((step) => (
                    <li key={step.label} className="flex items-center gap-3">
                      <span>{step.label}</span>
                      <span
                        className={`h-1.5 rounded-full ${step.done ? 'w-6 bg-[#06bb00]' : 'w-1 bg-[#bb0303]'}`}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Ratings Breakdown Card */}
            <section
              className="bg-[#f6f3f3] rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-6"
              aria-labelledby="rating-title"
            >
              <h2
                id="rating-title"
                className="font-bold text-xl text-slate-900"
              >
                Rating
              </h2>
              <div className="flex items-center justify-between">
                <div className="flex-1 space-y-3 pr-4">
                  {[
                    { label: 'Communication', pct: ratingScore > 0 ? Math.min(ratingScore / 5 * 100, 100) : 0 },
                    { label: 'Efficiency', pct: ratingScore > 0 ? Math.min((ratingScore / 5) * 90, 100) : 0 },
                    { label: 'Punctuality', pct: ratingScore > 0 ? Math.min((ratingScore / 5) * 82, 100) : 0 },
                    { label: 'Reliability', pct: ratingScore > 0 ? Math.min((ratingScore / 5) * 65, 100) : 0 },
                    { label: 'Work ethics', pct: ratingScore > 0 ? Math.min((ratingScore / 5) * 50, 100) : 0 },
                  ].map((rating) => (
                    <div key={rating.label} className="flex items-center gap-3">
                      <span className="w-24 text-xs font-semibold text-slate-600">
                        {rating.label}
                      </span>
                      <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#06bb00]"
                          style={{ width: `${rating.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center text-center pl-4 border-l border-slate-200">
                  <span className="text-4xl font-black text-slate-900">{ratingScore > 0 ? ratingScore.toFixed(1) : '—'}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                    Based on reviews
                  </span>
                </div>
              </div>
            </section>

            {/* Rewards Points Card */}
            <section
              className="bg-[#f6f3f3] rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-4"
              aria-labelledby="rewards-title"
            >
              <h2
                id="rewards-title"
                className="font-bold text-xl text-slate-900"
              >
                Rewards
              </h2>
              <div className="flex items-center justify-between pt-2">
                <p className="font-extrabold text-5xl text-slate-900">
                  {rewardsBalance.toLocaleString()}
                </p>
                <span className="text-5xl">🏆</span>
              </div>
            </section>
          </div>

          {/* Notifications Card */}
          <section
            className="bg-[#f6f3f3] rounded-3xl p-7 border border-slate-200/60 shadow-xs space-y-6"
            aria-labelledby="notification-title"
          >
            <h2
              id="notification-title"
              className="font-bold text-xl text-slate-900"
            >
              Notification
            </h2>
            {notificationsList.length === 0 ? (
              <p className="text-slate-500 text-sm">No notifications yet.</p>
            ) : (
              <ul className="space-y-3">
                {notificationsList.map((notification) => {
                  const isRead = notification.isRead || readNotifications.includes(notification.id);
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => toggleReadNotification(notification.id)}
                        className={`w-full rounded-2xl p-4 text-left font-medium text-sm transition-colors border ${
                          isRead
                            ? 'bg-slate-200 text-slate-500 border-slate-300'
                            : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                        }`}
                      >
                        {notification.body || notification.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
