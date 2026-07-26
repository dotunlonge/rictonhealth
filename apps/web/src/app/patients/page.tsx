'use client';

import SidebarLayout from '@/components/layout/SidebarLayout';

export default function PatientsPage() {
  const patientRows = Array.from({ length: 10 }).map((_, i) => ({
    id: `#284${i}`,
    name: 'Akala Juwon',
    ward: 'ICU-3',
    doctor: 'Dr. Smith',
  }));

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Top Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search for patient..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <button className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md transition-colors flex items-center gap-2">
            <span>+</span> Admit new patient
          </button>
        </div>

        {/* Patients Table Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-4">ID</th>
                  <th className="pb-3 px-4">Name</th>
                  <th className="pb-3 px-4">Ward</th>
                  <th className="pb-3 px-4">Attending Doctor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {patientRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900">{row.id}</td>
                    <td className="py-4 px-4 font-bold text-slate-900">{row.name}</td>
                    <td className="py-4 px-4 text-slate-600">{row.ward}</td>
                    <td className="py-4 px-4 text-slate-600">{row.doctor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
