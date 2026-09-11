'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { Search, User, Users } from 'lucide-react';

interface PatientRecord {
  id: string;
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  status: string;
  latestProvider: string | null;
  latestAppointment: {
    id: string;
    scheduledAt: string;
    status: string;
    type: string;
  } | null;
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      const res = await api.get<{ patients: PatientRecord[] }>('/users/patients');
      if (res.success && Array.isArray(res.data?.patients)) {
        setPatients(res.data.patients);
      } else {
        setPatients([]);
        setError(res.error?.message || 'Unable to load the patient directory.');
      }
      setLoading(false);
    }
    void loadData();
  }, []);

  const displayName = (patient: PatientRecord) =>
    patient.name ||
    `${patient.firstName || ''} ${patient.lastName || ''}`.trim() ||
    patient.email ||
    'Unnamed patient';

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) =>
      [displayName(patient), patient.id, patient.email, patient.phone, patient.latestProvider]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [patients, searchQuery]);

  return (
    <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-[#1877F2]" /> Patient Directory
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Patients with an authorized clinical relationship to your account.
            </p>
          </div>
          <div className="relative w-72">
            <Search className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4" />
            <input
              type="search"
              placeholder="Search patient, email, or clinician"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] shadow-xs"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-bold uppercase tracking-wider">
                  <th className="pb-4 px-4">Patient</th>
                  <th className="pb-4 px-4">Age / Gender</th>
                  <th className="pb-4 px-4">Contact</th>
                  <th className="pb-4 px-4">Latest Clinician</th>
                  <th className="pb-4 px-4">Latest Appointment</th>
                  <th className="pb-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center font-bold text-slate-400">
                      Loading patient directory…
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center font-bold text-slate-400">
                      No matching patient records found.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1877F2] flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{displayName(patient)}</p>
                            <p className="text-[10px] text-slate-400">{patient.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {patient.age ?? '—'} / {patient.gender || '—'}
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        <p>{patient.email || '—'}</p>
                        <p>{patient.phone || '—'}</p>
                      </td>
                      <td className="py-4 px-4 font-bold text-[#1877F2]">
                        {patient.latestProvider || '—'}
                      </td>
                      <td className="py-4 px-4 text-slate-700">
                        {patient.latestAppointment ? (
                          <>
                            <p className="font-bold">
                              {new Date(patient.latestAppointment.scheduledAt).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {patient.latestAppointment.type} · {patient.latestAppointment.status}
                            </p>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => router.push(`/patients/${patient.id}`)}
                          className="px-4 py-1.5 bg-slate-100 hover:bg-[#1877F2] hover:text-white text-slate-800 font-bold rounded-full transition-all"
                        >
                          View record
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
