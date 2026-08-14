'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/#services' },
    { name: 'Resources', href: '/#resources' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'About us', href: '/#about-us' },
  ];

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-all">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 font-black text-2xl text-sky-600 focus:outline-none"
          aria-label="Ricton Home"
        >
          <img src="/logo.svg" alt="Ricton Logo" className="w-10 h-10 object-contain" />
          <span className="tracking-tight text-slate-900 font-extrabold text-2xl">Ricton</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-base font-semibold text-slate-700 hover:text-sky-600 transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Action Buttons (Login / Register) */}
        <div className="hidden md:flex items-center gap-5">
          <Link
            href="/login"
            className="text-base font-bold text-slate-700 hover:text-sky-600 transition-colors px-2 py-1"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-md shadow-sky-600/20 transition-all active:scale-[0.99] flex items-center gap-1.5"
          >
            <span>Register</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-2xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-all"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden w-full border-t border-slate-100 bg-white px-6 py-6 space-y-4 shadow-xl">
          <nav aria-label="Mobile navigation" className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-4 py-3 rounded-2xl text-base font-semibold text-slate-800 hover:bg-slate-50 hover:text-sky-600 transition-all"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-3.5 px-4 rounded-2xl border border-slate-300 font-bold text-center text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 font-bold text-center text-white shadow-md hover:bg-sky-700 transition-colors"
            >
              Register Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
