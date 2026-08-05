'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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

const HEX_BG = `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`;

type Meeting = {
  id: string;
  status: string;
  provider?: { firstName: string; lastName: string } | null;
  appointment?: { patientName?: string; scheduledAt?: string; reason?: string } | null;
  createdAt: string;
  roomType: string;
};

export default function TelemedicinePage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Tele-medicine');
  const [joinCode, setJoinCode] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Ended' | 'Created'>('All');
  const [creating, setCreating] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Compute current week range label
  const weekLabel = (() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return `${fmt(start)} - ${fmt(end)}`;
  })();

  const weekDays = (() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - now.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return {
        label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'][i],
        day: d.getDate(),
        isToday: d.toDateString() === new Date().toDateString(),
      };
    });
  })();

  const today = new Date();

  useEffect(() => {
    async function load() {
      const [profileRes] = await Promise.all([api.get('/users/me')]);
      if (profileRes.success) setUserProfile(profileRes.data);

      // Load telemedicine sessions — try a rooms listing if available
      const roomsRes = await api.get('/telemedicine/rooms');
      if (roomsRes.success && roomsRes.data) {
        setMeetings(Array.isArray(roomsRes.data) ? roomsRes.data : roomsRes.data.rooms || []);
      }
    }
    load();
  }, []);

  const handleCreateMeeting = async () => {
    setCreating(true);
    const res = await api.post('/telemedicine/rooms', { roomType: 'ONE_ON_ONE' });
    setCreating(false);
    if (res.success && res.data?.id) {
      router.push(`/telemedicine/${res.data.id}`);
    } else {
      alert(res.error?.message || 'Could not create meeting. Check your role permissions.');
    }
  };

  const handleCreateMDT = async () => {
    setCreating(true);
    const res = await api.post('/telemedicine/rooms', { roomType: 'MDT' });
    setCreating(false);
    if (res.success && res.data?.id) {
      router.push(`/telemedicine/${res.data.id}`);
    } else {
      alert(res.error?.message || 'Could not create MDT session.');
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    router.push(`/telemedicine/${joinCode.trim()}`);
  };

  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter === 'All') return true;
    return m.status === statusFilter.toUpperCase();
  });

  const displayName = userProfile
    ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email
    : 'Admin';

  return (
    <div className="min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="w-40 bg-[#1877F2] text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-base">🩺</div>
          <span className="text-lg font-bold">Ricton</span>
        </div>
        <nav className="flex-1 px-2 mt-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setActiveNav(item.label)}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all text-center ${
                activeNav === item.label
                  ? 'bg-white/20 font-semibold'
                  : 'hover:bg-white/10 opacity-80 hover:opacity-100'
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          ))}
          <button className="w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-xl hover:bg-white/10 opacity-80 hover:opacity-100 transition-all mt-4">
            <span className="text-xl mb-0.5">🚪</span>
            <span className="text-[10px]">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="ml-40 flex-1 bg-gradient-to-br from-[#DAE8FE] to-[#EEF4FD] relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{ backgroundImage: HEX_BG, backgroundSize: '110px 190px' }} />

        <div className="relative z-10 flex flex-col">
          {/* Top Bar */}
          <header className="px-8 py-4 flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="flex items-center gap-2 bg-white/70 border border-slate-200 rounded-full px-4 py-2">
                <span className="text-slate-400">🔍</span>
                <input className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none" placeholder="Search consultations..." />
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6">
              <div className="relative">
                <span className="text-2xl">🔔</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{displayName}</p>
                  <p className="text-[10px] text-slate-500">Admin</p>
                </div>
                <img src="https://i.pravatar.cc/150?u=ricton" alt="avatar" className="w-9 h-9 rounded-full object-cover" />
              </div>
            </div>
          </header>

          <div className="px-8 pb-16 overflow-y-auto">
            <h1 className="text-4xl font-bold text-center text-slate-900 mt-6 mb-10 leading-snug">
              Expand your reach &<br />provide seamless care
            </h1>

            {/* Calendar + Actions Row */}
            <div className="flex flex-col lg:flex-row gap-10 items-start justify-center mb-10">
              {/* Calendar */}
              <div className="w-full max-w-sm bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <span className="font-bold text-slate-800 text-sm">{weekLabel}</span>
                  <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-4">
                  {weekDays.map((d) => (
                    <div key={d.label} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-500">{d.label}</span>
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold relative ${
                        d.isToday ? 'bg-[#1877F2] text-white' : 'text-slate-700'
                      }`}>
                        {d.day}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-slate-200 my-4" />

                <div className="flex gap-3 items-center">
                  <div className="bg-slate-100 rounded-xl px-4 py-2 text-center min-w-[56px]">
                    <div className="text-2xl font-black text-slate-900 leading-none">{today.getDate()}</div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {today.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Today</p>
                    <p className="text-xs text-slate-500">{meetings.filter(m => m.status === 'ACTIVE').length} active session(s)</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden lg:block w-px h-48 bg-slate-300 self-center" />

              {/* Action Buttons */}
              <div className="w-full max-w-xs flex flex-col gap-4">
                <button
                  onClick={handleCreateMeeting}
                  disabled={creating}
                  className="w-full py-4 bg-[#1877F2] hover:bg-blue-700 disabled:opacity-60 text-white rounded-full font-bold text-base flex items-center justify-center gap-3 transition-all shadow"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/><line x1="8" y1="9" x2="8" y2="15"/><line x1="5" y1="12" x2="11" y2="12"/></svg>
                  {creating ? 'Creating...' : 'Create new meeting'}
                </button>

                <button
                  onClick={handleCreateMDT}
                  disabled={creating}
                  className="w-full py-4 bg-[#1877F2] hover:bg-blue-700 disabled:opacity-60 text-white rounded-full font-bold text-base transition-all shadow"
                >
                  MDTs
                </button>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    className="w-full py-4 px-6 bg-white/60 backdrop-blur-sm border-2 border-slate-300 rounded-full font-medium text-slate-800 placeholder-slate-500 focus:outline-none focus:border-[#1877F2] transition-colors"
                  />
                  {joinCode && (
                    <button
                      onClick={handleJoin}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1877F2] font-bold text-sm hover:underline"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Meetings Table */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
              <div className="flex justify-end mb-5">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="appearance-none bg-[#1877F2] text-white pl-4 pr-8 py-2 rounded-full text-sm font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="All">All</option>
                    <option value="Created">Scheduled</option>
                    <option value="Active">Active</option>
                    <option value="Ended">Ended</option>
                  </select>
                  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-800 uppercase border-b-2 border-slate-200">
                      <th className="py-3 px-3 text-left">Status</th>
                      <th className="py-3 px-3 text-center">Doctor</th>
                      <th className="py-3 px-3 text-center">Patient</th>
                      <th className="py-3 px-3 text-center">Date / Time</th>
                      <th className="py-3 px-3 text-center">Type</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeetings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                          No consultations found. Create a new meeting to get started.
                        </td>
                      </tr>
                    ) : (
                      filteredMeetings.map((m) => {
                        const statusColor = {
                          ACTIVE: 'bg-green-100 text-green-700',
                          ENDED: 'bg-slate-100 text-slate-500',
                          CREATED: 'bg-blue-100 text-blue-700',
                        }[m.status] || 'bg-slate-100 text-slate-500';

                        return (
                          <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-white/40 transition-colors">
                            <td className="py-4 px-3">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                                {m.status === 'CREATED' ? 'Scheduled' : m.status === 'ENDED' ? 'Ended' : 'Active'}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-center text-slate-700 font-medium">
                              {m.provider ? `Dr. ${m.provider.lastName}` : '—'}
                            </td>
                            <td className="py-4 px-3 text-center text-slate-700">
                              {m.appointment?.patientName || '—'}
                            </td>
                            <td className="py-4 px-3 text-center text-slate-600 text-xs">
                              {m.appointment?.scheduledAt
                                ? new Date(m.appointment.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-4 px-3 text-center">
                              <span className="text-xs font-medium text-slate-600">
                                {m.roomType === 'MDT' ? 'MDT' : '1-on-1'}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-right">
                              {m.status !== 'ENDED' && (
                                <Link
                                  href={`/telemedicine/${m.id}`}
                                  className="inline-block bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors"
                                >
                                  Join
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
