'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  const [message, setMessage] = useState('');

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
      <section aria-labelledby="hero-heading" className="w-full bg-white py-12 sm:py-20 border-b border-slate-100">
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
              Because every patient deserves <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-600 to-blue-700">world-class care.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal max-w-2xl leading-relaxed">
              Ricton unifies virtual consultations, digital prescriptions, hospital admissions, and secure electronic health records into one seamless platform.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
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
            </div>

            {/* Trust Indicators */}
            <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-6 sm:gap-8 text-slate-500 text-xs sm:text-sm font-medium">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Verified Doctors</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                <div className="text-xs font-bold uppercase tracking-wider text-sky-600">On-Demand Care</div>
                <div className="text-base font-extrabold text-slate-900">Instant Specialist Access</div>
                <p className="text-xs text-slate-600">Book consultations in under 60 seconds with top licensed consultants.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Platform Stats Bar */}
      <section className="w-full bg-slate-900 text-white py-16">
        <div className="max-w-350 mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="space-y-1 text-center py-2">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">10,000+</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">Verified Healthcare Providers</div>
            </div>
            <div className="space-y-1 text-center py-2 md:pl-8">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">99.9%</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">Platform Reliability & Uptime</div>
            </div>
            <div className="space-y-1 text-center py-2 md:pl-8">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">&lt; 15m</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">Average Virtual Wait Time</div>
            </div>
            <div className="space-y-1 text-center py-2 md:pl-8">
              <div className="text-3xl sm:text-5xl font-black text-sky-400">250k+</div>
              <div className="text-xs sm:text-sm text-slate-400 font-medium">E-Prescriptions Fulfilled</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" aria-labelledby="services-heading" className="w-full bg-white py-24 border-b border-slate-100">
        <div className="max-w-350 mx-auto px-6 sm:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold uppercase tracking-wider">
              Comprehensive Capabilities
            </div>
            <h2 id="services-heading" className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900">
              Our Core Ecosystem
            </h2>
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              Integrated digital tools designed for patients, doctors, pharmacists, and medical facility administrators.
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
                    Conduct high-definition video consultations, write digital e-prescriptions, and manage clinical schedules in real time.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors pt-2"
                >
                  <span>Learn Provider Features</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
                    Centralized electronic health records (EHR), bed management, clinical staff scheduling, and facility billing.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors pt-2"
                >
                  <span>Explore Hospital EHR</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
                  <h3 className="text-2xl font-bold text-slate-900">Emergency & Ambulance Triage</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Real-time GPS ambulance tracking, urgent dispatch coordination, and instant patient status notifications.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sky-600 font-bold text-sm hover:text-sky-700 transition-colors pt-2"
                >
                  <span>View Emergency Protocols</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Full-Width Network Community Banner Section */}
      <section id="about-us" className="w-full py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-350 mx-auto px-6 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-wider">
              Network Community
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Join 10,000+ Healthcare Professionals
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              Ricton bridges the gap between clinicians, pharmacists, and medical facilities to streamline workflows, eliminate manual paperwork, and deliver better patient outcomes.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                onClick={handleJoin}
                className="inline-block px-8 py-4 rounded-2xl bg-sky-500 hover:bg-sky-600 font-extrabold text-white text-base sm:text-lg transition-all shadow-lg shadow-sky-500/25 active:scale-[0.99]"
              >
                Join as a Partner Provider
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 aspect-16/10 bg-slate-800">
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
              Industry-standard security architectures protecting patient health information across every interaction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-sky-300 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">HIPAA & GDPR Encryption</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Bank-level AES-256 encryption at rest and TLS 1.3 in transit protecting all electronic health records.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-sky-300 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Pharmacy E-Prescriptions</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Automated fulfillment routing to partner pharmacies with real-time prescription tracking and audit trails.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4 hover:border-sky-300 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Wallet & Rewards System</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Secure digital wallet with Paystack payment integration and automated health reward points on visits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Call To Action (CTA) Section */}
      <section className="w-full py-20 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-300 mx-auto px-6 text-center space-y-8">
          <div className="space-y-4 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Ready to Experience Better Healthcare?
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Join thousands of patients, doctors, and healthcare institutions on Ricton today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
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
          </div>
        </div>
      </section>

      {/* Full-Width Multi-Column Footer */}
      <footer id="pricing" aria-label="Platform Footer" className="w-full bg-slate-950 text-slate-400 text-sm pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-350 mx-auto px-6 sm:px-8 grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl text-sky-500">
              <Image src="/logo.svg" alt="Ricton Logo" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="tracking-tight text-white font-extrabold text-xl">Ricton</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              Empowering healthcare providers and patients with unified telemedicine, pharmacy logistics, and electronic health records.
            </p>
          </div>

          {/* Col 2: Solutions */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-base">Solutions</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#services" className="hover:text-white transition-colors">Virtual Telemedicine</Link></li>
              <li><Link href="/#services" className="hover:text-white transition-colors">Pharmacy & E-Prescriptions</Link></li>
              <li><Link href="/#services" className="hover:text-white transition-colors">Hospital EHR Management</Link></li>
              <li><Link href="/#services" className="hover:text-white transition-colors">Emergency Dispatch</Link></li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-base">Portals</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Patient Portal</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Doctor / Provider Portal</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Pharmacist Dashboard</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Hospital Admin Console</Link></li>
            </ul>
          </div>

          {/* Col 4: Compliance & Legal */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-base">Security & Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><span className="text-slate-400">HIPAA Compliant Data Vaults</span></li>
              <li><span className="text-slate-400">GDPR Privacy Encryption</span></li>
              <li><span className="text-slate-400">AES-256 Bit Security</span></li>
              <li><span className="text-slate-400">ISO 27001 Certified</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="max-w-350 mx-auto px-6 sm:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © 2026 Ricton Healthcare Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer transition-colors">Security Audit</span>
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
