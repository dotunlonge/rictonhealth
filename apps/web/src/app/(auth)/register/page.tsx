'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { loginWithGoogleToken, loginWithAppleToken } from '@/lib/oauth';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'PATIENT' | 'CONSULTANT' | 'PHARMACIST' | 'HOSPITAL_ADMIN'>('PATIENT');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const googleToken = prompt('Enter Google OAuth ID Token (or test token):', 'google-test-id-token');
      if (!googleToken) {
        setIsLoading(false);
        return;
      }
      const res = await loginWithGoogleToken(googleToken, role);
      setIsLoading(false);

      if (res.success && res.data?.token) {
        api.setToken(res.data.token);
        if (res.data.user) {
          localStorage.setItem('ricton_user', JSON.stringify(res.data.user));
        }
        router.push('/dashboard');
      } else {
        setErrorMsg(res.error?.message || 'Google Sign-Up failed. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Google Sign-Up failed');
    }
  };

  const handleAppleAuth = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const appleToken = prompt('Enter Apple Sign-In ID Token (or test token):', 'apple-test-id-token');
      if (!appleToken) {
        setIsLoading(false);
        return;
      }
      const res = await loginWithAppleToken(appleToken, role);
      setIsLoading(false);

      if (res.success && res.data?.token) {
        api.setToken(res.data.token);
        if (res.data.user) {
          localStorage.setItem('ricton_user', JSON.stringify(res.data.user));
        }
        router.push('/dashboard');
      } else {
        setErrorMsg(res.error?.message || 'Apple Sign-Up failed. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Apple Sign-Up failed');
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-slate-900 pb-16">
      {/* Primary Navigation Header */}
      <header className="max-w-[1400px] mx-auto px-8 py-6 w-full flex items-center justify-between sticky top-0 bg-slate-50/90 backdrop-blur-md z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-black text-2xl text-[#1c7bcf]"
          aria-label="Ricton home"
        >
          <img src="/logo.svg" alt="Ricton Logo" className="w-10 h-10 object-contain" />
          <span className="tracking-tight text-slate-900 font-extrabold text-2xl">Ricton</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-12">
          <Link href="/" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Home
          </Link>
          <Link href="/#services" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Services
          </Link>
          <Link href="/#resources" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Resources
          </Link>
          <Link href="/#pricing" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Pricing
          </Link>
          <Link href="/#about-us" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            About us
          </Link>
        </nav>
      </header>

      {/* Registration Form Card Section */}
      <section
        className="max-w-[925px] mx-auto mt-8 sm:mt-12 bg-white rounded-[40px] md:rounded-[50px] shadow-[0px_4px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-8 sm:p-14 space-y-8"
        aria-labelledby="register-heading"
      >
        <div>
          <h1
            id="register-heading"
            className="text-2xl font-bold text-slate-900 tracking-tight"
          >
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
            {[
              { key: 'PATIENT', label: 'Patient', icon: '👤' },
              { key: 'CONSULTANT', label: 'Doctor', icon: '🩺' },
              { key: 'PHARMACIST', label: 'Pharmacist', icon: '💊' },
              { key: 'HOSPITAL_ADMIN', label: 'Hospital', icon: '🏥' },
            ].map((item) => (
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
                {isPasswordVisible ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            className={`w-full h-14 flex items-center justify-center bg-[#1c7bcf] hover:bg-[#1561a7] text-white font-semibold text-lg rounded-2xl shadow-lg shadow-[#1c7bcf]/20 transition-all ${
              canContinue && !isLoading ? 'opacity-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            className="w-full h-14 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-base flex items-center justify-center gap-3 transition-all bg-white hover:bg-slate-50 shadow-sm"
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Google
          </button>
          <button
            className="w-full h-14 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-base flex items-center justify-center gap-3 transition-all bg-white hover:bg-slate-50 shadow-sm"
            type="button"
            onClick={handleAppleAuth}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 text-slate-900 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.13.64-2.82 1.44-.61.71-1.14 1.86-.99 2.96 1.07.08 2.16-.55 2.82-1.36z" />
            </svg>
            Apple
          </button>
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
