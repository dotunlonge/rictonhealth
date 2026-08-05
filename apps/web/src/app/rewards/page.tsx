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

const mockGifts = [
  { name: 'The Place', points: 750, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800' },
  { name: 'Bukka Hut', points: 750, image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800' },
  { name: 'Chicken Republic', points: 500, image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=800' },
  { name: 'Cold Stone Creamery', points: 1000, image: 'https://images.unsplash.com/photo-1559703248-dcaaec9fab78?auto=format&fit=crop&q=80&w=800' },
];

export default function RewardsPage() {
  const [activeNav, setActiveNav] = useState('Reward');

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
      <main className="ml-64 flex-1 bg-gradient-to-br from-[#E3EDFE] to-[#F1F5FD] relative overflow-hidden">
        {/* Hexagon pattern overlay using CSS background */}
        <div className="absolute inset-0 z-0 opacity-40" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '120px 207.84px'
        }}></div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <header className="px-10 py-6 flex justify-end items-center">
            <div className="flex items-center gap-6 bg-slate-200/50 rounded-full px-6 py-2">
              <div className="relative">
                <span className="text-slate-600 text-xl">🔍</span>
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

          <div className="flex-1 px-10 max-w-5xl mx-auto w-full pt-16 pb-20 overflow-y-auto">
            {/* Balance Section */}
            <div className="text-center mb-16">
              <h1 className="text-2xl font-bold text-slate-900 mb-6">Your Current Balance</h1>
              <div className="flex items-baseline justify-center gap-2 mb-10">
                <span className="text-7xl font-bold text-slate-900">750</span>
                <span className="text-3xl font-medium text-slate-800">pts</span>
              </div>
              <p className="text-slate-700 text-lg max-w-3xl mx-auto leading-relaxed">
                Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo
                ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis
                dis parturient montes, nascetur ridiculus mus.
              </p>
            </div>

            {/* Browse Gifts Section */}
            <div className="mb-12">
              <div className="border-b border-slate-300 pb-2 relative">
                <h2 className="text-2xl font-bold text-slate-900 ml-10">Browse Gifts</h2>
                <div className="absolute -bottom-px left-0 w-64 h-1 bg-[#1877F2]"></div>
              </div>
            </div>

            {/* Gifts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {mockGifts.map((gift, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="bg-white rounded-3xl overflow-hidden shadow-sm h-64 mb-4 border-2 border-transparent group-hover:border-[#1877F2] transition-colors relative flex items-center justify-center">
                    <img src={gift.image} alt={gift.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    {/* Mock placeholder logo using text if no real brand logo */}
                    <div className="relative z-10 bg-[#C41E3A] text-[#F5C71A] px-10 py-4 rounded-[3rem] shadow-lg transform rotate-[-5deg]">
                        <span className="text-3xl font-serif italic font-bold tracking-tighter">{gift.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-xl font-medium text-slate-700">{gift.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-slate-900 text-lg">{gift.points}</span>
                      <span className="text-xs text-slate-600 font-medium">pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
