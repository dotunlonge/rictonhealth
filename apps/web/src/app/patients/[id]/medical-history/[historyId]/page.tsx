'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ChevronLeft, FileText } from 'lucide-react';

interface MedicalHistoryEntry {
  id?: string;
  condition: string;
  diagnosedAt?: string;
  notes?: string;
}

export default function MedicalHistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string | undefined;
  const historyId = params?.historyId as string | undefined;
  const [entry, setEntry] = useState<MedicalHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadHistory() {
      if (!patientId || historyId === undefined) return;
      setLoading(true);
      setError('');
      const res = await api.get<{
        patientProfile: { medicalHistory?: MedicalHistoryEntry[] | null } | null;
      }>(`/users/patients/${patientId}`);
      if (!res.success || !res.data) {
        setError(res.error?.message || 'Unable to load this medical-history entry.');
        setLoading(false);
        return;
      }

      const medicalHistory = Array.isArray(res.data.patientProfile?.medicalHistory)
        ? res.data.patientProfile.medicalHistory
        : [];
      const found = medicalHistory.find(
        (candidate, index) => (candidate.id || String(index)) === historyId
      );
      setEntry(found || null);
      if (!found) setError('Medical-history entry not found.');
      setLoading(false);
    }
    void loadHistory();
  }, [historyId, patientId]);

  return (
    <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        <button
          type="button"
          onClick={() => patientId && router.push(`/patients/${patientId}`)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1877F2]"
        >
          <ChevronLeft className="w-4 h-4" /> Back to patient record
        </button>

        {loading ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-xs font-bold text-slate-400">
            Loading medical-history entry…
          </div>
        ) : !entry ? (
          <div className="bg-rose-50 rounded-3xl p-8 border border-rose-200 text-xs font-bold text-rose-700">
            {error}
          </div>
        ) : (
          <article className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-[#1877F2]">
                <FileText className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Diagnosed {entry.diagnosedAt ? new Date(entry.diagnosedAt).toLocaleDateString() : 'date not recorded'}
                </p>
                <h1 className="mt-2 text-xl font-extrabold text-slate-900">{entry.condition}</h1>
                <h2 className="mt-8 text-xs font-bold uppercase tracking-wider text-slate-500">Clinical notes</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {entry.notes || 'No clinical notes were recorded for this entry.'}
                </p>
              </div>
            </div>
          </article>
        )}
      </div>
    </SidebarLayout>
  );
}
