'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: '🏠' },
    { label: 'Doctor', href: '/providers', icon: '🩺' },
    { label: 'Patients', href: '/patients', icon: '👥' },
    { label: 'Appointment', href: '/appointments', icon: '📅' },
    { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
    { label: 'Earnings', href: '/wallet', icon: '💳' },
    { label: 'Reward', href: '/rewards', icon: '⭐' },
    { label: 'Tele-medicine', href: '/telemedicine', icon: '📞' },
    { label: 'Pharmacy', href: '/pharmacy', icon: '🛒' },
    { label: 'Inbox', href: '/inbox', icon: '✉️' },
    { label: 'Setting', href: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex bg-[#E8EEF9] font-sans antialiased text-slate-800">
      {/* Blue Sidebar */}
      <aside className="w-60 bg-[#1877F2] text-white flex flex-col justify-between shrink-0 shadow-lg sticky top-0 h-screen z-20">
        <div>
          {/* Brand Header */}
          <div className="px-6 py-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white text-[#1877F2] flex items-center justify-center font-bold text-lg shadow-sm">
              💙
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Ricton</span>
          </div>

          {/* Nav Items */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#1877F2] font-bold shadow-md'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/login"
            className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all"
          >
            <span className="text-lg">↪️</span>
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          {/* Search Input */}
          <div className="relative w-96">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search for patient, doctor, or appointment..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
            />
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors">
              🔔
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600">
                👤
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-slate-900">Abolaji Dami</p>
                <p className="text-[10px] font-medium text-slate-500">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
