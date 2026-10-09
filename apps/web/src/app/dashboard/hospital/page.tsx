'use client';

import { useEffect, useMemo, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useCurrentUser } from '@/store/useAppStore';

const calendarDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];

// --- Formatting Helpers ---
function formatDateShort(iso?: string) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? 'N/A'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso?: string) {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? 'N/A'
    : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
  const hasUser = !!(user?.id || user?.email || profile?.id || user);

  const steps = [
    { label: 'Setup account', done: hasUser },
    {
      label: 'Upload your profile',
      done: hasUser && !!(user?.avatarUrl || profile?.avatarUrl || user?.email),
    },
    { label: 'Personal information', done: hasUser },
    { label: 'Professional credentials', done: hasUser },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return { percentage: Math.round((doneCount / steps.length) * 100), steps };
}

function buildMonthlyChart(trend: any[]): { month: string; value: number }[] {
  const months = [
    'Jan',
    'Feb',
    'March',
    'April',
    'May',
    'June',
    'July',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
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
    value: Math.min(Math.max(Math.round(amount / 1000), 4), 140),
  }));
}

export default function ElementHospitalHomePage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Home');
  const [monthOffset, setMonthOffset] = useState(0);
  const [revenueRange, setRevenueRange] = useState('Month');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const storeUser = useCurrentUser();
  const [currentUser, setCurrentUser] = useState<any>(storeUser || null);
  const [hospitalStats, setHospitalStats] = useState<{
    totalDoctors: number;
    totalAppointments: number;
    activePatients: number;
  }>({ totalDoctors: 0, totalAppointments: 0, activePatients: 0 });
  const [appointmentsList, setAppointmentsList] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [attachId, setAttachId] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [detachingId, setDetachingId] = useState<string | null>(null);
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [staffError, setStaffError] = useState(false);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  const adminName = currentUser?.email ? currentUser.email.split('@')[0] : 'Admin';
  const profileData = useMemo(() => computeProfileCompletion(currentUser), [currentUser]);
  const revenueChart = useMemo(() => buildMonthlyChart(revenueTrend), [revenueTrend]);

  const {
    daysInMonth,
    firstDayOfWeek,
    year: calYear,
    month: calMonth,
  } = useMemo(() => getCalendarGrid(monthOffset), [monthOffset]);
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

      // Facility revenue is analytics scoped by the authenticated hospital,
      // never the individual administrator's wallet.
      const revRes = await api.get('/analytics/revenue');
      if (revRes.success && revRes.data?.trend) {
        setRevenueTrend(revRes.data.trend);
        setRevenueTotal(Number(revRes.data.totalRevenue) || 0);
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
    <SidebarLayout allowedRoles={['HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="space-y-8">
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

            {/* Do not invent demographic data: the current API provides a
                facility-scoped patient total, not an age breakdown. */}
            <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
              <div>
                <div>
                  <h2 className="font-bold text-lg text-slate-900">Patient Overview</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Active patients currently attributed to this facility.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <p className="text-4xl font-extrabold text-slate-900">
                  {hospitalStats.activePatients}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Age distribution will appear here when clinical demographics reporting is
                  available.
                </p>
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
                      <span className="mt-3 text-xs font-semibold text-slate-600">
                        {item.month}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="w-full self-center text-center text-sm text-slate-500">
                    No facility revenue has been recorded for this period.
                  </p>
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
                      Facility revenue
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900">
                      ₦{revenueTotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Reporting scope
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900">This facility</p>
                </div>
              </div>
            </section>

            {/* Patient Appointment Table */}
            <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
              <h2 className="font-bold text-lg text-slate-900">Patient appointment</h2>

              {appointmentsList.length === 0 ? (
                <p className="text-slate-500 text-xs py-4">
                  No patient appointments found in database.
                </p>
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
                          <td className="py-4 text-slate-600">
                            {formatDateShort(appt.scheduledAt)}
                          </td>
                          <td className="py-4 text-slate-600">{getDoctorName(appt)}</td>
                          <td className="py-4 text-slate-600">
                            {appt.type || appt.reason || 'Consultation'}
                          </td>
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
                <span className="font-bold text-sm text-slate-900">
                  {getMonthName(monthOffset)}
                </span>
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

            {/* Medical Staff Management Card (H2: attach/detach bound to own hospital server-side) */}
            <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4">
              <h2 className="font-bold text-base text-slate-900">Medical Staff</h2>
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const value = attachId.trim();
                  if (!value || attaching) return;
                  setAttaching(true);
                  setStaffMsg(null);
                  // No hospitalId sent: the controller binds HOSPITAL_ADMIN to their own hospital.
                  const res = await api.post('/admin/hospitals/doctors', { providerId: value });
                  setAttaching(false);
                  if (res.success) {
                    setStaffError(false);
                    setStaffMsg('Doctor attached to your hospital.');
                    setAttachId('');
                    const refreshed = await api.get('/users/providers');
                    if (refreshed.success && refreshed.data) {
                      const provs = Array.isArray(refreshed.data)
                        ? refreshed.data
                        : refreshed.data.providers || [];
                      setDoctorsList(provs);
                    }
                  } else {
                    setStaffError(true);
                    setStaffMsg(res.error?.message || 'Unable to attach doctor.');
                  }
                }}
                className="flex flex-col gap-2"
              >
                <input
                  value={attachId}
                  onChange={(event) => setAttachId(event.target.value)}
                  placeholder="Provider user ID or profile ID"
                  aria-label="Provider user ID or profile ID"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={attaching || !attachId.trim()}
                  className="rounded-xl bg-[#1877F2] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {attaching ? 'Attaching…' : 'Attach doctor'}
                </button>
              </form>
              {staffMsg && (
                <p
                  role="status"
                  className={`rounded-xl border p-3 text-xs font-bold ${staffError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                >
                  {staffMsg}
                </p>
              )}

              {doctorsList.length === 0 ? (
                <p className="text-slate-500 text-xs py-2">
                  No active doctors registered in hospital.
                </p>
              ) : (
                <div className="space-y-4">
                  {doctorsList.slice(0, 8).map((doc, idx) => {
                    const profileId = doc.id;
                    const userId = doc.userId || doc.user?.id;
                    const detachKey = profileId || userId || String(idx);
                    const displayName =
                      `Dr. ${doc.firstName || doc.user?.email?.split('@')[0] || 'Doctor'} ${doc.lastName || ''}`.trim();
                    return (
                      <div
                        key={detachKey}
                        className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 last:border-none last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg shrink-0">
                            👨‍⚕️
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate">
                              {displayName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {doc.specialty || 'Specialist'} ·{' '}
                              {doc.isVerified === false ? 'Pending verification' : 'Verified'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={detachingId === detachKey}
                          onClick={async () => {
                            if (!confirm(`Detach ${displayName} from your hospital?`)) return;
                            setDetachingId(detachKey);
                            // Backend accepts either the user id or the provider-profile id.
                            const res = await api.delete(
                              `/admin/hospitals/doctors/${profileId || userId}`
                            );
                            setDetachingId(null);
                            if (res.success) {
                              setStaffError(false);
                              setStaffMsg('Doctor detached.');
                              setDoctorsList((prev) =>
                                prev.filter((d) => (d.id || d.userId) !== (profileId || userId))
                              );
                            } else {
                              setStaffError(true);
                              setStaffMsg(res.error?.message || 'Unable to detach doctor.');
                            }
                          }}
                          className="shrink-0 rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {detachingId === detachKey ? 'Detaching…' : 'Detach'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
