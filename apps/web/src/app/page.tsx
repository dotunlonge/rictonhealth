'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { useCurrentUser, type UserRole } from '@/store/useAppStore';

function homeForRole(role: UserRole | undefined): string {
  if (role === 'SUPER_ADMIN') return '/admin';
  if (role === 'HOSPITAL_ADMIN') return '/dashboard/hospital';
  if (role === 'PHARMACIST') return '/dashboard/pharmacy';
  return '/dashboard';
}

export default function LandingPage() {
  const [message, setMessage] = useState('');
  const user = useCurrentUser();
  const authed = user !== null;
  const dashboardHref = homeForRole(user?.role);

  const handleJoin = () => {
    setMessage('Thank you for your interest in joining Ricton Health Network.');
  };

  return (
    <div
      id="home"
      className="bg-white overflow-x-hidden w-full min-h-screen relative font-sans antialiased text-slate-900"
    >
      {/* Full-width Responsive Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section
        aria-labelledby="hero-heading"
        className="w-full bg-white py-12 sm:py-20 border-b border-slate-100"
      >
        <div className="max-w-350 mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-sky-50 border border-sky-200/80 text-sky-700 text-xs sm:text-sm font-semibold tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
              <span>Next-Generation Connected Healthcare Ecosystem</span>
            </div>

            <h1
              id="hero-heading"
              className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1]"
            >
              Because every patient deserves{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-600 to-blue-700">
                world-class care.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal max-w-2xl leading-relaxed">
              Ricton unifies virtual consultations, digital prescriptions, hospital admissions, and
              secure electronic health records into one seamless platform.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              {authed ? (
                <>
                  <Link
                    href={dashboardHref}
                    className="px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base sm:text-lg shadow-lg shadow-sky-600/25 transition-all text-center active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>Go to Dashboard</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </Link>
                  <Link
                    href="/appointments"
                    className="px-8 py-4 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-base sm:text-lg transition-colors text-center bg-white"
                  >
                    My Appointments
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base sm:text-lg shadow-lg shadow-sky-600/25 transition-all text-center active:scale-[0.99]"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/#services"
                    className="px-8 py-4 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-base sm:text-lg transition-colors text-center bg-white"
                  >
                    Explore Solutions
                  </Link>
                </>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-6 sm:gap-8 text-slate-500 text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-sky-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Designed with NDPA-ready safeguards</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-sky-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Verified Doctors</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-sky-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>24/7 Availability</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-135 aspect-4/5 rounded-[36px] overflow-hidden shadow-2xl border border-slate-100 bg-slate-100 group">
              <Image
                src="/hero-doctors.png"
                alt="Ricton Medical Team"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 540px"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 shadow-xl space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-600">
                  On-Demand Care
                </div>
                <div className="text-base font-extrabold text-slate-900">
                  Instant Specialist Access
                </div>
                <p className="text-xs text-slate-600">
                  Book consultations in under 60 seconds with top licensed consultants.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Platform Stats Bar (platform goals — not audited metrics) */}
      <section aria-label="Platform goals" className="w-full bg-slate-900 text-white py-16">
        <div className="max-w-350 mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="space-y-1 text-center py-2">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">10,000+</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">
                Healthcare provider goal
              </div>
            </div>
            <div className="space-y-1 text-center py-2 md:pl-8">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">99.9%</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">
                Uptime design target
              </div>
            </div>
            <div className="space-y-1 text-center py-2 md:pl-8">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">&lt; 15m</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">
                Target virtual wait time
              </div>
            </div>
            <div className="space-y-1 text-center py-2 md:pl-8">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">250k+</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">
                E-prescription capacity goal
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-slate-500">
            Illustrative platform goals. Verified live metrics will publish with our public status
            page at launch.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        aria-labelledby="services-heading"
        className="w-full bg-white py-24 border-b border-slate-100"
      >
        <div className="max-w-350 mx-auto px-6 sm:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold uppercase tracking-wider">
              Comprehensive Capabilities
            </div>
            <h2
              id="services-heading"
              className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900"
            >
              Our Core Ecosystem
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Integrated digital tools designed for patients, doctors, pharmacists, and medical
              facility administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Consultant Card */}
            <article className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="aspect-4/3 w-full overflow-hidden bg-slate-100 relative">
                <Image
                  src="/consultant-card.png"
                  alt="Consultant Doctor"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-sky-600 text-white text-xs font-bold">
                  Virtual & Telehealth
                </div>
              </div>
              <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Doctor & Consultant Portal</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Conduct high-definition video consultations, write digital e-prescriptions, and
                    manage clinical schedules in real time.
                  </p>
                </div>
                <Link
                  href={authed ? dashboardHref : '/register?role=CONSULTANT'}
                  className="inline-flex items-center gap-2 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors pt-2"
                >
                  <span>{authed ? 'Access Doctor Console' : 'Join as Doctor / Provider'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Link>
              </div>
            </article>

            {/* Hospital Card */}
            <article className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="aspect-4/3 w-full overflow-hidden bg-slate-900 relative">
                <Image
                  src="/hospital-card.jpg"
                  alt="Medical Clinic Hospital"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-bold">
                  Inpatient & Facilities
                </div>
              </div>
              <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Hospital Administration</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Centralized electronic health records (EHR), bed management, clinical staff
                    scheduling, and facility billing.
                  </p>
                </div>
                <Link
                  href={authed ? dashboardHref : '/register?role=HOSPITAL_ADMIN'}
                  className="inline-flex items-center gap-2 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors pt-2"
                >
                  <span>{authed ? 'Access Hospital Dashboard' : 'Register Medical Facility'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Link>
              </div>
            </article>

            {/* Emergency Card */}
            <article className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
              <div className="aspect-4/3 w-full overflow-hidden bg-slate-950 relative">
                <Image
                  src="/emergency-card.png"
                  alt="Emergency Ambulance"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold">
                  24/7 Urgent Response
                </div>
              </div>
              <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">
                    Emergency & Ambulance Triage
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Urgent video triage with a clinician, appointment escalation, and instant visit
                    status notifications.
                  </p>
                </div>
                <Link
                  href={authed ? '/telemedicine' : '/register'}
                  className="inline-flex items-center gap-2 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors pt-2"
                >
                  <span>{authed ? 'Launch Virtual Triage' : 'Access Emergency Protocols'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Full-Width Network Community Banner Section */}
      <section
        id="about-us"
        className="w-full py-20 bg-slate-900 text-white relative overflow-hidden"
      >
        <div className="max-w-350 mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-wider">
              Network Community
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Join our growing network of healthcare professionals
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Ricton bridges the gap between clinicians, pharmacists, and medical facilities to
              streamline workflows, eliminate manual paperwork, and deliver better patient outcomes.
            </p>
            <div className="pt-2">
              <Link
                href={authed ? dashboardHref : '/register'}
                onClick={handleJoin}
                className="inline-block px-8 py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 font-extrabold text-white text-base sm:text-lg transition-all shadow-lg shadow-sky-500/25 active:scale-[0.99]"
              >
                {authed ? 'Open Platform Dashboard' : 'Join as a Partner Provider'}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 aspect-16/10 bg-slate-800">
              <Image
                src="/team-doctors.png"
                alt="Team of healthcare professionals"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance Grid */}
      <section className="w-full py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-350 mx-auto px-6 sm:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
              Engineered for Enterprise Compliance
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Industry-standard security architectures protecting patient health information across
              every interaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-sky-300 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">HIPAA & GDPR-Aligned Encryption</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Bank-level AES-256 encryption at rest and TLS 1.3 in transit protecting all
                electronic health records.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-sky-300 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Pharmacy E-Prescriptions</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Automated fulfillment routing to partner pharmacies with real-time prescription
                tracking and audit trails.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-sky-300 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Wallet & Rewards System</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Secure digital wallet with Paystack payment integration and automated health reward
                points on visits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resources & Health Intelligence Section */}
      <section
        id="resources"
        aria-labelledby="resources-heading"
        className="w-full py-24 bg-slate-50 border-t border-slate-200/80"
      >
        <div className="max-w-350 mx-auto px-6 sm:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold uppercase tracking-wider">
              Health Knowledge & Tools
            </div>
            <h2
              id="resources-heading"
              className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900"
            >
              Resources & Clinical Guidance
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Curated medical intelligence, digital care standards, and clinical guides for patients
              and healthcare practitioners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Clinical Protocols</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Evidence-based digital consultation guidelines, diagnosis criteria, and multi-tier
                medical escalation trees.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.6 15.12a2 2 0 00-1.8.568l-.4.4a2 2 0 000 2.828l.4.4a2 2 0 001.8.568l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.8-.568l.4-.4a2 2 0 000-2.828l-.4-.4z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Drug Formulary & Rx</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Licensed pharmaceutical database, dosage safety verification rules, and automated
                fulfillment tracking.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-3-3v6m-9 1a9 9 0 1118 0 9 9 0 01-18 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Patient Health Library</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Interactive self-care articles, wellness trackers, pre-consultation readiness
                checklists, and medical FAQ guides.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Security Whitepaper</h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                Technical architecture breakdown of HIPAA/GDPR safeguards, cryptographic key
                management, and data sovereignty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Healthcare Pricing Section */}
      <section
        id="pricing"
        aria-labelledby="pricing-heading"
        className="w-full py-24 bg-white border-t border-slate-200/80"
      >
        <div className="max-w-350 mx-auto px-6 sm:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              Transparent & Accessible
            </div>
            <h2
              id="pricing-heading"
              className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900"
            >
              Clear, Predictable Pricing
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              No hidden fees, surprise medical bills, or lock-ins. Quality healthcare designed to be
              accessible for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 1: Patients */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200/80 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  For Patients
                </span>
                <h3 className="text-2xl font-black text-slate-900">Basic Care Access</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">₦0</span>
                  <span className="text-sm font-semibold text-slate-500">/ forever free</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Everything you need to manage your family's daily healthcare journey digitally.
                </p>
                <ul className="space-y-3 text-xs text-slate-700 pt-4 border-t border-slate-200">
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Unlimited electronic medical records storage</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Digital e-prescription dispatch & tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Earn rewards & points on every completed visit</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Secure integrated digital wallet</span>
                  </li>
                </ul>
              </div>
              <Link
                href={authed ? dashboardHref : '/register?role=PATIENT'}
                className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 font-bold text-center text-slate-800 text-xs transition-colors"
              >
                {authed ? 'Access Patient Portal' : 'Sign Up Free'}
              </Link>
            </div>

            {/* Tier 2: Consultations */}
            <div className="bg-gradient-to-b from-sky-600 to-blue-700 text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                Most Popular
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
                  Virtual Care
                </span>
                <h3 className="text-2xl font-black text-white">Specialist Consultation</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">₦5,000</span>
                  <span className="text-sm font-semibold text-sky-200">/ session avg</span>
                </div>
                <p className="text-sky-100 text-xs leading-relaxed">
                  Real-time video session with verified Nigerian and international medical
                  specialists.
                </p>
                <ul className="space-y-3 text-xs text-sky-50 pt-4 border-t border-white/20">
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-white shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Instant HD video & chat consultation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-white shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Instant official digital prescription issuance</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-white shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Comprehensive consultation summary & notes</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-white shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Free follow-up messaging window</span>
                  </li>
                </ul>
              </div>
              <Link
                href={authed ? '/appointments' : '/register'}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 font-bold text-center text-sky-700 text-xs shadow-md transition-colors"
              >
                {authed ? 'Book a Consultation' : 'Get Started Now'}
              </Link>
            </div>

            {/* Tier 3: Hospitals & Clinics */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200/80 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Institutions
                </span>
                <h3 className="text-2xl font-black text-slate-900">Hospital & Enterprise</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">Custom</span>
                  <span className="text-sm font-semibold text-slate-500">/ facility tier</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Enterprise-grade clinical infrastructure, EHR centralization, and ambulance
                  dispatch.
                </p>
                <ul className="space-y-3 text-xs text-slate-700 pt-4 border-t border-slate-200">
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Full hospital bed & ward management</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Multi-doctor scheduling & shift triage</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Automated billing & insurance reconciliation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 text-emerald-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>24/7 dedicated technical account manager</span>
                  </li>
                </ul>
              </div>
              <Link
                href={authed ? dashboardHref : '/register?role=HOSPITAL_ADMIN'}
                className="w-full py-3.5 px-4 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 font-bold text-center text-slate-800 text-xs transition-colors"
              >
                {authed ? 'Open Hospital Console' : 'Contact Enterprise Sales'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Call To Action (CTA) Section */}
      <section className="w-full py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-300 mx-auto px-6 text-center space-y-8">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              {authed
                ? 'Ready to Continue Your Healthcare Journey?'
                : 'Ready to Experience Better Healthcare?'}
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              {authed
                ? 'Your appointments, e-prescriptions, and health records are ready on your personal dashboard.'
                : 'Join thousands of patients, doctors, and healthcare institutions on Ricton today.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            {authed ? (
              <>
                <Link
                  href={dashboardHref}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg shadow-lg shadow-sky-600/25 transition-all text-center active:scale-[0.99]"
                >
                  Go to Dashboard
                </Link>
                <Link
                  href="/appointments"
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-lg bg-white transition-colors text-center shadow-xs"
                >
                  View Appointments
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg shadow-lg shadow-sky-600/25 transition-all text-center active:scale-[0.99]"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-lg bg-white transition-colors text-center shadow-xs"
                >
                  Sign In to Portal
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Full-Width Multi-Column Footer */}
      <footer
        aria-label="Platform Footer"
        className="w-full bg-slate-950 text-slate-400 text-sm pt-16 pb-12 border-t border-slate-800"
      >
        <div className="max-w-350 mx-auto px-6 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-black text-2xl text-sky-500"
            >
              <Image
                src="/logo.svg"
                alt="Ricton Logo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
              <span className="tracking-tight text-white font-extrabold text-xl">Ricton</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Empowering healthcare providers and patients with unified telemedicine, pharmacy
              logistics, and electronic health records.
            </p>
          </div>

          {/* Col 2: Solutions */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-base">Solutions</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#services" className="hover:text-white transition-colors">
                  Virtual Telemedicine
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-white transition-colors">
                  Pharmacy & E-Prescriptions
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-white transition-colors">
                  Hospital EHR Management
                </Link>
              </li>
              <li>
                <Link href="/telemedicine" className="hover:text-white transition-colors">
                  Emergency Dispatch
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-base">Portals</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Patient Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Doctor / Provider Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard/pharmacy" className="hover:text-white transition-colors">
                  Pharmacist Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/hospital" className="hover:text-white transition-colors">
                  Hospital Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Compliance & Legal */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-base">Security & Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="text-slate-400">HIPAA-aligned data safeguards</span>
              </li>
              <li>
                <span className="text-slate-400">GDPR-aware privacy controls</span>
              </li>
              <li>
                <span className="text-slate-400">AES-256 Bit Security</span>
              </li>
              <li>
                <span className="text-slate-400">Independent audit roadmap</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="max-w-350 mx-auto px-6 sm:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>© 2026 Ricton Healthcare Platform. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">
              Privacy Policy
            </span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">
              Terms of Service
            </span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">
              Security Audit
            </span>
          </div>
        </div>
      </footer>

      {/* Accessibility Status Message */}
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}
