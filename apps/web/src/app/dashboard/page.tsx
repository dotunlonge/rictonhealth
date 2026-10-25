'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Pill,
  Wallet,
  Award,
  Video,
  Settings,
  LogOut,
  Search,
  Bell,
  CheckCircle2,
  Clock,
  CalendarDays,
  User,
  Star,
  Coins,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Activity,
  FileText,
  Heart,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useWalletState, useCurrentUser, useAppStore, UserRole } from '@/store/useAppStore';

const DASHBOARD_ALLOWED_ROLES: UserRole[] = ['PATIENT', 'CONSULTANT'];
const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(iso: string) {
  if (!iso) return 'Today';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeRange(iso: string, durationMinutes = 60) {
  if (!iso) return '09:00 AM - 10:00 AM';
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmt(start)} - ${fmt(end)}`;
}

function getPatientName(appointment: any): string {
  if (!appointment) return 'Patient record';
  const profile = appointment.patient?.patientProfile || appointment.patientProfile;
  if (profile?.firstName && profile?.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  return appointment.patient?.email || appointment.name || 'Patient record';
}

function getDoctorName(appointment: any): string {
  if (!appointment) return 'Medical specialist';
  const profile = appointment.provider?.providerProfile || appointment.providerProfile;
  if (profile?.firstName && profile?.lastName) {
    return `Dr. ${profile.firstName} ${profile.lastName}`;
  }
  if (appointment.provider?.email) {
    return `Dr. ${appointment.provider.email.split('@')[0]}`;
  }
  return appointment.doctor || 'Medical specialist';
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
  const hasUser = !!(user?.id || profile?.id);
  const hasAvatar = !!(user?.avatarUrl || profile?.avatarUrl);
  const hasPersonal = !!(
    (profile?.firstName && profile?.lastName) ||
    user?.firstName ||
    user?.hospital?.name
  );
  const isVerified = !!(user?.isVerified || profile?.isVerified || user?.status === 'ACTIVE');

  const steps = [
    { label: 'Setup account', done: hasUser },
    {
      label: 'Upload profile photo',
      done: hasAvatar,
    },
    { label: 'Personal information', done: hasPersonal },
    { label: 'Verification & credentials', done: isVerified },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { percentage: Math.round((doneCount / steps.length) * 100), steps };
}

function buildMonthlyChart(trend: any[]): { month: string; value: number }[] {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const chartMonths: string[] = [];

  for (let i = 7; i >= 0; i--) {
    const idx = (currentMonthIdx - i + 12) % 12;
    chartMonths.push(months[idx]);
  }

  const byMonth: Record<string, number> = {};
  if (Array.isArray(trend)) {
    for (const item of trend) {
      if (item?.period) {
        const d = new Date(item.period);
        const key = months[d.getMonth()];
        byMonth[key] = (byMonth[key] || 0) + (item.amount || 0);
      }
    }
  }

  const maxVal = Math.max(...Object.values(byMonth), 1);
  return chartMonths.map((m) => {
    const raw = byMonth[m] || 0;
    const value = raw > 0 ? Math.max(Math.round((raw / maxVal) * 140), 20) : 12;
    return { month: m, value };
  });
}

function formatEmailToName(email?: string): { firstName: string; lastName: string } {
  if (!email || !email.includes('@')) return { firstName: '', lastName: '' };
  const username = email.split('@')[0];
  const parts = username.split(/[._-]/).filter(Boolean);
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (parts.length >= 2) {
    return { firstName: capitalize(parts[0]), lastName: capitalize(parts[1]) };
  }
  return { firstName: capitalize(parts[0] || ''), lastName: '' };
}

function resolveUserInfo(user: any): { firstName: string; lastName: string; fullName: string } {
  if (!user) return { firstName: '', lastName: '', fullName: '' };

  const first =
    user.patientProfile?.firstName ||
    user.providerProfile?.firstName ||
    user.firstName ||
    user.name?.split(' ')[0] ||
    '';

  const last =
    user.patientProfile?.lastName ||
    user.providerProfile?.lastName ||
    user.lastName ||
    user.name?.split(' ').slice(1).join(' ') ||
    '';

  if (first || last) {
    const fullName = [first, last].filter(Boolean).join(' ');
    return { firstName: first || fullName, lastName: last, fullName };
  }

  if (user.email) {
    const fromEmail = formatEmailToName(user.email);
    if (fromEmail.firstName) {
      const fullName = [fromEmail.firstName, fromEmail.lastName].filter(Boolean).join(' ');
      return { firstName: fromEmail.firstName, lastName: fromEmail.lastName, fullName };
    }
  }

  return { firstName: '', lastName: '', fullName: '' };
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Home');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());
  const [showAllSchedules, setShowAllSchedules] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Real API Data State
  const currentUser = useCurrentUser();
  const [userProfile, setUserProfile] = useState<any>(
    () => currentUser || useAppStore.getState().user
  );
  const [providerStats, setProviderStats] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const {
    walletBalance: storeWallet,
    rewardsPoints: storeRewards,
    walletStatus: storeWalletStatus,
  } = useWalletState();
  const [walletBalance, setWalletBalance] = useState<number>(storeWallet || 0);
  // Unknown balances must never render as a valid-looking ₦0.
  const [walletKnown, setWalletKnown] = useState(storeWalletStatus !== 'error');
  const [rewardsBalance, setRewardsBalance] = useState<number>(storeRewards || 0);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [weeklyTransactions, setWeeklyTransactions] = useState<number>(0);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [ratingScore, setRatingScore] = useState<number>(0);
  const [_loading, setLoading] = useState<boolean>(true);
  const [now] = useState(() => Date.now());

  const resolved = useMemo(() => resolveUserInfo(userProfile), [userProfile]);
  const userFirstName = resolved.firstName || 'User';
  const userFullName = resolved.fullName || userFirstName || 'Healthcare Account';
  const avatarUrl =
    userProfile?.avatarUrl ||
    userProfile?.providerProfile?.avatarUrl ||
    userProfile?.patientProfile?.avatarUrl ||
    null;

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        // 1. User Profile API
        const userRes = await api.get('/users/me');
        const role = userRes.data?.role || currentUser?.role || 'PATIENT';
        if (userRes.success && userRes.data) {
          setUserProfile(userRes.data);
          if (userRes.data.providerProfile?.rating) {
            setRatingScore(Number(userRes.data.providerProfile.rating));
          }
        }

        // 2. Dashboard Stats & Appointments API
        const isDoctor = role === 'CONSULTANT';
        const dashEndpoint = isDoctor ? '/users/dashboard/provider' : '/users/dashboard/patient';
        const dashRes = await api.get(dashEndpoint);
        if (dashRes.success && dashRes.data) {
          setProviderStats(dashRes.data.stats);
          if (Array.isArray(dashRes.data.upcomingAppointments)) {
            setUpcomingAppointments(dashRes.data.upcomingAppointments);
          }
        }

        // 3. Wallet API
        const walletRes = await api.get('/wallets/me');
        if (walletRes.success && walletRes.data) {
          if (walletRes.data.balance !== undefined) {
            setWalletBalance(Number(walletRes.data.balance));
            setWalletKnown(true);
          }
        } else {
          setWalletKnown(false);
        }

        // 4. Wallet Transactions & Weekly Expenses
        const txRes = await api.get('/wallets/transactions');
        if (txRes.success && Array.isArray(txRes.data?.transactions)) {
          const totalWeekly = txRes.data.transactions.reduce(
            (sum: number, t: any) => sum + (Number(t.amount) || 0),
            0
          );
          setWeeklyTransactions(totalWeekly);
        }

        // 4. Analytics Revenue API (only for admin roles)
        if (role === 'HOSPITAL_ADMIN' || role === 'SUPER_ADMIN') {
          const revRes = await api.get('/analytics/revenue');
          if (revRes.success && revRes.data?.trend) {
            setRevenueTrend(revRes.data.trend);
          }
        }

        // 5. Rewards Balance API
        const rewardsRes = await api.get('/rewards/balance');
        if (rewardsRes.success && rewardsRes.data?.balance !== undefined) {
          setRewardsBalance(rewardsRes.data.balance);
        }

        // 6. Appointments API fallback check
        const apptRes = await api.get('/appointments');
        if (apptRes.success) {
          const list = Array.isArray(apptRes.data)
            ? apptRes.data
            : Array.isArray(apptRes.data?.appointments)
              ? apptRes.data.appointments
              : [];
          if (list.length > 0) {
            setUpcomingAppointments(list);
          }
        }
      } catch (err) {
        console.error('Failed to fetch dynamic dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const nextAppointment = upcomingAppointments[0] || null;

  const todaySchedules = useMemo(() => {
    return upcomingAppointments.length > 0 ? upcomingAppointments : [];
  }, [upcomingAppointments]);

  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return todaySchedules;
    const q = searchQuery.toLowerCase();
    return todaySchedules.filter(
      (s) => getPatientName(s).toLowerCase().includes(q) || (s.type || '').toLowerCase().includes(q)
    );
  }, [todaySchedules, searchQuery]);

  const totalAppointments = useMemo(() => {
    if (providerStats?.totalAppointments !== undefined) return providerStats.totalAppointments;
    return upcomingAppointments.filter((a) => a.status === 'COMPLETED' || a.status === 'FULFILLED')
      .length;
  }, [providerStats, upcomingAppointments]);

  const pendingAppointments = useMemo(() => {
    if (providerStats?.pendingAppointments !== undefined) return providerStats.pendingAppointments;
    return upcomingAppointments.filter(
      (a) => a.status === 'PENDING' || a.status === 'CREATED' || !a.status
    ).length;
  }, [providerStats, upcomingAppointments]);

  const profileData = useMemo(() => computeProfileCompletion(userProfile), [userProfile]);
  const chartValues = useMemo(() => buildMonthlyChart(revenueTrend), [revenueTrend]);

  const {
    daysInMonth,
    firstDayOfWeek,
    year: calYear,
    month: calMonth,
  } = useMemo(() => getCalendarGrid(monthOffset), [monthOffset]);
  const today = new Date();
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  const handleLogout = () => {
    useAppStore.getState().logout();
    router.push('/login');
  };

  return (
    <SidebarLayout allowedRoles={DASHBOARD_ALLOWED_ROLES}>
      <div className="space-y-8">
        {/* Welcome Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Welcome back, {userFirstName}!
              <Sparkles className="w-5 h-5 text-amber-500 inline-block" />
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Here is your healthcare schedule overview and performance metrics.
            </p>
          </div>
          <Link
            href="/telemedicine"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Video className="w-4 h-4" />
            <span>Start Virtual Session</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Main Column (2 Spans) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Next Appointment Card */}
            <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-[#1877F2]" />
                  <span>Next Scheduled Appointment</span>
                </h2>
                {nextAppointment && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Confirmed
                  </span>
                )}
              </div>

              {nextAppointment ? (
                <div className="flex flex-wrap items-center justify-between gap-6 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-bold shadow-sm">
                      <User className="w-6 h-6 text-slate-200" />
                    </div>
                    <div>
                      <p className="font-bold text-base text-slate-900">
                        {userProfile?.role === 'PATIENT'
                          ? getDoctorName(nextAppointment)
                          : getPatientName(nextAppointment)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {nextAppointment.type || 'General Consultation'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2.5 text-slate-700 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                      <Calendar className="w-4 h-4 text-[#1877F2]" />
                      <span className="font-bold text-xs">
                        {formatDate(nextAppointment.scheduledAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-slate-700 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                      <Clock className="w-4 h-4 text-[#1877F2]" />
                      <span className="font-bold text-xs">
                        {formatTimeRange(
                          nextAppointment.scheduledAt,
                          nextAppointment.durationMinutes
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-3">
                  <p className="text-xs font-bold text-slate-500">
                    No upcoming appointments scheduled
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/appointments?book=true')}
                    className="px-5 py-2 bg-[#1877F2] text-white text-xs font-bold rounded-full shadow-xs hover:bg-[#1565C0] transition-all"
                  >
                    Book Consultation
                  </button>
                </div>
              )}
            </section>

            {/* Total & Pending Appointment Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <article className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Completed Appointments
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalAppointments}</p>
                </div>
              </article>

              <article className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Pending Requests
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {pendingAppointments}
                  </p>
                </div>
              </article>
            </section>

            {/* Today Schedule List Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-base text-slate-900">Today&apos;s Schedule</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/appointments')}
                  className="px-4 py-2 border border-[#1877F2] text-[#1877F2] rounded-xl text-xs font-bold hover:bg-[#1877F2] hover:text-white transition-all shadow-xs"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {filteredSchedules.length === 0 ? (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-500">
                      No scheduled consultations for today
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/appointments?book=true')}
                      className="text-xs text-[#1877F2] font-bold hover:underline"
                    >
                      + Book New Appointment
                    </button>
                  </div>
                ) : (
                  filteredSchedules
                    .slice(0, showAllSchedules ? filteredSchedules.length : 3)
                    .map((sched, i) => (
                      <div
                        key={sched.id || i}
                        className="bg-white border border-slate-200/90 hover:border-[#1877F2]/40 rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] border border-blue-100 flex items-center justify-center font-bold shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">
                              {userProfile?.role === 'PATIENT'
                                ? getDoctorName(sched)
                                : getPatientName(sched)}
                            </p>
                            <p className="text-xs text-slate-500">{sched.type || 'Consultation'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
                          <Clock className="w-4 h-4 text-[#1877F2]" />
                          <span className="font-bold text-xs text-slate-800">
                            {formatTimeRange(sched.scheduledAt, sched.durationMinutes)}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>

            {/* Earnings & Revenue Vector Chart Section */}
            <section className="bg-white rounded-2xl p-7 shadow-xs border border-slate-200/80 space-y-6">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-6 gap-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shadow-xs">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {userProfile?.role === 'PATIENT' ? 'Weekly Health Spend' : 'Weekly Earning'}
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900">
                      ₦{weeklyTransactions.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Wallet Balance
                  </p>
                  <p className="text-2xl font-extrabold text-[#1877F2]">
                    {walletKnown ? (
                      <>₦{walletBalance.toLocaleString()}</>
                    ) : (
                      <span role="alert" className="text-sm font-bold text-amber-600">
                        Balance unavailable
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Monthly Vector Bar Chart */}
              <div className="h-52 flex items-end justify-between px-4 pb-2 border-b border-slate-200 gap-2">
                {chartValues.map((item) => (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center justify-end h-full"
                  >
                    <div
                      className="w-full max-w-[36px] bg-[#1877F2] hover:bg-blue-700 rounded-t-lg transition-all"
                      style={{ height: `${item.value}px` }}
                    />
                    <span className="mt-3 text-[11px] font-semibold text-slate-500">
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column (1 Span) */}
          <div className="space-y-8">
            {/* Vector Calendar Widget Card */}
            <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonthOffset((v) => v - 1)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm text-slate-900">
                  {getMonthName(monthOffset)}
                </span>
                <button
                  type="button"
                  onClick={() => setMonthOffset((v) => v + 1)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
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
                    onClick={() => setSelectedDate(date)}
                    className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      selectedDate === date
                        ? 'bg-[#1877F2] text-white shadow-md ring-2 ring-blue-300 scale-105'
                        : isCurrentMonth && date === today.getDate()
                          ? 'bg-blue-100 text-[#1877F2] font-black'
                          : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">
                  Selected:{' '}
                  <strong className="text-slate-900">
                    {getMonthName(monthOffset)} {selectedDate}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Deep-link into the Schedule Consultation modal with the
                    // calendar's selected day preselected (see appointments
                    // page `date` param handling).
                    const grid = getCalendarGrid(monthOffset);
                    const day = String(selectedDate).padStart(2, '0');
                    const month = String(grid.month + 1).padStart(2, '0');
                    const year = String(grid.year).padStart(4, '0');
                    router.push(`/appointments?date=${year}-${month}-${day}&book=true`);
                  }}
                  className="text-[#1877F2] font-bold hover:underline"
                >
                  Book Consultation
                </button>
              </div>
            </section>

            {/* Complete Profile Progress */}
            <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Profile Verification Status
              </h2>

              <div className="flex items-center gap-5">
                <div className="relative w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#1877F2] border-r-[#1877F2] flex items-center justify-center shrink-0">
                  <span className="font-extrabold text-sm text-slate-900">
                    {profileData.percentage}%
                  </span>
                </div>

                <ol className="space-y-2 text-xs font-semibold text-slate-700 flex-1">
                  {profileData.steps.map((step) => (
                    <li
                      key={step.label}
                      onClick={() => router.push('/settings')}
                      className="flex items-center justify-between cursor-pointer hover:text-[#1877F2] transition-colors"
                    >
                      <span>{step.label}</span>
                      {step.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* Rating / Health Vitals Card */}
            <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 space-y-4">
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                {userProfile?.role === 'PATIENT' ? 'Patient Health Vitals' : 'Provider Rating'}
              </h2>

              {userProfile?.role === 'PATIENT' ? (
                // No vitals backend exists yet: never render fabricated
                // readings. A textbook-perfect 72bpm/120-80/99% for every
                // patient is a clinical trust risk — show an honest empty
                // state until a real vitals source ships.
                <div className="space-y-3 text-xs">
                  <div
                    role="status"
                    className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2"
                  >
                    <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600">No vitals on file yet</p>
                    <p className="font-medium text-slate-500 leading-relaxed">
                      Heart rate, blood pressure, and oxygen readings will appear here after your
                      first connected visit or device sync.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push('/appointments?book=true')}
                      className="text-xs text-[#1877F2] font-bold hover:underline"
                    >
                      Book a consultation to get started
                    </button>
                  </div>
                </div>
              ) : ratingScore > 0 ? (
                // Only the aggregate rating comes from the backend
                // (providerProfile.rating). Per-category bars were hardcoded
                // fabrications — render the real number only.
                <div className="flex items-center justify-center gap-4 p-2">
                  <div className="flex flex-col items-center justify-center p-5 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                      <span className="text-2xl font-black text-slate-900">
                        {ratingScore.toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-slate-500">/ 5</span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase mt-1">
                      Patient Rating
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  role="status"
                  className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2"
                >
                  <Star className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No patient reviews yet</p>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    Your verified rating appears here once patients review completed consultations.
                  </p>
                </div>
              )}
            </section>

            {/* Rewards Vector Card */}
            <section className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-xs text-slate-500 uppercase tracking-wider">
                  Rewards Points
                </h2>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {rewardsBalance.toLocaleString()} PTS
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
