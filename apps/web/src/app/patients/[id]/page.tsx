'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ChevronLeft } from 'lucide-react';

interface MedicalHistoryEntry {
  id?: string;
  condition: string;
  diagnosedAt?: string;
  notes?: string;
}

interface PatientDetail {
  id: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  patientProfile: {
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    bloodType?: string | null;
    allergies?: string[] | null;
    medicalHistory?: MedicalHistoryEntry[] | null;
  } | null;
  prescriptionsAsPatient: Array<{
    id: string;
    status: string;
    createdAt: string;
    items: Array<{
      id: string;
      drugName: string;
      dosage: string;
      quantity: number;
      frequency: string;
      duration: string;
    }>;
  }>;
  appointmentsAsPatient: Array<{
    id: string;
    scheduledAt: string;
    type: string;
    status: string;
    provider: {
      id: string;
      providerProfile: {
        firstName: string;
        lastName: string;
        title?: string | null;
      } | null;
    };
  }>;
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : '—';

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string | undefined;
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPatientDetail() {
      if (!patientId) return;
      setLoading(true);
      setError('');
      const res = await api.get<PatientDetail>(`/users/patients/${patientId}`);
      if (res.success && res.data) {
        setPatient(res.data);
      } else {
        setPatient(null);
        setError(res.error?.message || 'Unable to load this patient record.');
      }
      setLoading(false);
    }
    void loadPatientDetail();
  }, [patientId]);

  if (loading) {
    return (
      <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading patient record…</div>
      </SidebarLayout>
    );
  }

  if (!patient) {
    return (
      <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
        <div className="p-8 text-center text-xs font-bold text-rose-600">{error}</div>
      </SidebarLayout>
    );
  }

  const profile = patient.patientProfile;
  const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || patient.email || 'Unnamed patient';
  const medicalHistory = Array.isArray(profile?.medicalHistory) ? profile.medicalHistory : [];

  return (
    <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        <button type="button" onClick={() => router.push('/patients')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1877F2]">
          <ChevronLeft className="w-4 h-4" /> Back to patient directory
        </button>

        <section className="bg-[#D9E4FF]/60 rounded-3xl p-8 border border-blue-100/60">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white bg-[#1877F2] text-white flex items-center justify-center text-3xl font-black">
              {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={name} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{name}</h1>
              <p className="text-xs text-slate-500 mt-1">Patient ID: {patient.id}</p>
              <p className="text-xs text-slate-500">Account status: {patient.status}</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
          <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Personal details</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 text-xs font-semibold mt-3">
            {[
              ['Date of birth', formatDate(profile?.dateOfBirth)],
              ['Gender', profile?.gender || '—'],
              ['Blood type', profile?.bloodType || '—'],
              ['Email', patient.email || '—'],
              ['Phone', patient.phone || '—'],
              ['Allergies', profile?.allergies?.join(', ') || 'None recorded'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3 border-b border-slate-100"><dt className="text-slate-500">{label}</dt><dd className="text-slate-900 font-bold text-right">{value}</dd></div>
            ))}
          </dl>
        </section>

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
          <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Medical history</h2>
          {medicalHistory.length === 0 ? (
            <p className="py-6 text-xs text-slate-500">No medical-history entries have been recorded.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {medicalHistory.map((entry, index) => {
                const entryId = entry.id || String(index);
                return (
                  <button key={entryId} type="button" onClick={() => router.push(`/patients/${patient.id}/medical-history/${encodeURIComponent(entryId)}`)} className="w-full flex items-center justify-between gap-4 py-4 text-left hover:bg-slate-50 px-2 rounded-xl">
                    <span><strong className="block text-slate-900">{entry.condition}</strong><span className="text-slate-500">{entry.notes || 'No notes recorded'}</span></span>
                    <span className="text-slate-500 shrink-0">{formatDate(entry.diagnosedAt)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
          <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Prescriptions</h2>
          {patient.prescriptionsAsPatient.length === 0 ? <p className="py-6 text-xs text-slate-500">No prescriptions found.</p> : patient.prescriptionsAsPatient.map((prescription) => (
            <div key={prescription.id} className="py-4 border-b border-slate-100 last:border-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(prescription.createdAt)} · {prescription.status}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {prescription.items.map((item) => <li key={item.id}><strong>{item.drugName}</strong> — {item.dosage}, {item.frequency} for {item.duration} · Qty {item.quantity}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
          <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">Appointments</h2>
          {patient.appointmentsAsPatient.length === 0 ? <p className="py-6 text-xs text-slate-500">No appointments found.</p> : (
            <div className="divide-y divide-slate-100 text-xs">
              {patient.appointmentsAsPatient.map((appointment) => {
                const provider = appointment.provider.providerProfile;
                const providerName = provider ? `${provider.title || ''} ${provider.firstName} ${provider.lastName}`.trim() : 'Clinician unavailable';
                return <div key={appointment.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 py-4"><span>{new Date(appointment.scheduledAt).toLocaleString()}</span><span>{appointment.type}</span><span>{appointment.status}</span><span className="font-bold text-[#1877F2]">{providerName}</span></div>;
              })}
            </div>
          )}
        </section>
      </div>
    </SidebarLayout>
  );
}
