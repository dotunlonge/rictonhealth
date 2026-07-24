'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setUser(userRes.data);
      }

      const apptRes = await api.get('/appointments');
      if (apptRes.success && apptRes.data) {
        setAppointments(Array.isArray(apptRes.data) ? apptRes.data : apptRes.data.appointments || []);
      }

      setLoading(false);
    }
    loadDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navigation Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold">🏥</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Ricton Portal</span>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="/dashboard" className="text-teal-600 dark:text-teal-400 font-semibold">
              Dashboard
            </Link>
            <Link href="/providers" className="hover:text-teal-600 dark:hover:text-teal-400">
              Find Doctors
            </Link>
            <Link href="/appointments" className="hover:text-teal-600 dark:hover:text-teal-400">
              Appointments
            </Link>
            <Link href="/wallet" className="hover:text-teal-600 dark:hover:text-teal-400">
              Wallet
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {user ? `${user.firstName || ''} ${user.lastName || ''}` : 'Loading...'}
              </p>
              <p className="text-xs text-slate-500">{user?.role || 'PATIENT'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center border border-teal-200">
              {user?.firstName?.[0] || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
              Healthcare Overview
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold">
              Welcome back, {user?.firstName || 'Patient'}!
            </h1>
            <p className="mt-2 text-teal-100 text-sm sm:text-base">
              Manage your upcoming medical consultations, view e-prescriptions, and access top healthcare specialists.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/providers"
                className="px-5 py-2.5 bg-white text-teal-700 font-semibold rounded-xl text-sm shadow hover:bg-teal-50 transition-colors"
              >
                Book Consultation
              </Link>
              <Link
                href="/wallet"
                className="px-5 py-2.5 bg-teal-700/50 hover:bg-teal-700 border border-white/20 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                View Digital Wallet
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Upcoming Appointments</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{appointments.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Prescriptions</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">2</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Wallet Balance</p>
            <p className="text-3xl font-bold text-teal-600 dark:text-teal-400 mt-2">₦25,000.00</p>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Consultations</h2>
            <Link href="/appointments" className="text-xs font-semibold text-teal-600 hover:text-teal-500">
              View All
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 py-4">Loading consultations...</p>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <p className="text-sm">No scheduled appointments found.</p>
              <Link href="/providers" className="mt-3 inline-block text-xs font-semibold text-teal-600 hover:underline">
                Search available doctors →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      Consultation #{appt.id.slice(-6)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(appt.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {appt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
