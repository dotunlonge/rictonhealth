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
  const [form, setForm] = useState<HospitalForm>({ name: '', email: '', phone: '', address: '', city: '', state: '', country: '' });
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const res = await api.get(`/admin/hospitals/${id}`);
      if (res.success && res.data) {
        const address = res.data.address && typeof res.data.address === 'object' ? res.data.address : {};
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
        <button type="button" onClick={() => router.push('/admin/hospitals')} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#1877F2]"><ChevronLeft className="w-4 h-4" /> Back to hospitals</button>
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-2xl font-extrabold text-slate-900">Hospital details</h1><p className="text-xs text-slate-500 mt-1">Edit the persisted hospital record and review assigned providers.</p></div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{active ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>
        {message && <div className={`rounded-xl border p-3 text-xs font-bold ${isError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{message}</div>}
        {loading ? <div className="rounded-3xl bg-white p-8 text-xs text-slate-400">Loading hospital…</div> : (
          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {([
              ['name', 'Hospital name', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Phone', 'tel'],
              ['address', 'Street address', 'text'],
              ['city', 'City', 'text'],
              ['state', 'State', 'text'],
              ['country', 'Country', 'text'],
            ] as const).map(([field, label, type]) => (
              <label key={field} className={`text-xs font-bold text-slate-700 ${field === 'name' || field === 'address' ? 'md:col-span-2' : ''}`}>
                {label} *
                <input required type={type} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal" />
              </label>
            ))}
            <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="rounded-xl bg-[#1877F2] px-6 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save hospital'}</button></div>
          </form>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-900">Assigned providers ({providers.length})</h2>
          {providers.length === 0 ? <p className="mt-4 text-xs text-slate-500">No providers are assigned to this hospital.</p> : (
            <div className="mt-4 divide-y divide-slate-100 text-xs">
              {providers.map((provider) => <div key={provider.id} className="grid grid-cols-3 gap-4 py-3"><span className="font-bold">{provider.firstName} {provider.lastName}</span><span>{provider.specialty || '—'}</span><span>{provider.isVerified ? 'Verified' : 'Pending'}</span></div>)}
            </div>
          )}
        </section>
      </div>
    </SidebarLayout>
  );
}
