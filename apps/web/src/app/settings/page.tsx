'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function SettingsPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const res = await api.get('/users/me');
      if (res.success && res.data) {
        setFirstName(res.data.firstName || '');
        setLastName(res.data.lastName || '');
        setEmail(res.data.email || '');
        setPhone(res.data.phone || '');
        setMedicalHistory(res.data.patientProfile?.medicalHistory || '');
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const res = await api.put('/users/me', {
      firstName,
      lastName,
      phone,
    });

    setSaving(false);

    if (res.success) {
      setMessage('Profile settings updated successfully!');
    } else {
      setMessage(res.error?.message || 'Failed to update profile.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold">⚙️</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Account Settings</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Dashboard
            </Link>
            <Link href="/settings" className="text-teal-600 font-semibold">
              Settings
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Personal Profile</h1>
            <p className="text-sm text-slate-500">Update your account information and contact preferences</p>
          </div>

          {message && (
            <div className="p-4 bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 rounded-xl text-sm font-medium">
              {message}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500 py-6">Loading profile information...</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address (Verified)
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-100 dark:bg-slate-950 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Medical History Summary
                </label>
                <textarea
                  rows={3}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Known allergies, underlying conditions..."
                  className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-sm shadow transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
