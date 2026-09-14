'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/store/useAppStore';
import { CheckCircle2, Clock, FileText, Pill, Plus, Search } from 'lucide-react';

type PrescriptionStatus = 'DRAFT' | 'SIGNED' | 'SENT_TO_PHARMACY' | 'DISPENSED' | 'CANCELLED';

type PrescriptionLine = {
  id: string;
  drugName: string;
  dosage: string;
  quantity: number;
  frequency: string;
  duration: string;
  instructions: string | null;
};

type RelatedUser = {
  email?: string | null;
  patientProfile?: { firstName?: string; lastName?: string } | null;
  providerProfile?: { firstName?: string; lastName?: string } | null;
};

type Prescription = {
  id: string;
  patientId: string;
  providerId: string;
  pharmacyId: string | null;
  status: PrescriptionStatus;
  signedAt: string | null;
  createdAt: string;
  notes: string | null;
  items: PrescriptionLine[];
  patient?: RelatedUser;
  provider?: RelatedUser;
};

type Pharmacy = {
  id: string;
  pharmacyProfile: { pharmacyName: string; address: string } | null;
};

const STATUSES: Array<'ALL' | PrescriptionStatus> = [
  'ALL',
  'DRAFT',
  'SIGNED',
  'SENT_TO_PHARMACY',
  'DISPENSED',
  'CANCELLED',
];

function personName(user: RelatedUser | undefined, kind: 'patient' | 'provider') {
  const profile = kind === 'patient' ? user?.patientProfile : user?.providerProfile;
  const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  if (name) return kind === 'provider' ? `Dr. ${name}` : name;
  return user?.email || '—';
}

export default function PrescriptionsPage() {
  const { user, prescriptions: storePrescriptions } = useAppStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const raw = storePrescriptions || [];
    return raw.map((r: any) => ({
      id: r.id,
      patientId: r.patientId || '',
      providerId: r.providerId || '',
      pharmacyId: r.pharmacyId || null,
      status: (r.status?.toUpperCase() || 'DRAFT') as PrescriptionStatus,
      signedAt: r.signedAt || null,
      createdAt: r.date || new Date().toISOString(),
      notes: r.notes || null,
      items: [
        {
          id: `${r.id}-item-1`,
          drugName: r.medication || 'Medication',
          dosage: r.dosage || '',
          quantity: r.quantity || 1,
          frequency: r.frequency || '',
          duration: '',
          instructions: null,
        },
      ],
      patient: {
        patientProfile: {
          firstName: r.patientName?.split(' ')[0],
          lastName: r.patientName?.split(' ')[1],
        },
      },
      provider: { providerProfile: { firstName: r.doctor } },
    }));
  });
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Record<string, string>>({});
  const [otpCodes, setOtpCodes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | PrescriptionStatus>('ALL');
  const [loading, setLoading] = useState(() => !(storePrescriptions && storePrescriptions.length > 0));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [prescriptionResult, pharmacyResult] = await Promise.all([
      api.get<Prescription[]>('/prescriptions'),
      api.get<Pharmacy[]>('/pharmacy/pharmacies'),
    ]);
    setPrescriptions(
      prescriptionResult.success && Array.isArray(prescriptionResult.data)
        ? prescriptionResult.data
        : []
    );
    setPharmacies(
      pharmacyResult.success && Array.isArray(pharmacyResult.data) ? pharmacyResult.data : []
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return prescriptions.filter((prescription) => {
      if (status !== 'ALL' && prescription.status !== status) return false;
      if (!query) return true;
      return (
        prescription.id.toLowerCase().includes(query) ||
        personName(prescription.patient, 'patient').toLowerCase().includes(query) ||
        prescription.items.some((item) => item.drugName.toLowerCase().includes(query))
      );
    });
  }, [prescriptions, search, status]);

  const finishAction = async (result: Awaited<ReturnType<typeof api.post>>, success: string) => {
    setBusyId(null);
    if (!result.success) {
      setMessage({
        error: true,
        text: result.error?.message || 'The request could not be completed.',
      });
      return;
    }
    setMessage({ error: false, text: success });
    await loadData();
  };

  const requestSigningCode = async (prescription: Prescription) => {
    if (!user?.email && !user?.phone) {
      setMessage({
        error: true,
        text: 'Your account has no verified delivery channel for a signing code.',
      });
      return;
    }
    setBusyId(prescription.id);
    const destination = user.email ? { email: user.email } : { phone: user.phone };
    const result = await api.post('/auth/otp/send', destination);
    setBusyId(null);
    setMessage({
      error: !result.success,
      text: result.success
        ? 'Signing code sent.'
        : result.error?.message || 'Unable to send a signing code.',
    });
  };

  const signPrescription = async (prescription: Prescription) => {
    const otpCode = otpCodes[prescription.id]?.trim();
    if (!otpCode) {
      setMessage({ error: true, text: 'Enter the six-digit signing code.' });
      return;
    }
    setBusyId(prescription.id);
    const result = await api.post(`/prescriptions/${prescription.id}/sign`, { otpCode });
    await finishAction(result, 'Prescription signed.');
  };

  const sendToPharmacy = async (prescription: Prescription) => {
    const pharmacyId = selectedPharmacy[prescription.id];
    if (!pharmacyId) {
      setMessage({ error: true, text: 'Choose a pharmacy first.' });
      return;
    }
    setBusyId(prescription.id);
    const result = await api.patch(`/prescriptions/${prescription.id}/send-to-pharmacy`, {
      pharmacyId,
    });
    await finishAction(result, 'Prescription sent to the selected pharmacy.');
  };

  const fulfillPrescription = async (prescription: Prescription) => {
    setBusyId(prescription.id);
    const result = await api.post('/pharmacy/prescriptions/fulfill', {
      prescriptionId: prescription.id,
      deliveryType: 'PICKUP',
    });
    await finishAction(result, 'Prescription fulfilled and a priced pickup order was created.');
  };

  const createPrescription = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    const lookup = await api.get<{ patients: Array<{ id: string }> }>(
      `/users/patients?search=${encodeURIComponent(patientSearch.trim())}&limit=5`
    );
    const patientId = lookup.success ? lookup.data?.patients?.[0]?.id : undefined;
    if (!patientId) {
      setCreating(false);
      setMessage({ error: true, text: 'No matching patient was found.' });
      return;
    }

    const result = await api.post('/prescriptions', {
      patientId,
      items: [
        {
          drugName: drugName.trim(),
          dosage: dosage.trim(),
          quantity: Number(quantity),
          frequency: frequency.trim(),
          duration: duration.trim(),
        },
      ],
    });
    setCreating(false);
    if (!result.success) {
      setMessage({ error: true, text: result.error?.message || 'Unable to create prescription.' });
      return;
    }
    setShowCreate(false);
    setPatientSearch('');
    setDrugName('');
    setDosage('');
    setQuantity('1');
    setFrequency('');
    setDuration('');
    setMessage({ error: false, text: 'Draft prescription created.' });
    await loadData();
  };

  return (
    <SidebarLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
              <Pill className="h-6 w-6 text-[#1877F2]" /> Electronic prescriptions
            </h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Live prescription status, assignment, and fulfillment
            </p>
          </div>
          {user?.role === 'CONSULTANT' && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-full bg-[#1877F2] px-5 py-2.5 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" /> Issue prescription
            </button>
          )}
        </div>

        {message && (
          <div
            className={`rounded-xl border p-3 text-xs font-bold ${message.error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search prescription, patient, or medication"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 uppercase tracking-wide text-slate-400">
                <th className="px-3 pb-4">Prescription</th>
                <th className="px-3 pb-4">Medication</th>
                <th className="px-3 pb-4">Created</th>
                <th className="px-3 pb-4">Status</th>
                <th className="px-3 pb-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Loading prescriptions…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No prescriptions match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((prescription) => (
                  <tr key={prescription.id} className="align-top">
                    <td className="px-3 py-4">
                      <div className="flex gap-2">
                        <FileText className="h-4 w-4 text-[#1877F2]" />
                        <div>
                          <p className="font-bold text-slate-900">
                            {personName(prescription.patient, 'patient')}
                          </p>
                          <p className="mt-1 max-w-48 truncate text-[10px] text-slate-400">
                            {prescription.id}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-500">
                            {personName(prescription.provider, 'provider')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      {prescription.items.map((item) => (
                        <div key={item.id} className="mb-2">
                          <p className="font-bold text-slate-900">
                            {item.drugName} · {item.dosage}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {item.quantity} · {item.frequency} · {item.duration}
                          </p>
                          {item.instructions && (
                            <p className="text-[10px] text-slate-400">{item.instructions}</p>
                          )}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-4 text-slate-600">
                      {new Date(prescription.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${prescription.status === 'DISPENSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                      >
                        {prescription.status === 'DISPENSED' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {prescription.status.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {user?.role === 'CONSULTANT' && prescription.status === 'DRAFT' && (
                        <div className="space-y-2">
                          <input
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCodes[prescription.id] || ''}
                            onChange={(event) =>
                              setOtpCodes((current) => ({
                                ...current,
                                [prescription.id]: event.target.value,
                              }))
                            }
                            placeholder="6-digit code"
                            className="w-32 rounded-lg border border-slate-200 px-3 py-2"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === prescription.id}
                              onClick={() => requestSigningCode(prescription)}
                              className="rounded-lg border border-blue-200 px-3 py-2 font-bold text-[#1877F2] disabled:opacity-50"
                            >
                              Send code
                            </button>
                            <button
                              type="button"
                              disabled={busyId === prescription.id}
                              onClick={() => signPrescription(prescription)}
                              className="rounded-lg bg-[#1877F2] px-3 py-2 font-bold text-white disabled:opacity-50"
                            >
                              Sign
                            </button>
                          </div>
                        </div>
                      )}
                      {user?.role === 'PATIENT' && prescription.status === 'SIGNED' && (
                        <div className="space-y-2">
                          <select
                            value={selectedPharmacy[prescription.id] || ''}
                            onChange={(event) =>
                              setSelectedPharmacy((current) => ({
                                ...current,
                                [prescription.id]: event.target.value,
                              }))
                            }
                            className="w-48 rounded-lg border border-slate-200 px-2 py-2"
                          >
                            <option value="">Choose pharmacy</option>
                            {pharmacies.map((pharmacy) => (
                              <option key={pharmacy.id} value={pharmacy.id}>
                                {pharmacy.pharmacyProfile?.pharmacyName || pharmacy.id}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busyId === prescription.id}
                            onClick={() => sendToPharmacy(prescription)}
                            className="block rounded-lg bg-[#1877F2] px-3 py-2 font-bold text-white disabled:opacity-50"
                          >
                            Send to pharmacy
                          </button>
                        </div>
                      )}
                      {user?.role === 'PHARMACIST' &&
                        prescription.status === 'SENT_TO_PHARMACY' && (
                          <button
                            type="button"
                            disabled={busyId === prescription.id}
                            onClick={() => fulfillPrescription(prescription)}
                            className="rounded-lg bg-[#1877F2] px-3 py-2 font-bold text-white disabled:opacity-50"
                          >
                            Fulfill from inventory
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && user?.role === 'CONSULTANT' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setShowCreate(false)}
          />
          <form
            onSubmit={createPrescription}
            className="relative z-10 grid w-full max-w-lg grid-cols-2 gap-4 rounded-3xl bg-white p-7 shadow-2xl"
          >
            <h2 className="col-span-2 text-lg font-extrabold text-slate-900">
              Issue draft prescription
            </h2>
            <label className="col-span-2 text-xs font-bold">
              Patient name
              <input
                required
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"
              />
            </label>
            <label className="col-span-2 text-xs font-bold">
              Medication
              <input
                required
                value={drugName}
                onChange={(event) => setDrugName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"
              />
            </label>
            <label className="text-xs font-bold">
              Dosage
              <input
                required
                value={dosage}
                onChange={(event) => setDosage(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"
              />
            </label>
            <label className="text-xs font-bold">
              Quantity
              <input
                required
                min="1"
                type="number"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"
              />
            </label>
            <label className="text-xs font-bold">
              Frequency
              <input
                required
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"
              />
            </label>
            <label className="text-xs font-bold">
              Duration
              <input
                required
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"
              />
            </label>
            <div className="col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                disabled={creating}
                className="rounded-xl bg-[#1877F2] px-5 py-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create draft'}
              </button>
            </div>
          </form>
        </div>
      )}
    </SidebarLayout>
  );
}
