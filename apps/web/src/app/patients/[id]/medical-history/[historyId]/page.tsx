'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Download, FileText } from 'lucide-react';

export default function MedicalHistoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = (params?.id as string) || 'PT-1001';
  const historyId = (params?.historyId as string) || 'diff-breathing';

  const [title, setTitle] = useState('Difficulty breathing at night - 17 July 2025');

  useEffect(() => {
    if (historyId === 'mh-1') {
      setTitle('Persistent chest pain for 3 days, worsens with exertion - 17 July 2025');
    } else if (historyId === 'mh-2') {
      setTitle('Severe headache and blurred vision for 2 days - 17 July 2025');
    }
  }, [historyId]);

  const handleDownload = (filename: string) => {
    alert(`Downloading medical report attachment: ${filename}`);
  };

  return (
    <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'ADMIN']}>
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        {/* Back to Profile Link (Patient Page 9 H style) */}
        <div>
          <button
            type="button"
            onClick={() => router.push(`/patients/${patientId}`)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1877F2] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>

        {/* Condition Title */}
        <div className="border-b border-slate-300/80 pb-4">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        </div>

        {/* Attachments Section (Patient Page 9 H design) */}
        <div className="space-y-6">
          <h2 className="font-extrabold text-base text-slate-900">Attachments</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Attachment Card 1 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm flex flex-col items-center justify-between min-h-[220px] relative group hover:border-[#1877F2]/50 transition-all">
              <div className="my-auto text-red-500">
                <FileText className="w-16 h-16 stroke-[1.5]" />
              </div>
              <button
                type="button"
                onClick={() => handleDownload('Pulmonary_Function_Test.pdf')}
                className="w-full flex items-center justify-end text-slate-800 hover:text-[#1877F2] transition-colors"
              >
                <Download className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Attachment Card 2 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm flex flex-col items-center justify-between min-h-[220px] relative group hover:border-[#1877F2]/50 transition-all">
              <div className="my-auto text-slate-300">
                <FileText className="w-16 h-16 stroke-[1.5]" />
              </div>
              <button
                type="button"
                onClick={() => handleDownload('Chest_XRay_Report.pdf')}
                className="w-full flex items-center justify-end text-slate-800 hover:text-[#1877F2] transition-colors"
              >
                <Download className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Attachment Card 3 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm flex flex-col items-center justify-between min-h-[220px] relative group hover:border-[#1877F2]/50 transition-all">
              <div className="my-auto text-red-500">
                <FileText className="w-16 h-16 stroke-[1.5]" />
              </div>
              <button
                type="button"
                onClick={() => handleDownload('Blood_Gas_Analysis.pdf')}
                className="w-full flex items-center justify-end text-slate-800 hover:text-[#1877F2] transition-colors"
              >
                <Download className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
