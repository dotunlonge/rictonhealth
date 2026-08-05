'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';

const navigationItems = [
  { label: 'Home', href: '/dashboard', icon: '🏠' },
  { label: 'Doctor', href: '/providers', icon: '🩺' },
  { label: 'Patients', href: '/patients', icon: '👥' },
  { label: 'Appointments', href: '/appointments', icon: '📅' },
  { label: 'E-prescription', href: '/prescriptions', icon: '💊' },
  { label: 'Earnings', href: '/wallet', icon: '💳' },
  { label: 'Reward', href: '/rewards', icon: '⭐' },
  { label: 'Telemedicine', href: '/telemedicine', icon: '📞' },
  { label: 'Inbox', href: '/inbox', icon: '✉️' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function PatientsPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('Patients');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Dynamic API State ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [patientsList, setPatientsList] = useState<any[]>([]);

  // --- Pane State ---
  const [showAddPane, setShowAddPane] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setCurrentUser(userRes.data);
      }
      
      // Mock Data for Patients based on design
      const mockPatients = Array.from({ length: 10 }).map((_, idx) => ({
        id: `PT-${1000 + idx}`,
        name: idx % 2 === 0 ? 'Akala Juwon' : 'Sarah Connor',
        age: 32 + idx,
        gender: idx % 2 === 0 ? 'Male' : 'Female',
        ward: `Ward ${idx % 3 + 1}`,
        bed: `Bed ${idx + 1}`,
        doctor: 'Dr. Smith',
        status: idx % 4 === 0 ? 'Discharged' : 'Admitted',
        dateAdmitted: '2026-08-05',
      }));
      setPatientsList(mockPatients);
    }
    loadData();
  }, []);

  const adminName = currentUser?.email ? currentUser.email.split('@')[0] : 'Admin';

  const handleLogout = () => {
    api.setToken(null);
    api.clearToken();
    router.push('/login');
  };

  return (
    <main className="bg-[#E8EEF9] min-h-screen flex font-sans antialiased text-slate-800 overflow-hidden relative">
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
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 z-10 shadow-sm relative">
          <div className="absolute inset-0 bg-[#E8EEF9] opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1877F2 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }} />
          <div className="relative w-96 z-10">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search for patient, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4 z-10">
            <button className="p-2.5 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 relative transition-colors shadow-sm border border-slate-200">
              🔔
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-slate-300 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 shadow-sm">
                👤
              </div>
              <div className="text-left leading-tight">
                <p className="text-xs font-bold text-slate-900 capitalize">{adminName}</p>
                <p className="text-[10px] font-medium text-slate-500">Hospital Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6 relative z-0">
          {/* Top Actions Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-80 shadow-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search patient list"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-all"
              />
            </div>

            <button 
              onClick={() => setShowAddPane(true)}
              className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>+</span> Admit new patient
            </button>
          </div>

          {/* Patients List Table */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase tracking-wider">
                    <th className="pb-4 px-4">Patient ID</th>
                    <th className="pb-4 px-4">Name</th>
                    <th className="pb-4 px-4">Gender</th>
                    <th className="pb-4 px-4">Ward / Bed</th>
                    <th className="pb-4 px-4">Doctor</th>
                    <th className="pb-4 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-800 font-semibold">
                  {patientsList.map((patient, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedPatient(patient)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4 font-bold text-slate-900 group-hover:text-[#1877F2]">{patient.id}</td>
                      <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                          👤
                        </div>
                        {patient.name}
                      </td>
                      <td className="py-4 px-4 text-slate-500">{patient.gender}</td>
                      <td className="py-4 px-4 text-slate-600">{patient.ward} - {patient.bed}</td>
                      <td className="py-4 px-4 text-slate-600">{patient.doctor}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          patient.status === 'Admitted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-end items-center gap-2 pt-6">
              <button className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center hover:bg-slate-200 transition-colors">
                ‹
              </button>
              <button className="w-8 h-8 rounded-full bg-[#1877F2] text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-500/20">
                1
              </button>
              <button className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center hover:bg-slate-200 transition-colors">
                2
              </button>
              <button className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center hover:bg-slate-200 transition-colors">
                ›
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Slide-over Pane: Add New Patient */}
      {showAddPane && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowAddPane(false)} />
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add New Patient</h2>
              <button onClick={() => setShowAddPane(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name</label>
                  <input type="text" placeholder="John" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Name</label>
                  <input type="text" placeholder="Doe" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Assign ID (Optional)</label>
                <input type="text" placeholder="PT-100X" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Age</label>
                  <input type="number" placeholder="30" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                  <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white appearance-none">
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Religion</label>
                  <input type="text" placeholder="e.g. Christian" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Assign Ward</label>
                <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white appearance-none">
                  <option>General Ward A</option>
                  <option>ICU</option>
                  <option>Private Room</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date Admitted</label>
                  <input type="date" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Time Admitted</label>
                  <input type="time" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Primary Doctor</label>
                <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white appearance-none">
                  <option>Dr. Smith (Cardiology)</option>
                  <option>Dr. Jane (Pediatrics)</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={() => setShowAddPane(false)}
                className="w-full py-3.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Admit Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Pane: Patient Profile */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPatient(null)} />
          <div className="relative w-[500px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            {/* Profile Header */}
            <div className="bg-[#1877F2] text-white p-8 relative pb-16">
              <button onClick={() => setSelectedPatient(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur-md font-bold">✕</button>
              <div className="flex items-center gap-4 mt-2">
                <div className="w-20 h-20 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center text-4xl shadow-inner">
                  👤
                </div>
                <div>
                  <h2 className="text-2xl font-black">{selectedPatient.name}</h2>
                  <p className="text-blue-100 text-sm font-medium opacity-90">{selectedPatient.id}</p>
                </div>
              </div>
            </div>
            
            {/* Tabs & Content */}
            <div className="flex-1 flex flex-col bg-slate-50/50 -mt-8 rounded-t-3xl relative z-10 overflow-hidden">
              <div className="flex border-b border-slate-200 px-6 pt-4 bg-white rounded-t-3xl shadow-sm">
                <button className="px-6 py-4 border-b-2 border-[#1877F2] text-[#1877F2] font-bold text-sm">Consultation</button>
                <button className="px-6 py-4 border-b-2 border-transparent text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Prescriptions</button>
                <button className="px-6 py-4 border-b-2 border-transparent text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">Vitals</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-4">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-y-4 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold mb-1">Age & Gender</p>
                      <p className="font-bold text-slate-800">{selectedPatient.age} Yrs / {selectedPatient.gender}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs font-semibold mb-1">Blood Group</p>
                      <p className="font-bold text-slate-800">O+</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 text-xs font-semibold mb-1">Current Ward / Bed</p>
                      <p className="font-bold text-slate-800">{selectedPatient.ward} — {selectedPatient.bed}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 text-xs font-semibold mb-1">Attending Doctor</p>
                      <p className="font-bold text-[#1877F2]">{selectedPatient.doctor}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Consultations Placeholder */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Recent Consultations</h3>
                    <button className="text-[#1877F2] text-xs font-bold hover:underline">Add Note</button>
                  </div>
                  <div className="space-y-4">
                    <div className="border-l-2 border-[#1877F2] pl-4 py-1">
                      <p className="text-xs font-bold text-slate-400 mb-1">Today, 09:41 AM</p>
                      <p className="text-sm font-medium text-slate-800">Patient reports mild fever and headache. Prescribed Paracetamol.</p>
                      <p className="text-[10px] font-bold text-[#1877F2] mt-2">By Dr. Smith</p>
                    </div>
                    <div className="border-l-2 border-slate-200 pl-4 py-1">
                      <p className="text-xs font-bold text-slate-400 mb-1">Yesterday, 14:20 PM</p>
                      <p className="text-sm text-slate-600">Initial admission and vitals check. Patient stable.</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-2">By Nurse Kelly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
