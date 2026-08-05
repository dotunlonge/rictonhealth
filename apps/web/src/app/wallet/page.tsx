'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

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

const mockTransactions = [
  { patient: 'Jane Doe', date: 'July 20th', service: 'Video call', status: 'Paid', amount: 50000 },
  { patient: 'Jane Doe', date: 'July 20th', service: 'Video call', status: 'Paid', amount: 50000 },
  { patient: 'Jane Doe', date: 'July 20th', service: 'Video call', status: 'Paid', amount: 50000 },
  { patient: 'Jane Doe', date: 'July 20th', service: 'Video call', status: 'Paid', amount: 50000 },
  { patient: 'Jane Doe', date: 'July 20th', service: 'Video call', status: 'Paid', amount: 50000 },
];

const chartData = [
  { name: 'Mon', value1: 3000, value2: 2000, value3: 4000, value4: 5000, value5: 1000 },
  { name: 'Tue', value1: 2000, value2: 3500, value3: 3000, value4: 2500, value5: 4000 },
  { name: 'Wed', value1: 4500, value2: 1500, value3: 2000, value4: 6000, value5: 3000 },
  { name: 'Thurs', value1: 2500, value2: 4000, value3: 1500, value4: 2000, value5: 5000 },
  { name: 'Fri', value1: 5000, value2: 2500, value3: 3500, value4: 1500, value5: 2000 },
  { name: 'Sat', value1: 3500, value2: 2000, value3: 5000, value4: 4000, value5: 1500 },
  { name: 'Sun', value1: 1500, value2: 4500, value3: 2500, value4: 3000, value5: 2000 },
];

export default function EarningsPage() {
  const [activeNav, setActiveNav] = useState('Earnings');

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

          <div className="flex-1 px-10 max-w-7xl mx-auto w-full pt-6 pb-20 overflow-y-auto">
            {/* Top Cards Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Earnings Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Earnings</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-[#1877F2]">50,0000.00</span>
                  </div>
                </div>
                <button className="bg-[#1877F2] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl self-end mt-8 transition-colors">
                  Withdraw
                </button>
              </div>

              {/* Account Info Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm flex flex-col justify-center">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Account info</h2>
                  <button className="text-slate-400 hover:text-slate-600">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">Guaranty trust bank</h3>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">Abolaji Damilola</h3>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">0123456789</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm mb-8 relative">
                <div className="flex justify-end absolute right-8 top-8 z-10">
                    <div className="bg-slate-100 rounded-lg px-4 py-1 flex items-center gap-2 cursor-pointer">
                        <span className="text-sm font-semibold text-slate-700">Weekly</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                    </div>
                </div>
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                    <Bar dataKey="value1" stackId="a" fill="#1877F2" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="value2" stackId="a" fill="#8B5CF6" />
                    <Bar dataKey="value3" stackId="a" fill="#F59E0B" />
                    <Bar dataKey="value4" stackId="a" fill="#3B82F6" />
                    <Bar dataKey="value5" stackId="a" fill="#64748B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6">Transactions</h2>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-900 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-2">Patient</th>
                      <th className="py-4 px-2 text-center">Date</th>
                      <th className="py-4 px-2 text-center">Service</th>
                      <th className="py-4 px-2 text-center">Status</th>
                      <th className="py-4 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTransactions.map((tx, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0 text-slate-700 font-medium">
                        <td className="py-4 px-2">{tx.patient}</td>
                        <td className="py-4 px-2 text-center">{tx.date}</td>
                        <td className="py-4 px-2 text-center">{tx.service}</td>
                        <td className="py-4 px-2 text-center">
                          <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-xs">
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right text-slate-900 font-bold">{tx.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
