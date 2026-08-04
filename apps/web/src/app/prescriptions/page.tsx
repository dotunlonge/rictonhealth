'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const navigationItems = [
  { label: 'Home', href: '/dashboard', icon: '🏠' },
  { label: 'Doctor', href: '/providers', icon: '🩺' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appiontment', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earnings', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Tele-medicine', href: '/telemedicine/demo', icon: '📞' },
  { label: 'Inbox', href: '/inbox', icon: '✉️' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

export default function PrescriptionsPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('E-prescription');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Delivered');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setCurrentUser(userRes.data);
      }

      const res = await api.get('/prescriptions');
      if (res.success && res.data) {
        setPrescriptions(Array.isArray(res.data) ? res.data : res.data.prescriptions || []);
      }
    }
    loadData();
  }, []);

  const adminName = currentUser?.email ? currentUser.email.split('@')[0] : 'Abolaji Dami';

  const handleLogout = () => {
    api.setToken(null);
    api.clearToken();
    router.push('/login');
  };

  return (
    <main className="bg-[#E8EEF9] min-h-screen flex font-sans antialiased text-slate-800">
      {/* Blue Left Sidebar */}
      <aside className="w-60 bg-[#1877F2] text-white flex flex-col justify-between shrink-0 shadow-lg sticky top-0 h-screen z-20">
        <div>
          <div className="px-6 py-6 flex items-center gap-3">
            <img src="/logo.svg" alt="Ricton emblem" className="h-8 w-8 object-contain" />
            <span className="text-2xl font-bold tracking-tight text-white">Ricton</span>
          </div>

          <nav className="px-3 py-2 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setActiveNav(item.label)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  activeNav === item.label
                    ? 'bg-white text-[#1877F2] font-bold shadow-md'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all text-left"
          >
            <span className="text-lg">↪️</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
          <div className="relative w-96">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search for patient, doctor, or appointment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors">
              🔔
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600">
                👤
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 capitalize">{adminName}</p>
                <p className="text-[10px] font-medium text-slate-500">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6">
          {/* Action & Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search for patient"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-200/60 border-none rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-[#1877F2] text-white rounded-full text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="Delivered">Delivered</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Prescriptions Table Card */}
          <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <th className="pb-3 px-3 w-8">
                      <input type="checkbox" className="rounded text-[#1877F2]" />
                    </th>
                    <th className="pb-3 px-4">Patient name</th>
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Medication</th>
                    <th className="pb-3 px-4">Dose</th>
                    <th className="pb-3 px-4">Form</th>
                    <th className="pb-3 px-4">Quantity</th>
                    <th className="pb-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-3">
                        <input type="checkbox" className="rounded text-[#1877F2]" />
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                            👤
                          </div>
                          <span>Helen Olaleye</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <p>06/07/2025</p>
                        <p className="text-[10px] text-slate-400">9:02am</p>
                      </td>
                      <td className="py-4 px-4 text-slate-900">
                        <p className="font-bold">Amoxicillin</p>
                        <p className="text-[10px] text-slate-500">500mg</p>
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        <p>1 Capsule</p>
                        <p className="text-[10px] text-slate-400">Every 12hrs</p>
                      </td>
                      <td className="py-4 px-4 text-slate-600">Capsule</td>
                      <td className="py-4 px-4 text-slate-600">20 Capsules</td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-slate-600 font-bold text-xs">{sortBy}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-end items-center gap-2 pt-6">
              <button className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center hover:bg-slate-300">
                ‹
              </button>
              <button className="w-8 h-8 rounded-full bg-[#1877F2] text-white font-bold text-xs flex items-center justify-center shadow-md">
                ›
              </button>
            </div>
          </section>
        </main>
      </div>
    </main>
  );
}
