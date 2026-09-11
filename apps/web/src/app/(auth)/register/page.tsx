'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { loginWithGoogleToken, triggerAppleAuth } from '@/lib/oauth';
import Navbar from '@/components/Navbar';
import { useAppStore } from '@/store/useAppStore';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const [role, setRole] = useState<'PATIENT' | 'CONSULTANT' | 'PHARMACIST'>('PATIENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const appleSignInEnabled = Boolean(process.env.NEXT_PUBLIC_APPLE_CLIENT_ID);

  const canContinue =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0 &&
    password.length >= 8;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canContinue || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/register', {
        email,
        phone,
        password,
        role,
        firstName,
        lastName,
        consentVersion: '1.0',
      });

      if (!res.success) {
        setErrorMsg(res.error?.message || 'Registration failed. Please try again.');
        return;
      }

      const verification = await api.post('/auth/verify-email', { email });
      if (!verification.success) {
        setErrorMsg(
          verification.error?.message ||
            'Your account was created, but the verification code could not be sent. Try again.'
        );
        return;
      }

      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await loginWithGoogleToken(credential, role);
      setIsLoading(false);
      if (res.success && res.data?.token) {
        api.setToken(res.data.token, res.data?.refreshToken ?? null, res.data?.user?.role ?? role);
        if (res.data.user) {
          setUser(res.data.user);
        }
        if (role === 'CONSULTANT') {
          router.push('/onboarding/doctor');
        } else if (role === 'PHARMACIST') {
          router.push('/onboarding/pharmacy');
        } else {
          router.push('/dashboard');
        }
      } else {
        setErrorMsg(res.error?.message || 'Google Sign-Up failed.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Google Sign-Up failed.');
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await triggerAppleAuth(role);
      setIsLoading(false);
      if (res.success && res.data?.token) {
        api.setToken(res.data.token, res.data?.refreshToken ?? null, res.data?.user?.role ?? role);
        if (res.data.user) {
          setUser(res.data.user);
        }
        router.push('/dashboard');
      } else {
        setErrorMsg(res.error?.message || 'Apple Sign-Up failed.');
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message || 'Apple Sign-Up failed.');
    }
  };

  const roleOptions = [
    {
      key: 'PATIENT',
      label: 'Patient',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      key: 'CONSULTANT',
      label: 'Doctor',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-3-3v6m-9 1a9 9 0 1118 0 9 9 0 01-18 0z"
          />
        </svg>
      ),
    },
    {
      key: 'PHARMACIST',
      label: 'Pharmacist',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.8.568l-.4.4a2 2 0 000 2.828l.4.4a2 2 0 001.8.568l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.8-.568l.4-.4a2 2 0 000-2.828l-.4-.4z"
          />
        </svg>
      ),
    },
  ];

  return (
    <main className="bg-slate-50 min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-slate-900 pb-16">
      <Navbar />

      {/* Registration Form Card Section */}
      <section
        className="max-w-[925px] mx-auto mt-8 sm:mt-12 bg-white rounded-[40px] md:rounded-[50px] shadow-[0px_4px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-8 sm:p-14 space-y-8"
        aria-labelledby="register-heading"
      >
        <div>
          <h1 id="register-heading" className="text-2xl font-bold text-slate-900 tracking-tight">
            Create Your Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Join the Ricton Healthcare Network as a patient, doctor, or partner.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* Role Selector Pills */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
            I am joining as:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {roleOptions.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRole(item.key as any)}
                className={`py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  role === item.key
                    ? 'bg-[#1c7bcf] border-[#1c7bcf] text-white shadow-md'
                    : 'border-slate-200 text-slate-700 hover:border-[#1c7bcf]/50 bg-slate-50/50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5">
            {/* First & Last Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="sr-only">First Name</label>
                <input
                  className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="sr-only">Last Name</label>
                <input
                  className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="sr-only">Email Address</label>
              <input
                className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Phone Number Field */}
            <div className="relative">
              <label className="sr-only">Phone Number</label>
              <input
                className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                type="tel"
                placeholder="Phone Number (+234...)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div className="relative flex items-center">
              <label className="sr-only">Password</label>
              <input
                className="w-full h-14 pl-6 pr-14 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="Password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                className="absolute right-5 p-2 text-slate-400 hover:text-slate-600 focus:outline-none"
                type="button"
                onClick={() => setIsPasswordVisible((v) => !v)}
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isPasswordVisible ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            className={`w-full h-14 flex items-center justify-center bg-[#1c7bcf] hover:bg-[#1561a7] text-white font-semibold text-lg rounded-2xl shadow-lg shadow-[#1c7bcf]/20 transition-all ${
              canContinue && !isLoading
                ? 'opacity-100 cursor-pointer'
                : 'opacity-50 cursor-not-allowed'
            }`}
            type="submit"
            disabled={!canContinue || isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Continue to Verification'}
          </button>
        </form>

        {/* Social Register Divider */}
        <div className="text-center pt-2">
          <p className="text-slate-400 text-base font-medium">Or Fast Register With</p>
        </div>

        {/* Social Buttons */}
        <div className={`grid grid-cols-1 gap-4 ${appleSignInEnabled ? 'sm:grid-cols-2' : ''}`}>
          <GoogleSignInButton
            onCredential={handleGoogleCredential}
            onError={setErrorMsg}
            busy={isLoading}
            text="signup_with"
          />
          {appleSignInEnabled && (
            <button
              className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-slate-400 bg-white text-base font-semibold text-slate-900 shadow-sm transition-all hover:border-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={handleAppleAuth}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 text-slate-900 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.16-.55 2.82-1.36z" />
              </svg>
              Sign up with Apple
            </button>
          )}
        </div>

        {/* Footer Link */}
        <div className="text-center pt-2">
          <p className="text-slate-500 text-base font-medium">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#1c7bcf] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
