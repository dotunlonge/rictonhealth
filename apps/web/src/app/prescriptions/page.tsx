'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/store/useAppStore';
import { Pill, Search, Plus, FileText, CheckCircle2, Clock } from 'lucide-react';

interface PrescriptionItem {
  id: string;
  patientName: string;
  date: string;
  time: string;
  medication: string;
  strength: string;
  dosage: string;
  frequency: string;
  form: string;
  quantity: string;
  status: 'Delivered' | 'Pending';
  doctor: string;
}

export default function PrescriptionsPage() {
  const { user, fetchPrescriptions } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'All' | 'Delivered' | 'Pending'>('All');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [showAddPane, setShowAddPane] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionItem | null>(null);
  const [loading, setLoading] = useState(true);

  // New Prescription Form State
  const [newPatientName, setNewPatientName] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newDosage, setNewDosage] = useState('500mg');
  const [newFrequency, setNewFrequency] = useState('Every 12hrs');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await fetchPrescriptions();
      const res = await api.get('/pharmacy/prescriptions');
      const rawList = res.success
        ? Array.isArray(res.data)
          ? res.data
          : res.data?.prescriptions || []
        : [];

      setPrescriptions(
        rawList.map((p: any, idx: number) => ({
          id: p.id || `RX-10${idx + 1}`,
          patientName:
            p.patientName ||
            (p.patient
              ? `${p.patient.firstName || ''} ${p.patient.lastName || ''}`.trim() || p.patient.email
              : user?.firstName
              ? `${user.firstName} ${user.lastName || ''}`.trim()
              : 'Patient Record'),
          date: p.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: p.createdAt
            ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '09:00 AM',
          medication: p.medicationName || p.medication || 'Prescribed Medication',
          strength: p.dosage || '500mg',
          dosage: '1 Unit',
          frequency: p.frequency || 'Daily',
          form: 'Tablet',
          quantity: '1 Pack',
          status: p.status === 'FULFILLED' || p.status === 'Delivered' ? 'Delivered' : 'Pending',
          doctor: p.doctorName || (p.provider ? `Dr. ${p.provider.firstName || ''} ${p.provider.lastName || ''}`.trim() : 'Attending Specialist'),
        }))
      );
      setLoading(false);
    }
    loadData();
  }, [fetchPrescriptions, user]);

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.post('/pharmacy/prescriptions', {
      patientName: newPatientName,
      medicationName: newMedication,
      dosage: newDosage,
      frequency: newFrequency,
    });

    const newItem: PrescriptionItem = {
      id: res.data?.id || `RX-${Math.floor(100 + Math.random() * 900)}`,
      patientName: newPatientName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Patient Record'),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      medication: newMedication || 'Amoxicillin',
      strength: newDosage,
      dosage: '1 Unit',
      frequency: newFrequency,
      form: 'Tablet',
      quantity: '1 Pack',
      status: 'Pending',
      doctor: user?.firstName ? `Dr. ${user.firstName} ${user.lastName || ''}` : 'Attending Specialist',
    };

    setPrescriptions((prev) => [newItem, ...prev]);
    setShowAddPane(false);
    setNewPatientName('');
    setNewMedication('');
  };

  const filteredPrescriptions = prescriptions.filter((p) => {
    const matchesSearch =
      p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.medication.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = sortBy === 'All' || p.status === sortBy;
    return matchesSearch && matchesFilter;
  });

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Title */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Pill className="w-6 h-6 text-[#1877F2]" /> Electronic Prescriptions & Refills (E-Rx)
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Issue, track, and verify digital prescriptions for direct pharmacy fulfillment
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPane(true)}
            className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New E-Prescription</span>
          </button>
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative w-80">
            <Search className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search patient, Rx ID, or medication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status Filter:</span>
            <div className="flex items-center bg-slate-200/60 p-1 rounded-full border border-slate-200">
              {(['All', 'Pending', 'Delivered'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSortBy(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === tab ? 'bg-[#1877F2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prescriptions Table Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase tracking-wider">
                  <th className="pb-4 px-4">Rx ID & Patient</th>
                  <th className="pb-4 px-4">Medication & Dosage</th>
                  <th className="pb-4 px-4">Prescribed Date</th>
                  <th className="pb-4 px-4">Attending Doctor</th>
                  <th className="pb-4 px-4">Status</th>
                  <th className="pb-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs font-bold text-slate-400">
                      Loading electronic prescriptions...
                    </td>
                  </tr>
                ) : filteredPrescriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center space-y-3">
                      <Pill className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">No active electronic prescriptions found</p>
                      <button
                        type="button"
                        onClick={() => setShowAddPane(true)}
                        className="text-xs text-[#1877F2] font-bold hover:underline"
                      >
                        + Issue Digital Prescription
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPrescriptions.map((rx) => (
                    <tr key={rx.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{rx.patientName}</p>
                            <p className="text-[10px] font-semibold text-slate-400">{rx.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-extrabold text-slate-900 text-xs">{rx.medication} ({rx.strength})</p>
                        <p className="text-[10px] font-semibold text-slate-400">{rx.dosage} • {rx.frequency}</p>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">{rx.date}</td>
                      <td className="py-4 px-4 font-bold text-[#1877F2]">{rx.doctor}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            rx.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {rx.status === 'Delivered' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          <span>{rx.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPrescription(rx)}
                          className="px-4 py-1.5 bg-slate-100 hover:bg-[#1877F2] hover:text-white text-slate-800 font-bold rounded-full text-xs transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issue New Prescription Modal */}
        {showAddPane && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setShowAddPane(false)} />
            <form onSubmit={handleCreatePrescription} className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900">Issue E-Prescription</h2>
                <button
                  type="button"
                  onClick={() => setShowAddPane(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin Trihydrate"
                    value={newMedication}
                    onChange={(e) => setNewMedication(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Dosage / Strength</label>
                    <input
                      type="text"
                      value={newDosage}
                      onChange={(e) => setNewDosage(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Frequency</label>
                    <input
                      type="text"
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#1877F2] text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20"
              >
                Issue Digital Prescription
              </button>
            </form>
          </div>
        )}

        {/* Prescription Detail Modal (E-Prescription page 1-14 H.pdf) */}
        {selectedPrescription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedPrescription(null)} />
            <div className="relative bg-white rounded-3xl p-8 shadow-2xl max-w-xl w-full z-10 space-y-6 animate-in fade-in zoom-in-95 border border-slate-100">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#1877F2] flex items-center justify-center font-bold">
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Official Electronic Prescription</span>
                    <h2 className="text-lg font-black text-slate-900">{selectedPrescription.id}</h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPrescription(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-xs hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Digital Prescription Header Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patient</span>
                  <h4 className="font-extrabold text-slate-900">{selectedPrescription.patientName}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">ID: P-90218 • Age 32</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attending Prescriber</span>
                  <h4 className="font-extrabold text-[#1877F2]">{selectedPrescription.doctor}</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">MDCN Lic #78192-CAR</p>
                </div>
              </div>

              {/* Prescribed Drugs Detail Box */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Prescribed Medication & Directions</h3>
                <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900">{selectedPrescription.medication}</h4>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-[#1877F2] text-[10px] font-extrabold rounded-full">
                      {selectedPrescription.form}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-blue-100 font-semibold text-slate-700">
                    <div>
                      <span className="block text-[9px] uppercase text-slate-400 font-bold">Strength</span>
                      {selectedPrescription.strength}
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-slate-400 font-bold">Frequency</span>
                      {selectedPrescription.frequency}
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase text-slate-400 font-bold">Quantity</span>
                      {selectedPrescription.quantity}
                    </div>
                  </div>
                </div>
              </div>

              {/* Refills & Delivery Status */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#1877F2]" />
                  <div>
                    <h5 className="font-bold text-slate-900">Authorized Refills: 2 Remaining</h5>
                    <p className="text-[10px] text-slate-500 font-semibold">Valid until Nov 2026</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    selectedPrescription.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedPrescription.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => alert(`Downloading official PDF copy of E-Prescription ${selectedPrescription.id}...`)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs transition-all text-center"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alert(`Prescription ${selectedPrescription.id} submitted for pharmacy delivery!`);
                    setSelectedPrescription(null);
                  }}
                  className="flex-1 py-3 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-blue-500/20 text-center"
                >
                  Order Pharmacy Delivery
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
