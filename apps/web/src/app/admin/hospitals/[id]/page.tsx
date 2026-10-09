'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { ChevronLeft } from 'lucide-react';

type HospitalForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
};

type ProviderSummary = {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string | null;
  isVerified: boolean;
};

export default function HospitalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [form, setForm] = useState<HospitalForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
  });
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [attachId, setAttachId] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [staffMsg, setStaffMsg] = useState('');
  const [staffError, setStaffError] = useState(false);
  const [detachingId, setDetachingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const res = await api.get(`/admin/hospitals/${id}`);
      if (res.success && res.data) {
        const address =
          res.data.address && typeof res.data.address === 'object' ? res.data.address : {};
        setForm({
          name: res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          address: address.line1 || '',
          city: address.city || '',
          state: address.state || '',
          country: address.country || '',
        });
        setProviders(Array.isArray(res.data.providers) ? res.data.providers : []);
        setActive(Boolean(res.data.isActive));
      } else {
        setIsError(true);
        setMessage(res.error?.message || 'Unable to load this hospital.');
      }
      setLoading(false);
    }
    void load();
  }, [id]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) return;
    setSaving(true);
    setMessage('');
    const res = await api.put(`/admin/hospitals/${id}`, form);
    setSaving(false);
    if (res.success) {
      setIsError(false);
      setMessage('Hospital updated.');
    } else {
      setIsError(true);
      setMessage(res.error?.message || 'Unable to update this hospital.');
    }
  };

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => router.push('/admin/hospitals')}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#1877F2]"
        >
          <ChevronLeft className="w-4 h-4" /> Back to hospitals
        </button>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Hospital details</h1>
            <p className="text-xs text-slate-500 mt-1">
              Edit the persisted hospital record and review assigned providers.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-bold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
          >
            {active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        {message && (
          <div
            className={`rounded-xl border p-3 text-xs font-bold ${isError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
          >
            {message}
          </div>
        )}
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-xs text-slate-400">Loading hospital…</div>
        ) : (
          <form
            onSubmit={save}
            className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            {(
              [
                ['name', 'Hospital name', 'text'],
                ['email', 'Email', 'email'],
                ['phone', 'Phone', 'tel'],
                ['address', 'Street address', 'text'],
                ['city', 'City', 'text'],
                ['state', 'State', 'text'],
                ['country', 'Country', 'text'],
              ] as const
            ).map(([field, label, type]) => (
              <label
                key={field}
                className={`text-xs font-bold text-slate-700 ${field === 'name' || field === 'address' ? 'md:col-span-2' : ''}`}
              >
                {label} *
                <input
                  required
                  type={type}
                  value={form[field]}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
                />
              </label>
            ))}
            <div className="md:col-span-2 flex justify-end">
              <button
                disabled={saving}
                className="rounded-xl bg-[#1877F2] px-6 py-3 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save hospital'}
              </button>
            </div>
          </form>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900">
            Assigned providers ({providers.length})
          </h2>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const value = attachId.trim();
              if (!value || !id || attaching) return;
              setAttaching(true);
              setStaffMsg('');
              const res = await api.post('/admin/hospitals/doctors', {
                providerId: value,
                hospitalId: id,
              });
              setAttaching(false);
              if (res.success) {
                setStaffError(false);
                setStaffMsg('Provider attached to this hospital.');
                setAttachId('');
                const refreshed = await api.get(`/admin/hospitals/${id}`);
                if (refreshed.success && Array.isArray(refreshed.data?.providers)) {
                  setProviders(refreshed.data.providers);
                }
              } else {
                setStaffError(true);
                setStaffMsg(res.error?.message || 'Unable to attach provider.');
              }
            }}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <input
              value={attachId}
              onChange={(event) => setAttachId(event.target.value)}
              placeholder="Provider user ID or profile ID"
              aria-label="Provider user ID or profile ID"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs"
            />
            <button
              type="submit"
              disabled={attaching || !attachId.trim()}
              className="rounded-xl bg-[#1877F2] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {attaching ? 'Attaching…' : 'Attach doctor'}
            </button>
          </form>
          {staffMsg && (
            <p
              role="status"
              className={`mt-3 rounded-xl border p-3 text-xs font-bold ${staffError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
            >
              {staffMsg}
            </p>
          )}
          {providers.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              No providers are assigned to this hospital.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100 text-xs">
              {providers.map((provider) => (
                <div key={provider.id} className="grid grid-cols-4 items-center gap-4 py-3">
                  <span className="font-bold">
                    {provider.firstName} {provider.lastName}
                  </span>
                  <span>{provider.specialty || '—'}</span>
                  <span>{provider.isVerified ? 'Verified' : 'Pending'}</span>
                  <button
                    type="button"
                    disabled={detachingId === provider.id}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Detach ${provider.firstName} ${provider.lastName} from this hospital?`
                        )
                      )
                        return;
                      setDetachingId(provider.id);
                      const res = await api.delete(`/admin/hospitals/doctors/${provider.id}`);
                      setDetachingId(null);
                      if (res.success) {
                        setStaffError(false);
                        setStaffMsg('Provider detached.');
                        setProviders((prev) => prev.filter((p) => p.id !== provider.id));
                      } else {
                        setStaffError(true);
                        setStaffMsg(res.error?.message || 'Unable to detach provider.');
                      }
                    }}
                    className="justify-self-end rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {detachingId === provider.id ? 'Detaching…' : 'Detach'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </SidebarLayout>
  );
}
