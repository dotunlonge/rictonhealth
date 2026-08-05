'use client';

import { useState } from 'react';
import Link from 'next/link';

const navigationItems = [
  { label: 'Home', href: '/dashboard/hospital', icon: '🏠' },
  { label: 'Doctor', href: '/providers', icon: '🩺' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appiontment', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earnings', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Tele-medicine', href: '/telemedicine', icon: '📞' },
  { label: 'Inbox', href: '/inbox', icon: '✉️' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

const mockMessages = Array(8).fill({
  sender: 'Neil Patel',
  subject: 'Vomiting, body pain',
  snippet: 'Hi Doctor, kindly send me medication for vomiting...',
  date: '9 July'
});

export default function InboxPage() {
  const [activeNav, setActiveNav] = useState('Inbox');

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1877F2] text-white flex flex-col fixed h-full z-20">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-xl">🩺</span>
          </div>
          <span className="text-2xl font-bold">Ricton</span>
        </div>

        <nav className="flex-1 px-4 mt-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setActiveNav(item.label)}
              className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl transition-colors ${
                activeNav === item.label
                  ? 'bg-white/10 font-semibold'
                  : 'hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-[11px] uppercase tracking-wider">{item.label}</span>
            </Link>
          ))}
          <button className="w-full flex flex-col items-center justify-center py-3 px-2 rounded-xl hover:bg-white/5 opacity-80 hover:opacity-100 transition-colors mt-8">
            <span className="text-2xl mb-1">🚪</span>
            <span className="text-[11px] uppercase tracking-wider">Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 bg-[#E8EBF2] relative overflow-hidden">
        {/* Hexagon pattern overlay using CSS background */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '120px 207.84px'
        }}></div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <header className="px-10 py-6 flex justify-end items-center">
            <div className="flex items-center gap-6 bg-white/50 rounded-full px-6 py-2 border border-slate-200">
              <div className="relative">
                <span className="text-slate-500 text-xl">🔍</span>
              </div>
              <div className="w-64"></div>
            </div>
            
            <div className="flex items-center gap-4 ml-8">
              <div className="relative text-red-500">
                <span className="text-2xl">🔔</span>
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white"></span>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">Abolaji Dami</p>
                  <p className="text-[10px] text-slate-500">Admin</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-300 overflow-hidden">
                  <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 w-full pt-10 pb-20 overflow-y-auto">
            <div className="w-full px-16 max-w-[1400px] mx-auto">
              <div className="bg-transparent">
                {mockMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center py-6 border-b-2 border-slate-400/50 text-slate-900 cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="w-48 font-bold text-lg">
                      {msg.sender}
                    </div>
                    <div className="flex-1 flex gap-2 text-lg">
                      <span className="font-bold">{msg.subject}</span>
                      <span>-</span>
                      <span className="text-slate-600 line-clamp-1">{msg.snippet}</span>
                    </div>
                    <div className="w-32 text-right font-bold text-lg">
                      {msg.date}
                    </div>
                  </div>
                ))}
                <div className="border-b-2 border-slate-400/50"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
