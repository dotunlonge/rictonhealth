'use client';

import { FormEvent, useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { CalendarClock } from 'lucide-react';

const DAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

export default function AvailabilityPage() {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  type Rule = {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    isActive: boolean;
  };
  const [rules, setRules] = useState<Rule[]>([]);
  const [listNote, setListNote] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    async function loadList() {
      setLoadingList(true);
      // No documented availability-windows list endpoint (only POST
      // /appointments/availability + GET /appointments/slots). Try likely
      // list routes; fall back to the session-local list below.
      for (const path of ['/appointments/availability', '/users/me/availability']) {
        try {
          const res = await api.get<unknown>(path);
          const list = res.success
            ? Array.isArray(res.data)
              ? res.data
              : (res.data as { availability?: unknown[] })?.availability
            : null;
          if (res.success && Array.isArray(list)) {
            setRules(list as Rule[]);
            setListNote(null);
            setLoadingList(false);
            return;
          }
        } catch {
          // try next candidate
        }
      }
      setListNote('No availability list endpoint — showing windows saved this session.');
      setLoadingList(false);
    }
    loadList();
  }, []);

  const removeRule = (index: number) => {
    // Local-only removal: the backend exposes no DELETE for availability
    // windows (only POST /appointments/availability + leave-day CRUD at
    // /appointments/leave/:id). Never call a phantom endpoint — the saved
    // window stays server-side until superseded by a newer save.
    setRules((prev) => prev.filter((_, i) => i !== index));
    setListNote(
      'Removed from this view only. To retract saved availability, save a corrected window or add a leave day.'
    );
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const res = await api.post('/appointments/availability', {
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      isActive,
    });

    setSaving(false);
    if (res.success) {
      setMessage('Availability saved. Patients will see matching open slots immediately.');
      const saved = (res.data as Rule | undefined) || {
        dayOfWeek,
        startTime,
        endTime,
        slotDurationMinutes,
        isActive,
      };
      setRules((prev) => [saved as Rule, ...prev]);
    } else {
      setError(res.error?.message || 'Availability could not be saved.');
    }
  };

  return (
    <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <CalendarClock className="h-6 w-6 text-[#1877F2]" />
            Appointment Availability
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Set the weekly hours that power patient slot booking.
          </p>
        </div>

        <form
          onSubmit={save}
          className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Day
            <select
              value={dayOfWeek}
              onChange={(event) => setDayOfWeek(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#1877F2]"
            >
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Start time
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#1877F2]"
                required
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              End time
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#1877F2]"
                required
              />
            </label>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
            Slot duration
            <select
              value={slotDurationMinutes}
              onChange={(event) => setSlotDurationMinutes(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#1877F2]"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>

          <label className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-[#1877F2]"
            />
            Accept bookings during this window
          </label>

          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-full bg-[#1877F2] px-6 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-[#1565C0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving availability...' : 'Save availability'}
          </button>
        </form>

        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Saved windows</h2>
          {listNote && <p className="text-[11px] font-semibold text-slate-400">{listNote}</p>}
          {loadingList ? (
            <p className="text-xs font-semibold text-slate-400">Loading availability…</p>
          ) : rules.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">No windows saved yet.</p>
          ) : (
            <ul className="space-y-2">
              {rules.map((rule, i) => (
                <li
                  key={rule.id ?? `${rule.dayOfWeek}-${rule.startTime}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-2.5 text-xs"
                >
                  <span className="font-bold text-slate-800">
                    {DAYS.find((d) => d.value === rule.dayOfWeek)?.label ?? `Day ${rule.dayOfWeek}`}{' '}
                    · {rule.startTime}–{rule.endTime} · {rule.slotDurationMinutes} min ·{' '}
                    {rule.isActive ? 'Active' : 'Paused'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void removeRule(i)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold rounded-full transition-all"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
