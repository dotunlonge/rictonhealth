'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/store/useAppStore';
import { Video, Plus, Play, ArrowRight } from 'lucide-react';

type Meeting = {
  id: string;
  status: 'ACTIVE' | 'ENDED' | 'CREATED';
  providerName: string;
  patientName: string;
  scheduledTime: string;
  roomType: string;
  createdAt: string;
};

type RoomResponse = {
  id: string;
  status: Meeting['status'];
  roomType: 'ONE_ON_ONE' | 'MDT';
  createdAt: string;
  provider?: {
    email?: string | null;
    providerProfile?: { firstName?: string; lastName?: string } | null;
  } | null;
  appointment?: {
    scheduledAt?: string;
    patient?: {
      email?: string | null;
      patientProfile?: { firstName?: string; lastName?: string } | null;
    } | null;
  } | null;
};

export default function TelemedicinePage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | 'ACTIVE' | 'ENDED' | 'CREATED'>('All');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createType, setCreateType] = useState<'ONE_ON_ONE' | 'MDT'>('ONE_ON_ONE');

  useEffect(() => {
    async function loadMeetings() {
      setLoading(true);
      const res = await api.get('/telemedicine/meetings');
      const rawList = res.success
        ? Array.isArray(res.data)
          ? res.data
          : res.data?.meetings || []
        : [];

      setMeetings(
        (rawList as RoomResponse[]).map((m) => ({
          id: m.id,
          status: m.status,
          providerName:
            m.provider?.providerProfile?.firstName || m.provider?.providerProfile?.lastName
              ? `Dr. ${m.provider.providerProfile?.firstName || ''} ${m.provider.providerProfile?.lastName || ''}`.trim()
              : user?.role === 'CONSULTANT'
                ? `Dr. ${user.firstName || ''} ${user.lastName || ''}`.trim()
                : m.provider?.email || 'Assigned Specialist',
          patientName:
            [
              m.appointment?.patient?.patientProfile?.firstName,
              m.appointment?.patient?.patientProfile?.lastName,
            ]
              .filter(Boolean)
              .join(' ') ||
            m.appointment?.patient?.email ||
            (user?.firstName
              ? `${user.firstName} ${user.lastName || ''}`.trim()
              : 'Patient Consultation'),
          scheduledTime: new Date(m.appointment?.scheduledAt || m.createdAt).toLocaleTimeString(
            [],
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          ),
          roomType: m.roomType === 'MDT' ? 'Multidisciplinary Team' : 'One-on-one',
          createdAt: m.createdAt,
        }))
      );
      setLoading(false);
    }
    loadMeetings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const handleCreateMeeting = async () => {
    setCreating(true);
    setCreateError(null);
    const res = await api.post('/telemedicine/meetings', { roomType: createType });
    setCreating(false);
    if (res.success && res.data?.id) {
      router.push(`/telemedicine/${res.data.id}`);
    } else {
      setCreateError(res.error?.message || 'Failed to create consultation room. Please try again.');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code || joining) return;
    // Validate before navigating WITHOUT joining: POST /rooms/:id/join flips
    // CREATED→ACTIVE + joinedAt server-side, so a lobby pre-check through it
    // would masquerade abandoned checks as attended sessions. The token
    // endpoint is membership- and window-checked but presence-free; the room
    // page performs the real join after its RTC connection succeeds.
    setJoining(true);
    setJoinError(null);
    const res = await api.post(`/telemedicine/rooms/${encodeURIComponent(code)}/token`);
    setJoining(false);
    if (res.success) {
      router.push(`/telemedicine/${encodeURIComponent(code)}`);
    } else {
      setJoinError(
        res.error?.message ||
          'We could not join that room. Check the room ID from your appointment and try again.'
      );
    }
  };

  const filteredMeetings = meetings.filter(
    (m) => statusFilter === 'All' || m.status === statusFilter
  );

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Video className="w-6 h-6 text-[#1877F2]" /> Telemedicine & Live Video Consultations
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Secure provider-hosted video consultations (TLS-encrypted transport)
            </p>
          </div>

          {(user?.role === 'CONSULTANT' || user?.role === 'SUPER_ADMIN') && (
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                Room type
                <select
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value as 'ONE_ON_ONE' | 'MDT')}
                  aria-label="Room type"
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="ONE_ON_ONE">One-on-one</option>
                  <option value="MDT">MDT (team)</option>
                </select>
              </label>
              <button
                type="button"
                onClick={handleCreateMeeting}
                disabled={creating}
                className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {creating
                    ? 'Initializing Room...'
                    : createType === 'MDT'
                      ? 'Start MDT Session'
                      : 'Start Instant Consultation'}
                </span>
              </button>
            </div>
          )}
        </div>

        {createError && (
          <div className="p-4 rounded-2xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
            <span>{createError}</span>
          </div>
        )}

        {/* Join Consultation Card */}
        <div className="bg-[#0A192F] text-white rounded-3xl p-8 shadow-xl space-y-4 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-[#1877F2] flex items-center justify-center font-bold border border-blue-500/30">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Join Video Room with Code</h2>
              <p className="text-xs text-slate-400 font-medium">
                Enter the room ID from your appointment to join
              </p>
            </div>
          </div>

          <form
            onSubmit={handleJoin}
            className="flex gap-3 max-w-md"
            aria-label="Join video room by ID"
          >
            <label htmlFor="tele-room-code" className="sr-only">
              Video room ID from your appointment
            </label>
            <input
              id="tele-room-code"
              type="text"
              placeholder="Paste the room ID from your appointment"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              aria-invalid={joinError ? true : undefined}
              aria-describedby={joinError ? 'tele-join-error' : undefined}
              className="flex-1 px-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-2xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim()}
              className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-all flex items-center gap-1.5 shadow-md"
            >
              <span>{joining ? 'Joining…' : 'Join Room'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          {joinError && (
            <p
              id="tele-join-error"
              role="alert"
              className="text-xs font-semibold text-rose-300 max-w-md"
            >
              {joinError}
            </p>
          )}
        </div>

        {/* Consultation Rooms List */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Your Video Consultation Sessions</h2>

            <div className="flex items-center bg-slate-200/60 p-1 rounded-full border border-slate-200">
              {(['All', 'ACTIVE', 'CREATED', 'ENDED'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    statusFilter === tab
                      ? 'bg-[#1877F2] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                Loading consultation rooms...
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Video className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  No video consultation sessions currently active
                </p>
                {(user?.role === 'CONSULTANT' || user?.role === 'SUPER_ADMIN') && (
                  <button
                    type="button"
                    onClick={handleCreateMeeting}
                    className="text-xs text-[#1877F2] font-bold hover:underline"
                  >
                    + Create Instant Video Consultation Room
                  </button>
                )}
              </div>
            ) : (
              filteredMeetings.map((room) => (
                <div
                  key={room.id}
                  className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between gap-4 hover:border-blue-200 transition-all flex-wrap"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1877F2] border border-blue-100 flex items-center justify-center font-bold shrink-0">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">
                          {room.providerName}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                            room.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : room.status === 'CREATED'
                                ? 'bg-blue-100 text-[#1877F2]'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {room.roomType} • {room.scheduledTime}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/telemedicine/${room.id}`)}
                    className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs transition-all shadow-sm flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Enter Consultation Room</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
