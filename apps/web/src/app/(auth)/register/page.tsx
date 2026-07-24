'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'PATIENT' | 'DOCTOR' | 'PHARMACIST' | 'HOSPITAL_ADMIN'>('PATIENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const res = await api.post('/auth/register', {
      email,
      phone,
      password,
      role,
      firstName,
      lastName,
    });

    setIsLoading(false);

    if (res.success) {
      // Send verification OTP automatically
      await api.post('/auth/otp/send', { email, type: 'EMAIL_VERIFICATION' });
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } else {
      setErrorMsg(res.error?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2 text-2xl font-bold text-teal-600 dark:text-teal-400">
          <span className="p-2 bg-teal-600 text-white rounded-xl shadow-md">🏥</span>
          Ricton Health
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 dark:text-white">
          Create Account
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Join the healthcare network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-700">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'PATIENT', label: 'Patient' },
                { key: 'DOCTOR', label: 'Doctor' },
                { key: 'PHARMACIST', label: 'Pharmacist' },
                { key: 'HOSPITAL_ADMIN', label: 'Hospital' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRole(item.key as any)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    role === item.key
                      ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                      : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-teal-500'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234..."
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Creating Account...' : 'Continue to Verification'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Already registered? </span>
            <Link
              href="/login"
              className="font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
