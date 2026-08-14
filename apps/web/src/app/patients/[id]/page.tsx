'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Pill,
  Video,
  Clock,
  ChevronLeft,
  Plus,
  CheckCircle2,
  Download,
  Stethoscope,
  MoreVertical,
  Activity,
} from 'lucide-react';

interface PatientDetail {
  id: string;
  name: string;
  badge: string;
  avatarUrl?: string;
  dob: string;
  gender: string;
  email: string;
  serialNumber: string;
  phone: string;
  address: string;
  medicalHistory: { id: string; condition: string; date: string }[];
  prescriptions: { id: string; date: string; medication: string; dose: string; form: string; quantity: string }[];
  appointments: { id: string; date: string; type: string; doctor: string }[];
  telemedicine: { id: string; name: string; day: string }[];
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = (params?.id as string) || 'PT-1001';

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPatientDetail() {
      setLoading(true);
      const res = await api.get(`/users/patients/${patientId}`);
      if (res.success && res.data) {
        const p = res.data;
        setPatient({
          id: p.id || patientId,
          name: `${p.firstName || 'Akala'} ${p.lastName || 'Juwon'}`.trim(),
          badge: 'Premium',
          dob: p.patientProfile?.dateOfBirth || 'January 1, 2025',
          gender: p.patientProfile?.gender || 'Female',
          email: p.email || 'awele@gmail.com',
          serialNumber: `#09${patientId.replace(/[^0-9]/g, '').slice(-2) || '54'}`,
          phone: p.phone || '08128360270',
          address: p.address || '19 Ehi street',
          medicalHistory: [
            { id: 'mh-1', condition: 'Persistent chest pain for 3 days, worsens with exertion', date: '17 July 2025' },
            { id: 'mh-2', condition: 'Severe headache and blurred vision for 2 days', date: '17 July 2025' },
            { id: 'diff-breathing', condition: 'Difficulty breathing at night', date: '17 July 2025' },
            { id: 'mh-4', condition: 'Persistent cough for 3 weeks', date: '17 July 2025' },
            { id: 'mh-5', condition: 'Difficulty urinating', date: '17 July 2025' },
            { id: 'mh-6', condition: 'Severe abdominal pain and vomiting', date: '17 July 2025' },
          ],
          prescriptions: [
            { id: 'rx-1', date: '06/07/2025 9:02am', medication: 'Amoxicillin 500mg', dose: '1 Capsule Every 12hrs', form: 'Capsule', quantity: '20 Capsules' },
            { id: 'rx-2', date: '06/07/2025 9:02am', medication: 'Amoxicillin 500mg', dose: '1 Capsule Every 12hrs', form: 'Capsule', quantity: '20 Capsules' },
            { id: 'rx-3', date: '06/07/2025 9:02am', medication: 'Amoxicillin 500mg', dose: '1 Capsule Every 12hrs', form: 'Capsule', quantity: '20 Capsules' },
          ],
          appointments: [
            { id: 'apt-1', date: '06/07/2025 9:02am', type: 'Follow up', doctor: 'Dr. Oluwaseun Davies' },
            { id: 'apt-2', date: '06/07/2025 9:02am', type: 'Follow up', doctor: 'Dr. Fatima Abubakar' },
            { id: 'apt-3', date: '06/07/2025 9:02am', type: 'Follow up', doctor: 'Dr. Adebayo Ogunlesi' },
          ],
          telemedicine: [
            { id: 'tm-1', name: 'Abee Bee', day: 'Sunday' },
            { id: 'tm-2', name: 'Abee Bee', day: 'Sunday' },
            { id: 'tm-3', name: 'Abee Bee', day: 'Sunday' },
          ],
        });
      } else {
        // High fidelity Patient Page 8 H fallback
        setPatient({
          id: patientId,
          name: 'Akala Juwon',
          badge: 'Premium',
          dob: 'January 1, 2025',
          gender: 'Female',
          email: 'awele@gmail.com',
          serialNumber: '#0954',
          phone: '08128360270',
          address: '19 Ehi street',
          medicalHistory: [
            { id: 'mh-1', condition: 'Persistent chest pain for 3 days, worsens with exertion', date: '17 July 2025' },
            { id: 'mh-2', condition: 'Severe headache and blurred vision for 2 days', date: '17 July 2025' },
            { id: 'diff-breathing', condition: 'Difficulty breathing at night', date: '17 July 2025' },
            { id: 'mh-4', condition: 'Persistent cough for 3 weeks', date: '17 July 2025' },
            { id: 'mh-5', condition: 'Difficulty urinating', date: '17 July 2025' },
            { id: 'mh-6', condition: 'Severe abdominal pain and vomiting', date: '17 July 2025' },
          ],
          prescriptions: [
            { id: 'rx-1', date: '06/07/2025 9:02am', medication: 'Amoxicillin 500mg', dose: '1 Capsule Every 12hrs', form: 'Capsule', quantity: '20 Capsules' },
            { id: 'rx-2', date: '06/07/2025 9:02am', medication: 'Amoxicillin 500mg', dose: '1 Capsule Every 12hrs', form: 'Capsule', quantity: '20 Capsules' },
            { id: 'rx-3', date: '06/07/2025 9:02am', medication: 'Amoxicillin 500mg', dose: '1 Capsule Every 12hrs', form: 'Capsule', quantity: '20 Capsules' },
          ],
          appointments: [
            { id: 'apt-1', date: '06/07/2025 9:02am', type: 'Follow up', doctor: 'Dr. Oluwaseun Davies' },
            { id: 'apt-2', date: '06/07/2025 9:02am', type: 'Follow up', doctor: 'Dr. Fatima Abubakar' },
            { id: 'apt-3', date: '06/07/2025 9:02am', type: 'Follow up', doctor: 'Dr. Adebayo Ogunlesi' },
          ],
          telemedicine: [
            { id: 'tm-1', name: 'Abee Bee', day: 'Sunday' },
            { id: 'tm-2', name: 'Abee Bee', day: 'Sunday' },
            { id: 'tm-3', name: 'Abee Bee', day: 'Sunday' },
          ],
        });
      }
      setLoading(false);
    }
    loadPatientDetail();
  }, [patientId]);

  const triggerAction = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  if (loading || !patient) {
    return (
      <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'ADMIN']}>
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading patient clinical profile...</div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout allowedRoles={['CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN', 'ADMIN']}>
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        {/* Navigation Back Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/patients')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#1877F2] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Patients Directory</span>
          </button>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Patient Profile Header Card (Patient Page 8 H design) */}
        <div className="bg-[#D9E4FF]/60 rounded-3xl p-8 shadow-xs border border-blue-100/60 relative">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Photo Container */}
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md shrink-0 bg-slate-200 flex items-center justify-center">
              {patient.avatarUrl ? (
                <img src={patient.avatarUrl} alt={patient.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1877F2] text-white flex items-center justify-center text-3xl font-black">
                  {patient.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl font-black text-slate-900">{patient.name}</h1>
                <span className="px-3 py-1 bg-white/80 border border-blue-200 text-[#1877F2] font-bold text-[10px] rounded-full uppercase tracking-wider">
                  {patient.badge}
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/telemedicine')}
                  className="px-5 py-1.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs transition-all shadow-xs"
                >
                  Call
                </button>
                <button
                  type="button"
                  onClick={() => triggerAction('MDTs Session Initiated')}
                  className="px-5 py-1.5 bg-white hover:bg-slate-50 border border-blue-200 text-[#1877F2] font-bold rounded-full text-xs transition-all shadow-xs"
                >
                  MDTs
                </button>
              </div>
            </div>

            <button type="button" className="text-slate-500 hover:text-slate-900 p-2">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => triggerAction('Patient Checked In Successfully')}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs transition-all shadow-xs"
            >
              Check in
            </button>
            <button
              type="button"
              onClick={() => triggerAction('Patient Checked Out Successfully')}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs transition-all shadow-xs"
            >
              Check out
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/appointments')}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs transition-all shadow-xs"
            >
              New Appointment
            </button>
            <button
              type="button"
              onClick={() => router.push('/prescriptions')}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-xl text-xs transition-all shadow-xs"
            >
              Add Prescription
            </button>
          </div>
        </div>

        {/* Personal Details Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
            Personal details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-xs font-semibold">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Date of Birth:</span>
              <span className="text-slate-900 font-bold">{patient.dob}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Gender:</span>
              <span className="text-slate-900 font-bold">{patient.gender}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-900 font-bold">{patient.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Serial Number:</span>
              <span className="text-slate-900 font-bold">{patient.serialNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Phone Number:</span>
              <span className="text-slate-900 font-bold">{patient.phone}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Address:</span>
              <span className="text-slate-900 font-bold">{patient.address}</span>
            </div>
          </div>
        </div>

        {/* Medical History Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Medical history</h2>
            <button
              type="button"
              onClick={() => router.push(`/patients/${patient.id}/medical-history/diff-breathing`)}
              className="px-3.5 py-1 bg-[#1877F2] text-white font-bold rounded-full text-[10px] hover:bg-blue-700 transition-all"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-semibold">
            {patient.medicalHistory.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/patients/${patient.id}/medical-history/${item.id}`)}
                className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <span className="text-slate-800 font-bold">{item.condition}</span>
                <span className="text-slate-500">{item.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* E-Prescription Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">E-Prescription</h2>
            <button
              type="button"
              onClick={() => router.push('/prescriptions')}
              className="px-3.5 py-1 bg-[#1877F2] text-white font-bold rounded-full text-[10px] hover:bg-blue-700 transition-all"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-bold">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Medication</th>
                  <th className="pb-3 px-2">Dose</th>
                  <th className="pb-3 px-2">Form</th>
                  <th className="pb-3 px-2">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {patient.prescriptions.map((rx) => (
                  <tr key={rx.id}>
                    <td className="py-3 px-2 text-slate-500">{rx.date}</td>
                    <td className="py-3 px-2 font-bold text-slate-900">{rx.medication}</td>
                    <td className="py-3 px-2">{rx.dose}</td>
                    <td className="py-3 px-2">{rx.form}</td>
                    <td className="py-3 px-2 font-bold text-[#1877F2]">{rx.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Appointment Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Appointment</h2>
            <button
              type="button"
              onClick={() => router.push('/appointments')}
              className="px-3.5 py-1 bg-[#1877F2] text-white font-bold rounded-full text-[10px] hover:bg-blue-700 transition-all"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-bold">
                  <th className="pb-3 px-2">Date</th>
                  <th className="pb-3 px-2">Type</th>
                  <th className="pb-3 px-2">Doctor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {patient.appointments.map((apt) => (
                  <tr key={apt.id}>
                    <td className="py-3 px-2 text-slate-500">{apt.date}</td>
                    <td className="py-3 px-2 font-bold text-slate-900">{apt.type}</td>
                    <td className="py-3 px-2 font-bold text-[#1877F2]">{apt.doctor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Telemedicine Section */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Tele medicine</h2>
            <button
              type="button"
              onClick={() => router.push('/telemedicine')}
              className="px-3.5 py-1 bg-[#1877F2] text-white font-bold rounded-full text-[10px] hover:bg-blue-700 transition-all"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs font-semibold">
            {patient.telemedicine.map((tm) => (
              <div key={tm.id} className="flex items-center justify-between py-3 px-2">
                <span className="text-slate-800 font-bold">{tm.name}</span>
                <span className="text-slate-500">{tm.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
