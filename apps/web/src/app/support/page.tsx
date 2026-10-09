'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { LifeBuoy, Send } from 'lucide-react';

type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
};

function asList(data: unknown): Ticket[] {
  if (Array.isArray(data)) return data as Ticket[];
  if (data && typeof data === 'object') {
    const rec = data as { tickets?: unknown };
    if (Array.isArray(rec.tickets)) return rec.tickets as Ticket[];
  }
  return [];
}

const statusStyle: Record<Ticket['status'], string> = {
  OPEN: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const res = await api.get('/admin/support/tickets');
    setLoading(false);
    if (res.success) {
      setTickets(asList(res.data));
    } else {
      setListError(res.error?.message || 'Unable to load your tickets.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!subject.trim() || !body.trim()) {
      setFormError(true);
      setFormMsg('Subject and details are required.');
      return;
    }
    setSubmitting(true);
    setFormMsg(null);
    const res = await api.post('/admin/support/tickets', {
      subject: subject.trim(),
      body: body.trim(),
    });
    setSubmitting(false);
    if (res.success) {
      setFormError(false);
      setFormMsg('Ticket filed. Our team will triage it shortly.');
      setSubject('');
      setBody('');
      void load();
    } else {
      setFormError(true);
      setFormMsg(res.error?.message || 'Unable to file your ticket.');
    }
  };

  return (
    <SidebarLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]">
            <LifeBuoy className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Support</h1>
            <p className="text-xs font-medium text-slate-500">
              File a ticket and track its status. Every state change is audit-logged.
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-extrabold text-slate-900">New ticket</h2>
          {formMsg && (
            <p
              role="status"
              className={`rounded-xl border p-3 text-xs font-bold ${formError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
            >
              {formMsg}
            </p>
          )}
          <label className="block text-xs font-bold text-slate-700">
            Subject *
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Payment not reflecting in wallet"
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal"
            />
          </label>
          <label className="block text-xs font-bold text-slate-700">
            Details *
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe what happened, when, and what you expected…"
              rows={4}
              maxLength={2000}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 font-normal"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-[#1877F2] px-6 py-3 text-xs font-bold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden />
              {submitting ? 'Filing…' : 'File ticket'}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">My tickets ({tickets.length})</h2>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="py-8 text-center text-xs text-slate-400">Loading tickets…</p>
          ) : listError ? (
            <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
              {listError}
            </p>
          ) : tickets.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No tickets yet. File the first one above.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-900">{t.subject}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[t.status] ?? 'bg-slate-100 text-slate-500'}`}
                    >
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{t.body}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}
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
