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

export default function PrescriptionsPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('E-prescription');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Pending');
  
  // --- Dynamic API State ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  // --- Pane State ---
  const [showAddPane, setShowAddPane] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      const userRes = await api.get('/users/me');
      if (userRes.success && userRes.data) {
        setCurrentUser(userRes.data);
      }

      // Mock Data to match exact UI fields
      const mockPrescriptions = Array.from({ length: 8 }).map((_, idx) => ({
        id: `RX-10${idx}`,
        patientName: idx % 2 === 0 ? 'Helen Olaleye' : 'James Carter',
        date: '2026-08-05',
        time: '09:02am',
        medication: idx % 2 === 0 ? 'Amoxicillin' : 'Paracetamol',
        strength: '500mg',
        dosage: '1 Capsule',
        frequency: 'Every 12hrs',
        form: 'Capsule',
        quantity: '20 Capsules',
        status: idx % 3 === 0 ? 'Delivered' : 'Pending',
        doctor: 'Dr. Smith'
      }));
      setPrescriptions(mockPrescriptions);
    }
    loadData();
  }, []);

  const adminName = currentUser?.email ? currentUser.email.split('@')[0] : 'Admin User';

  const handleLogout = () => {
    api.setToken(null);
    api.clearToken();
    router.push('/login');
  };

  const filteredPrescriptions = prescriptions.filter(p => p.status === sortBy);

  return (
    <main className="bg-[#E8EEF9] min-h-screen flex font-sans antialiased text-slate-800 overflow-hidden relative">
      {/* Blue Left Sidebar */}
      <aside className="w-60 bg-[#1877F2] text-white flex flex-col justify-between shrink-0 shadow-lg sticky top-0 h-screen z-20">
        <div>
          <div className="px-6 py-6 flex items-center gap-3 border-b border-white/10">
            <img src="/logo.svg" alt="Ricton emblem" className="h-8 w-8 object-contain" />
            <span className="text-2xl font-bold tracking-tight text-white">Ricton</span>
          </div>

          <nav className="px-3 py-4 space-y-1">
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
              placeholder="Search for patient, doctor, or prescription..."
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
                <p className="text-[10px] font-medium text-slate-500">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 overflow-y-auto space-y-6 relative z-0">
          {/* Action & Filter Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-80 shadow-sm">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search for patient"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2.5 bg-[#1877F2] text-white rounded-full text-xs font-bold focus:outline-none cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <option value="Delivered">Delivered</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => setShowAddPane(true)}
              className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>+</span> Add E-prescription
            </button>
          </div>

          {/* Prescriptions Table Card */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase tracking-wider">
                    <th className="pb-4 px-3 w-8">
                      <input type="checkbox" className="rounded text-[#1877F2] focus:ring-[#1877F2]" />
                    </th>
                    <th className="pb-4 px-4">Patient name</th>
                    <th className="pb-4 px-4">Date</th>
                    <th className="pb-4 px-4">Medication</th>
                    <th className="pb-4 px-4">Dose</th>
                    <th className="pb-4 px-4">Form</th>
                    <th className="pb-4 px-4">Quantity</th>
                    <th className="pb-4 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-800 font-semibold">
                  {filteredPrescriptions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                        No {sortBy.toLowerCase()} prescriptions found.
                      </td>
                    </tr>
                  ) : (
                    filteredPrescriptions.map((rx) => (
                      <tr 
                        key={rx.id} 
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedPrescription(rx)}
                      >
                        <td className="py-4 px-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded text-[#1877F2] focus:ring-[#1877F2]" />
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-900 group-hover:text-[#1877F2] transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shadow-sm">
                              👤
                            </div>
                            <span>{rx.patientName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          <p className="font-bold text-slate-800">{rx.date}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{rx.time}</p>
                        </td>
                        <td className="py-4 px-4 text-slate-900">
                          <p className="font-bold">{rx.medication}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{rx.strength}</p>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          <p className="font-bold text-slate-800">{rx.dosage}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{rx.frequency}</p>
                        </td>
                        <td className="py-4 px-4 text-slate-600">{rx.form}</td>
                        <td className="py-4 px-4 text-slate-600">{rx.quantity}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            rx.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {rx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
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
                ›
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Slide-over Pane: Issue E-Prescription */}
      {showAddPane && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setShowAddPane(false)} />
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Issue E-Prescription</h2>
              <button onClick={() => setShowAddPane(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Patient</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">🔍</span>
                  <input type="text" placeholder="Search by name or ID" className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Medication Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Drug Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">💊</span>
                      <input type="text" placeholder="e.g. Amoxicillin" className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Dosage Form</label>
                      <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white appearance-none">
                        <option>Capsule</option>
                        <option>Tablet</option>
                        <option>Syrup</option>
                        <option>Injection</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Strength (e.g. 500mg)</label>
                      <input type="text" placeholder="500mg" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Frequency</label>
                      <select className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white appearance-none">
                        <option>Every 12 hrs (BID)</option>
                        <option>Every 8 hrs (TID)</option>
                        <option>Every 24 hrs (QD)</option>
                        <option>As needed (PRN)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Duration</label>
                      <div className="flex items-center gap-2">
                        <input type="number" placeholder="5" className="w-16 h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white text-center" />
                        <span className="text-sm text-slate-600 font-medium">Days</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Total Quantity</label>
                    <input type="text" placeholder="e.g. 10 Capsules" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Instructions for Patient</label>
                    <textarea rows={3} placeholder="e.g. Take after meals..." className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#1877F2] bg-slate-50 focus:bg-white resize-none"></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <button 
                onClick={() => setShowAddPane(false)}
                className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowAddPane(false)}
                className="flex-1 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Issue E-Prescription</span> <span>📤</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Pane: Prescription Details */}
      {selectedPrescription && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPrescription(null)} />
          <div className="relative w-[450px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-[#E8EEF9]">
              <h2 className="text-xl font-bold text-slate-900">Prescription Record</h2>
              <button onClick={() => setSelectedPrescription(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors font-bold">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50">
              {/* Receipt Style Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{selectedPrescription.patientName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedPrescription.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{selectedPrescription.date}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{selectedPrescription.time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Medication</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-xl text-[#1877F2]">💊</div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{selectedPrescription.medication}</p>
                      <p className="text-xs font-semibold text-slate-500">{selectedPrescription.strength} • {selectedPrescription.form}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dosage</p>
                    <p className="text-sm font-bold text-slate-900">{selectedPrescription.dosage}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Frequency</p>
                    <p className="text-sm font-bold text-slate-900">{selectedPrescription.frequency}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Quantity</p>
                    <p className="text-sm font-bold text-slate-900">{selectedPrescription.quantity}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prescribed By</p>
                  <p className="text-sm font-bold text-[#1877F2]">{selectedPrescription.doctor}</p>
                </div>
              </div>

              <div>
                <button className="w-full py-3 px-4 bg-white border border-[#1877F2] text-[#1877F2] font-bold rounded-xl text-sm shadow-sm hover:bg-blue-50 transition-colors text-center flex justify-center items-center gap-2">
                  <span>Download PDF</span>
                  <span>📄</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
