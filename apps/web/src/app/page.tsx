'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('Home');

  const navigationItems = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/#about' },
    { name: 'Services', href: '/#services' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'Resources', href: '/#resources' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans antialiased flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="max-w-7xl mx-auto px-6 py-6 w-full flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-md z-50 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-teal-500/30">
            💙
          </div>
          <span className="text-2xl font-black tracking-tight text-white">Ricton</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setActiveTab(item.name)}
              className={`transition-colors ${
                activeTab === item.name ? 'text-teal-400 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2.5 text-xs font-bold text-slate-200 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white rounded-full shadow-lg shadow-teal-500/30 transition-all"
          >
            Register
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-16 w-full space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-950/80 border border-teal-800 text-teal-400 text-xs font-extrabold uppercase tracking-wider">
              ✨ Next-Gen Digital Healthcare
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
              Because every patient deserves world-class care
            </h1>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
              Empowering service providers and patients with streamlined appointment scheduling, digital e-prescriptions, instant telemedicine calls, and secure wallet settlements.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/register"
                className="px-8 py-4 bg-teal-500 hover:bg-teal-400 text-white font-black rounded-full shadow-xl shadow-teal-950 transition-all text-xs uppercase tracking-wider"
              >
                Start Consultation →
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-full border border-slate-700 transition-all text-xs uppercase tracking-wider"
              >
                Doctor / Hospital Portal
              </Link>
            </div>
          </div>

          {/* Hero Banner Grid */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-br from-slate-800 via-teal-950/40 to-slate-900 border border-slate-800/80 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-6">
              <div>
                <p className="text-xs font-bold text-teal-400 uppercase tracking-wider">Join 10,000+ Professionals</p>
                <h3 className="text-xl font-black text-white mt-1">Delivering faster, safer care</h3>
              </div>
              <span className="px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-bold">
                Trusted by 500+ Clinics
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <span className="text-2xl">🩺</span>
                <p className="text-xs font-bold text-slate-200 mt-2">Consultant</p>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <span className="text-2xl">🏥</span>
                <p className="text-xs font-bold text-slate-200 mt-2">Hospital</p>
              </div>
              <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
                <span className="text-2xl">🚑</span>
                <p className="text-xs font-bold text-slate-200 mt-2">Emergency</p>
              </div>
            </div>
          </div>
        </div>

        {/* Our Services Section */}
        <div id="services" className="space-y-8 pt-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-white">Our Services</h2>
            <p className="text-sm text-slate-400">
              World-class care for everyone. Our health system offers unmatched, expert health care across specialties.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Consultant', icon: '🩺', desc: 'Direct access to certified specialist doctors.' },
              { title: 'Hospital', icon: '🏥', desc: 'Integrated hospital admission & ward tracking.' },
              { title: 'Emergency', icon: '🚑', desc: '24/7 urgent medical response & dispatch.' },
              { title: 'Tele-medicine', icon: '📞', desc: 'Encrypted HD video consultation calls.' },
              { title: 'E-prescription', icon: '💊', desc: 'Digitally signed prescription records.' },
              { title: 'Pharmacy Store', icon: '🛒', desc: 'Doorstep medication order fulfillment.' },
            ].map((service, idx) => (
              <div
                key={idx}
                className="p-6 bg-slate-800/60 rounded-3xl border border-slate-700/60 hover:border-teal-500/50 transition-all space-y-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center text-2xl font-bold group-hover:scale-110 transition-transform">
                  {service.icon}
                </div>
                <h3 className="font-extrabold text-base text-white">{service.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        © 2026 Ricton Healthcare Platform. All rights reserved.
      </footer>
    </div>
  );
}
