'use client';

import { FormEvent, useState } from 'react';
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
    } else {
      setError(res.error?.message || 'Availability could not be saved.');
    }
  };

  return (
    <SidebarLayout>
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
      </div>
    </SidebarLayout>
  );
}
