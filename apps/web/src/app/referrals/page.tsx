'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { useCurrentUser } from '@/store/useAppStore';
import { ArrowRightLeft, Send } from 'lucide-react';

type Referral = {
  id: string;
  fromProviderId: string;
  toProviderId: string;
  patientId: string;
  reason?: string | null;
  consentAt?: string | null;
  createdAt: string;
};

function asList(data: unknown): Referral[] {
  if (Array.isArray(data)) return data as Referral[];
  if (data && typeof data === 'object') {
    const rec = data as { referrals?: unknown };
    if (Array.isArray(rec.referrals)) return rec.referrals as Referral[];
  }
  return [];
}

export default function ReferralsPage() {
  const user = useCurrentUser();
  const role = user?.role || 'PATIENT';
  const isConsultant = role === 'CONSULTANT';

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState('');
  const [toProviderId, setToProviderId] = useState('');
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState(false);
  const [patientOptions, setPatientOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [providerOptions, setProviderOptions] = useState<Array<{ id: string; label: string }>>([]);

  // Server-fed pickers: patients are already scoped to the consultant's own
  // (the referral eligibility rule), providers to verified consultants.
  useEffect(() => {
    if (!isConsultant) return;
    (async () => {
      const [patRes, provRes] = await Promise.all([
        api.get('/users/patients?limit=50'),
        api.get('/users/providers?limit=50'),
      ]);
      if (patRes.success && patRes.data) {
        const list = Array.isArray(patRes.data) ? patRes.data : patRes.data.patients || [];
        setPatientOptions(
          list.map((p: any) => {
            const profile = p.patientProfile || {};
            const name =
              [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
              p.email ||
              'Patient';
            return { id: String(p.id), label: name };
          })
        );
      }
      if (provRes.success && provRes.data) {
        const list = Array.isArray(provRes.data) ? provRes.data : provRes.data.providers || [];
        setProviderOptions(
          list
            .map((d: any) => {
              const name =
                [d.firstName, d.lastName].filter(Boolean).join(' ') ||
                d.user?.email ||
                'Specialist';
              const uid = d.userId || d.user?.id;
              return {
                id: uid ? String(uid) : '',
                label: d.specialty ? `${name} · ${d.specialty}` : name,
              };
            })
            .filter((o: { id: string }) => o.id && o.id !== user?.id)
        );
      }
    })();
  }, [isConsultant, user?.id]);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const res = await api.get('/appointments/referrals');
    setLoading(false);
    if (res.success) {
      setReferrals(asList(res.data));
    } else {
      setListError(res.error?.message || 'Unable to load referrals.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isConsultant || submitting) return;
    if (!patientId.trim() || !toProviderId.trim()) {
      setFormError(true);
      setFormMsg('Select a patient and a receiving specialist.');
      return;
    }
    // Backend enforces consent:true (explicit patient consent, stamped server-side).
    if (!consent) {
      setFormError(true);
      setFormMsg('Patient consent must be confirmed before referring.');
      return;
    }
    setSubmitting(true);
    setFormMsg(null);
    const res = await api.post('/appointments/referrals', {
      patientId: patientId.trim(),
      toProviderId: toProviderId.trim(),
      reason: reason.trim() || undefined,
      consent: true,
    });
    setSubmitting(false);
    if (res.success && res.data?.id) {
      setFormError(false);
      setFormMsg('Referral created and audited.');
      setPatientId('');
      setToProviderId('');
      setReason('');
      setConsent(false);
      void load();
    } else {
      setFormError(true);
      setFormMsg(res.error?.message || 'Unable to create referral.');
    }
  };

  const direction = (r: Referral): string => {
    if (role === 'PATIENT') return 'Your referral';
    if (r.fromProviderId === user?.id) return 'Sent';
    if (r.toProviderId === user?.id) return 'Received';
    return 'Staff view';
  };

  return (
    <SidebarLayout allowedRoles={['CONSULTANT', 'PATIENT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN']}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]">
            <ArrowRightLeft className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Referrals</h1>
            <p className="text-xs font-medium text-slate-500">
              {isConsultant
                ? 'Hand off your own patient to another specialist with explicit consent.'
                : 'Referrals involving you. Only consultants can create referrals.'}
            </p>
          </div>
        </div>

        {isConsultant && (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-sm font-extrabold text-slate-900">New referral</h2>
            {formMsg && (
              <p
                role="status"
                className={`rounded-xl border p-3 text-xs font-bold ${formError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
              >
                {formMsg}
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">
                Patient *
                <select
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal"
                >
                  <option value="">Select one of your patients…</option>
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">
                Receiving specialist *
                <select
                  value={toProviderId}
                  onChange={(e) => setToProviderId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-normal"
                >
                  <option value="">Select a specialist…</option>
                  {providerOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-700">
              Clinical reason
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this patient being referred?"
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal"
              />
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#1877F2]"
              />
              <span className="font-semibold text-slate-700">
                The patient gave explicit consent to this referral. Consent is timestamped
                server-side and the referral is audit-logged.
              </span>
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-6 py-3 text-xs font-bold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden />
                {submitting ? 'Creating…' : 'Create referral'}
              </button>
            </div>
          </form>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">
              {isConsultant ? 'Sent & received' : 'Referrals'} ({referrals.length})
            </h2>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading referrals…</p>
          ) : listError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {listError}
            </p>
          ) : referrals.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No referrals yet.
              {isConsultant && ' Create the first one above.'}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {referrals.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#1877F2]/10 px-2.5 py-1 text-[11px] font-bold text-[#1877F2]">
                      {direction(r)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>
                  {r.reason && <p className="mt-2 font-semibold text-slate-800">{r.reason}</p>}
                  <dl className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-slate-500 md:grid-cols-3">
                    <div>
                      <dt className="font-bold uppercase tracking-wide">Patient</dt>
                      <dd className="truncate font-mono">{r.patientId}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide">From</dt>
                      <dd className="truncate font-mono">{r.fromProviderId}</dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wide">To</dt>
                      <dd className="truncate font-mono">{r.toProviderId}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Consent: {r.consentAt ? new Date(r.consentAt).toLocaleString() : 'recorded'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SidebarLayout>
  );
}
