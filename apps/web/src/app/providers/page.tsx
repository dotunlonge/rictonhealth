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
  { label: 'Tele-medicine', href: '/telemedicine', icon: '📞' },
  { label: 'Inbox', href: '/inbox', icon: '✉️' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

export default function ProvidersPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Doctor');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const res = await api.get('/users/me');
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    }
    loadUser();
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

        {/* Doctor Detail Body */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          {/* Profile Header Card */}
          <section className="bg-[#D9E6FA]/40 rounded-3xl p-8 border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-300 flex items-center justify-center text-4xl">
                👩‍⚕️
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-900">Dr. Tope Olaniyi</h1>
                <p className="text-sm font-semibold text-slate-600">Cardiology • On-duty</p>
                <div className="flex items-center gap-3 pt-2">
                  <button className="px-5 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 hover:bg-slate-50">
                    Call
                  </button>
                  <button className="px-5 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 hover:bg-slate-50">
                    Message
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xl">
                ★ <span className="text-slate-900 font-black">4.5</span>{' '}
                <span className="text-xs text-slate-500 font-medium">Rating</span>
              </div>
              <button className="px-5 py-1.5 bg-white border border-slate-300 rounded-full text-xs font-bold text-slate-800 hover:bg-slate-50">
                Edit
              </button>
            </div>
          </section>

          {/* Shift Hours Card */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/60 rounded-3xl p-6 border border-slate-200/60">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-xl font-bold">
                🕒
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Morning</p>
                <p className="text-xl font-extrabold text-slate-900">9 AM - 3 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-slate-200 pl-8">
              <div>
                <p className="text-xs font-bold text-slate-500">Evening</p>
                <p className="text-xl font-extrabold text-slate-900">7 PM - 11 PM</p>
              </div>
            </div>
          </section>

          {/* Main 2-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Spans: Description, Education, Experience, Reviews */}
            <div className="lg:col-span-2 space-y-8">
              {/* About Info Card */}
              <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
                <div>
                  <h3 className="font-bold text-base text-slate-900 mb-2">Description</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 mb-2">Education</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. MBBS - Cardiology Fellowship.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 mb-2">Experience</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    • Senior Consultant Cardiologist at National Hospital (2018 - Present)<br />
                    • Clinical Specialist in Emergency Cardiovascular Care (2014 - 2018)
                  </p>
                </div>
              </section>

              {/* Patient Reviews Card */}
              <section className="bg-white rounded-3xl p-7 shadow-xs border border-slate-100 space-y-6">
                <h3 className="font-bold text-base text-slate-900">Patients Reviews</h3>

                {[1, 2].map((idx) => (
                  <div key={idx} className="space-y-2 pb-4 border-b border-slate-100 last:border-none last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                        👤
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">Emma Willson</p>
                        <p className="text-amber-400 text-xs">★★★★★</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                  </div>
                ))}
              </section>
            </div>

            {/* Right Column: Today Appointment Widget */}
            <section className="bg-white rounded-3xl p-6 shadow-xs border border-slate-100 space-y-4 self-start">
              <h3 className="font-bold text-sm text-slate-900">Today Appointment</h3>

              <div className="flex items-center justify-between text-xs font-bold text-slate-600 border-b border-slate-100 pb-3">
                <button className="text-slate-400 font-bold">‹</button>
                <span>27 Jul - 02 Aug</span>
                <button className="text-slate-400 font-bold">›</button>
              </div>

              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((slot) => (
                  <div key={slot} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="px-2.5 py-0.5 bg-[#1877F2] text-white rounded-full text-[9px] font-bold">
                      9:00 AM - 10:00 AM
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-xs">
                          👩
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">Emma Wilson</p>
                          <p className="text-[10px] text-slate-400">Vomiting</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-full">
                        Booked
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </main>
  );
}
