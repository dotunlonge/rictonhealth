'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    async function loadAppointments() {
      const res = await api.get('/appointments');
      if (res.success && res.data) {
        setAppointments(Array.isArray(res.data) ? res.data : res.data.appointments || []);
      }
      setLoading(false);
    }
    loadAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    const res = await api.patch(`/appointments/${id}/cancel`, { reason: 'Cancelled by patient' });
    if (res.success) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'CANCELLED' } : a))
      );
    } else {
      alert(res.error?.message || 'Cancellation failed.');
    }
  };

  const filteredAppointments = appointments.filter((a) =>
    filter === 'ALL' ? true : a.status === filter
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold">🏥</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Ricton Appointments</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Dashboard
            </Link>
            <Link href="/providers" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Find Doctors
            </Link>
            <Link href="/appointments" className="text-teal-600 font-semibold">
              Appointments
            </Link>
            <Link href="/wallet" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Wallet
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Consultation Bookings</h1>
            <p className="text-sm text-slate-500">Track and manage your scheduled virtual & clinical appointments</p>
          </div>
          <Link
            href="/providers"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow transition-colors text-center"
          >
            + Book New Appointment
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          {(['ALL', 'SCHEDULED', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                filter === tab
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm text-slate-500 py-8 text-center">Loading appointments...</p>
        ) : filteredAppointments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-300">No appointments found in this category.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appt) => (
              <div
                key={appt.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      Consultation #{appt.id.slice(-6)}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        appt.status === 'SCHEDULED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : appt.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Scheduled for: {new Date(appt.scheduledAt).toLocaleString()}
                  </p>
                  {appt.reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 italic">
                      "{appt.reason}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {appt.status === 'SCHEDULED' && (
                    <>
                      <Link
                        href={`/telemedicine/${appt.id}`}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs shadow transition-colors"
                      >
                        Join Call Room
                      </Link>
                      <button
                        onClick={() => handleCancel(appt.id)}
                        className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-semibold rounded-xl text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
