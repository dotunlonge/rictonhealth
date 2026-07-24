'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const res = await api.post('/auth/login', {
      email: emailOrPhone.includes('@') ? emailOrPhone : undefined,
      phone: !emailOrPhone.includes('@') ? emailOrPhone : undefined,
      password,
    });

    setIsLoading(false);

    if (res.success && res.data?.accessToken) {
      api.setToken(res.data.accessToken);
      if (res.data.user) {
        localStorage.setItem('ricton_user', JSON.stringify(res.data.user));
      }
      router.push('/dashboard');
    } else {
      setErrorMsg(res.error?.message || 'Login failed. Please check your credentials.');
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
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Sign in to your healthcare portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-200 dark:border-slate-700">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {errorMsg}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="emailOrPhone"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email or Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="emailOrPhone"
                  name="emailOrPhone"
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="doctor@example.com or +234..."
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-slate-700 dark:text-slate-300"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600 dark:text-slate-400">Don't have an account? </span>
            <Link
              href="/register"
              className="font-semibold text-teal-600 hover:text-teal-500 dark:text-teal-400"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
