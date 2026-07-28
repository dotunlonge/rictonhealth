'use client';

import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

type FormValues = {
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  password: string;
};

const initialFormValues: FormValues = {
  firstName: '',
  lastName: '',
  gender: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  password: '',
};

export default function DoctorOnboardingPage() {
  const router = useRouter();

  // Onboarding Step State: 1 = Details, 2 = Verification Code
  const [step, setStep] = useState<1 | 2>(1);

  // Form Details
  const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
  const [showPassword, setShowPassword] = useState(false);

  // Email Verification Code
  const [verificationCode, setVerificationCode] = useState<string[]>(
    Array.from({ length: 5 }, () => '')
  );
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password Requirements
  const passwordRequirements = useMemo(
    () => [
      {
        label: '8 character minimum',
        isMet: formValues.password.length >= 8,
      },
      {
        label: 'a number',
        isMet: /\d/.test(formValues.password),
      },
      {
        label: 'a symbol',
        isMet: /[^A-Za-z0-9]/.test(formValues.password),
      },
    ],
    [formValues.password]
  );

  const isFormValid =
    formValues.firstName.trim().length > 0 &&
    formValues.lastName.trim().length > 0 &&
    formValues.gender.length > 0 &&
    formValues.dateOfBirth.length > 0 &&
    /\S+@\S+\.\S+/.test(formValues.email) &&
    formValues.phone.trim().length > 0 &&
    passwordRequirements.every((requirement) => requirement.isMet);

  const isCodeComplete = verificationCode.every((digit) => digit.length === 1);

  const updateField = (field: keyof FormValues, value: string) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
    setErrorMsg('');
  };

  // Step 1: Submit Details & Move to Verification
  const handleDetailsSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;
    setStep(2);
  };

  // Step 2 Verification Input Handlers
  const handleCodeChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '');

    if (!value) {
      const nextCode = [...verificationCode];
      nextCode[index] = '';
      setVerificationCode(nextCode);
      return;
    }

    const nextCode = [...verificationCode];
    const incomingDigits = value.slice(0, verificationCode.length - index).split('');

    incomingDigits.forEach((digit, digitIndex) => {
      nextCode[index + digitIndex] = digit;
    });

    setVerificationCode(nextCode);

    const nextInputIndex = Math.min(
      index + incomingDigits.length,
      verificationCode.length - 1
    );

    inputRefs.current[nextInputIndex]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !verificationCode[index] && index > 0) {
      event.preventDefault();
      const nextCode = [...verificationCode];
      nextCode[index - 1] = '';
      setVerificationCode(nextCode);
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < verificationCode.length - 1) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDifferentEmail = () => {
    setVerificationCode(Array.from({ length: 5 }, () => ''));
    setStep(1);
  };

  // Step 2: Final Verification Submit
  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isCodeComplete || submitting) {
      inputRefs.current[verificationCode.findIndex((digit) => !digit)]?.focus();
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    // Register doctor account & onboarding details
    const res = await api.post('/auth/register', {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      email: formValues.email,
      phone: formValues.phone,
      password: formValues.password,
      role: 'DOCTOR',
      gender: formValues.gender,
      dateOfBirth: formValues.dateOfBirth,
      verificationCode: verificationCode.join(''),
    });

    setSubmitting(false);

    if (res.success && res.data?.accessToken) {
      api.setToken(res.data.accessToken);
      if (res.data.user) {
        localStorage.setItem('ricton_user', JSON.stringify(res.data.user));
      }
      router.push('/dashboard');
    } else {
      setErrorMsg(res.error?.message || 'Verification failed. Please check your 5-digit code.');
    }
  };

  return (
    <main className="bg-slate-50 min-h-screen w-full relative overflow-x-hidden font-sans antialiased text-slate-900 pb-16">
      {/* Background Cover Image Banner */}
      <div className="w-full h-80 md:h-[450px] relative overflow-hidden bg-slate-200">
        <img
          src="/hero-doctors.png"
          alt="African American medical doctor"
          className="w-full h-full object-cover object-top filter brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-slate-50" />
      </div>

      {/* Primary Navigation Header */}
      <header className="max-w-[1400px] mx-auto px-8 py-6 w-full flex items-center justify-between absolute top-0 left-0 right-0 z-50">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-black text-2xl text-[#1c7bcf]"
          aria-label="Ricton home"
        >
          <img
            src="/logo.svg"
            alt="Ricton Logo"
            className="w-10 h-10 object-contain drop-shadow"
          />
          <span className="tracking-tight text-slate-900 font-extrabold text-2xl">Ricton</span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-12">
          <Link href="/" className="text-base font-semibold text-slate-900 hover:text-[#1c7bcf] transition-colors">
            Home
          </Link>
          <Link href="/#services" className="text-base font-semibold text-slate-900 hover:text-[#1c7bcf] transition-colors">
            Services
          </Link>
          <Link href="/#resources" className="text-base font-semibold text-slate-900 hover:text-[#1c7bcf] transition-colors">
            Resources
          </Link>
          <Link href="/#pricing" className="text-base font-semibold text-slate-900 hover:text-[#1c7bcf] transition-colors">
            Pricing
          </Link>
          <Link href="/#about-us" className="text-base font-semibold text-slate-900 hover:text-[#1c7bcf] transition-colors">
            About us
          </Link>
        </nav>
      </header>

      {/* Step 1: Your Details Form */}
      {step === 1 && (
        <section
          className="max-w-[925px] mx-auto -mt-32 md:-mt-48 relative z-20 bg-white/95 backdrop-blur-md rounded-[40px] md:rounded-[50px] shadow-[0px_4px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-8 sm:p-14 space-y-8"
          aria-labelledby="details-heading"
        >
          <h1
            id="details-heading"
            className="text-2xl font-bold text-slate-900 tracking-tight"
          >
            Your details
          </h1>

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleDetailsSubmit} noValidate className="space-y-6">
            <div className="flex flex-col gap-4">
              {/* First Name */}
              <div className="relative">
                <label className="sr-only">First name</label>
                <input
                  className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                  type="text"
                  name="firstName"
                  value={formValues.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  required
                />
              </div>

              {/* Last Name */}
              <div className="relative">
                <label className="sr-only">Last name</label>
                <input
                  className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                  type="text"
                  name="lastName"
                  value={formValues.lastName}
                  onChange={(event) => updateField('lastName', event.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  required
                />
              </div>

              {/* Gender Select */}
              <div className="relative">
                <label className="sr-only">Gender</label>
                <select
                  className={`w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-base outline-none transition-all appearance-none bg-white ${
                    formValues.gender ? 'text-slate-900' : 'text-slate-400'
                  }`}
                  name="gender"
                  value={formValues.gender}
                  onChange={(event) => updateField('gender', event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Gender
                  </option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div className="relative">
                <label className="sr-only">Date of birth</label>
                <input
                  className={`w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-base outline-none transition-all ${
                    formValues.dateOfBirth ? 'text-slate-900' : 'text-slate-400'
                  }`}
                  type="date"
                  name="dateOfBirth"
                  value={formValues.dateOfBirth}
                  onChange={(event) => updateField('dateOfBirth', event.target.value)}
                  aria-label="Date of birth"
                  required
                />
              </div>

              {/* Email Address */}
              <div className="relative">
                <label className="sr-only">Email address</label>
                <input
                  className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="relative">
                <label className="sr-only">Phone number</label>
                <input
                  className="w-full h-14 px-6 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                  type="tel"
                  name="phone"
                  value={formValues.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="Phone number"
                  autoComplete="tel"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative flex items-center">
                <label className="sr-only">Enter password</label>
                <input
                  className="w-full h-14 pl-6 pr-14 rounded-2xl border border-slate-300 focus:border-[#1c7bcf] focus:ring-2 focus:ring-[#1c7bcf]/20 text-slate-900 placeholder:text-slate-400 text-base outline-none transition-all"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formValues.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  required
                />
                <button
                  className="absolute right-5 p-2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-4 pt-2">
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1c7bcf] transition-all duration-300"
                  style={{
                    width: `${
                      (passwordRequirements.filter((r) => r.isMet).length /
                        passwordRequirements.length) *
                      100
                    }%`,
                  }}
                />
              </div>

              <ul className="space-y-2">
                {passwordRequirements.map((requirement) => (
                  <li
                    className="flex items-center gap-3 text-slate-700 text-sm font-medium"
                    key={requirement.label}
                  >
                    <span
                      className={`w-5 h-5 rounded-full border border-slate-400 flex items-center justify-center text-xs text-white transition-colors ${
                        requirement.isMet ? 'bg-[#1c7bcf] border-[#1c7bcf]' : 'bg-transparent'
                      }`}
                    >
                      {requirement.isMet ? '✓' : ''}
                    </span>
                    <span>{requirement.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step 1 Continue Button */}
            <button
              className={`w-full h-14 flex items-center justify-center bg-[#1c7bcf] hover:bg-[#1561a7] text-white font-semibold text-lg rounded-2xl shadow-lg shadow-[#1c7bcf]/20 transition-all ${
                isFormValid ? 'opacity-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
              type="submit"
              disabled={!isFormValid}
            >
              Continue
            </button>
          </form>
        </section>
      )}

      {/* Step 2: Email Verification Code Section */}
      {step === 2 && (
        <section
          className="max-w-[925px] mx-auto -mt-32 md:-mt-48 relative z-20 bg-white/95 backdrop-blur-md rounded-[40px] md:rounded-[50px] shadow-[0px_4px_30px_rgba(0,0,0,0.08)] border border-slate-100 p-8 sm:p-14 space-y-8"
          aria-labelledby="verify-email-heading"
        >
          <h1
            id="verify-email-heading"
            className="text-2xl font-bold text-slate-900 tracking-tight"
          >
            Verify your email
          </h1>

          <p className="text-slate-800 text-lg font-medium">
            We just sent a 5-digit code to{' '}
            <span className="font-bold text-[#1c7bcf]">{formValues.email}</span>, enter it below:
          </p>

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleVerifySubmit} noValidate className="space-y-8">
            <fieldset className="flex justify-center gap-3 sm:gap-4 py-4">
              <legend className="sr-only">Five digit verification code</legend>
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  className="w-14 h-16 sm:w-20 sm:h-24 rounded-xl border border-slate-300 bg-white text-center font-bold text-2xl sm:text-3xl text-slate-900 caret-[#1c7bcf] focus:border-[#1c7bcf] focus:ring-4 focus:ring-[#1c7bcf]/20 outline-none transition-all"
                  aria-label={`Verification code digit ${index + 1}`}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  inputMode="numeric"
                  maxLength={5}
                  name={`verification-digit-${index + 1}`}
                  onChange={(event) => handleCodeChange(index, event)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  pattern="[0-9]*"
                  type="text"
                  value={digit}
                />
              ))}
            </fieldset>

            <button
              className={`w-full h-14 flex items-center justify-center bg-[#1c7bcf] hover:bg-[#1561a7] text-white font-semibold text-lg rounded-2xl shadow-lg shadow-[#1c7bcf]/20 transition-all ${
                isCodeComplete && !submitting ? 'opacity-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
              disabled={!isCodeComplete || submitting}
              type="submit"
            >
              {submitting ? 'Verifying...' : 'Verify email'}
            </button>

            <div className="text-center pt-2">
              <p className="text-slate-800 text-base font-medium">
                <span>Wrong email? </span>
                <button
                  className="font-bold text-[#1c7bcf] hover:underline focus:outline-none ml-1"
                  onClick={handleDifferentEmail}
                  type="button"
                >
                  Send to a different email
                </button>
              </p>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
