'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [message, setMessage] = useState('');

  const handleRegister = () => {
    setMessage('Registration is coming soon.');
  };

  const handleLogin = () => {
    setMessage('Login is coming soon.');
  };

  const handleJoin = () => {
    setMessage('Thank you for your interest in joining Ricton.');
  };

  return (
    <main
      id="home"
      className="bg-white overflow-x-hidden w-full min-h-screen relative font-sans antialiased text-slate-900"
    >
      {/* Header Navigation */}
      <header className="max-w-[1400px] mx-auto px-8 py-6 w-full flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-50">
        <Link
          href="#home"
          className="inline-flex items-center gap-2 font-black text-2xl text-[#1c7bcf]"
          aria-label="Ricton home"
        >
          <img
            src="/logo.svg"
            alt="Ricton Logo"
            className="w-10 h-10 object-contain"
          />
          <span className="tracking-tight text-slate-900 font-extrabold text-2xl">Ricton</span>
        </Link>

        {/* Primary Navigation */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-12">
          <Link href="#home" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Home
          </Link>
          <Link href="#services" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Services
          </Link>
          <Link href="#resources" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Resources
          </Link>
          <Link href="#pricing" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            Pricing
          </Link>
          <Link href="#about-us" className="text-base font-semibold text-slate-700 hover:text-[#1c7bcf] transition-colors">
            About us
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            onClick={handleLogin}
            className="text-base font-bold text-slate-700 hover:text-[#1c7bcf] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            onClick={handleRegister}
            className="px-7 py-3 bg-[#1c7bcf] hover:bg-[#1561a7] text-white font-bold text-base rounded-full shadow-lg shadow-[#1c7bcf]/20 transition-all flex items-center gap-2"
          >
            <span>Register</span>
            <span className="text-lg">&gt;</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section aria-labelledby="hero-heading" className="max-w-[1400px] mx-auto px-8 pt-12 pb-24 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <h1
            id="hero-heading"
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]"
          >
            Because
            <br />
            every patient
            <br />
            deserves
            <br />
            world-class
            <br />
            care
          </h1>
        </div>
        <div className="flex justify-end relative">
          <img
            src="/hero-doctors.png"
            alt="Healthcare professionals"
            className="w-full max-w-[620px] object-contain"
          />
        </div>
      </section>

      {/* Team Banner Image */}
      <section id="about-us" aria-label="Healthcare team" className="w-full relative">
        <img
          src="/team-doctors.jpg"
          alt="Team of healthcare professionals"
          className="w-full h-auto max-h-[850px] object-cover object-top"
        />
      </section>

      {/* Blue Section Container */}
      <div className="w-full bg-[#1c7bcf] relative">
        {/* Curved Nurses Card overlapping the blue banner */}
        <div className="max-w-[1400px] mx-auto px-8 relative -top-24 md:-top-40 z-20">
          <img
            src="/join-nurses.png"
            alt="Group of smiling nurses"
            className="w-full max-w-6xl mx-auto object-contain rounded-[50px] shadow-2xl"
          />
        </div>

        {/* Join Community Section */}
        <section
          id="resources"
          aria-labelledby="community-heading"
          className="max-w-5xl mx-auto px-6 pt-4 pb-24 text-white text-center space-y-10"
        >
          <div className="space-y-2">
            <h2
              id="community-heading"
              className="text-3xl md:text-5xl font-light tracking-tight"
            >
              Join 10,000+ healthcare professionals
            </h2>
            <p className="text-3xl md:text-5xl font-light tracking-tight">
              delivering faster, safer care
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleJoin}
              className="px-14 py-4 rounded-full bg-white font-bold text-[#1c7bcf] text-2xl hover:bg-slate-100 transition-all shadow-xl"
            >
              Join
            </button>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" aria-labelledby="services-heading" className="max-w-[1400px] mx-auto px-8 pb-32 text-white text-center space-y-16">
          <div className="max-w-4xl mx-auto space-y-4">
            <h2
              id="services-heading"
              className="text-5xl md:text-7xl font-bold tracking-tight"
            >
              Our Services
            </h2>
            <p className="text-2xl md:text-3xl font-light leading-relaxed opacity-95">
              World class care for everyone. Our health system offers unmatched, expert health care.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-stretch">
            {/* Consultant Card */}
            <article className="space-y-6 flex flex-col items-center">
              <div className="rounded-[40px] overflow-hidden shadow-2xl bg-white w-full h-[580px]">
                <img
                  src="/consultant-card.png"
                  alt="Consultant Doctor"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <h3 className="text-4xl font-bold">Consultant</h3>
            </article>

            {/* Hospital Card */}
            <article className="space-y-6 flex flex-col items-center">
              <div className="rounded-[40px] overflow-hidden shadow-2xl bg-slate-900 w-full h-[580px]">
                <img
                  src="/hospital-card.png"
                  alt="Medical Clinic Hospital"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <h3 className="text-4xl font-bold">Hospital</h3>
            </article>

            {/* Emergency Card */}
            <article className="space-y-6 flex flex-col items-center">
              <div className="rounded-[40px] overflow-hidden shadow-2xl bg-slate-950 w-full h-[580px]">
                <img
                  src="/emergency-card.png"
                  alt="Emergency Ambulance"
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-4xl font-bold">Emergency</h3>
            </article>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer id="pricing" aria-label="Pricing" className="w-full bg-slate-950 py-8 text-center text-slate-400 text-sm">
        © 2026 Ricton Healthcare Platform. All rights reserved.
      </footer>

      {/* Accessibility Status Message */}
      <div className="sr-only" role="status" aria-live="polite">
        {message}
      </div>
    </main>
  );
}
