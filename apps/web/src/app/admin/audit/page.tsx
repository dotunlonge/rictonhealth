'use client';

import { FormEvent, useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';

type AuditLog = {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [action, setAction] = useState('');
  const [submittedAction, setSubmittedAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 50;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (submittedAction) query.set('action', submittedAction);
      const res = await api.get<{ logs: AuditLog[]; meta: { total: number } }>(`/admin/audit-logs?${query}`);
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotal(res.data.meta.total);
      } else {
        setLogs([]);
        setError(res.error?.message || 'Unable to load audit events.');
      }
      setLoading(false);
    }
    void load();
  }, [page, submittedAction]);

  const filter = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSubmittedAction(action.trim());
  };

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Audit log</h1><p className="mt-1 text-xs text-slate-500">Immutable security and administrative events recorded by the backend.</p></div>
        <form onSubmit={filter} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter by exact action" className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm" />
          <button className="rounded-xl bg-[#1877F2] px-5 py-2 text-xs font-bold text-white">Apply filter</button>
        </form>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="p-4">Time</th><th className="p-4">Action</th><th className="p-4">Resource</th><th className="p-4">Actor</th><th className="p-4">IP address</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading audit events…</td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No audit events found.</td></tr> : logs.map((log) => (
                <tr key={log.id}><td className="p-4 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td><td className="p-4 font-bold text-slate-900">{log.action}</td><td className="p-4">{log.resourceType}{log.resourceId ? ` · ${log.resourceId}` : ''}</td><td className="p-4">{log.actorId || 'System'}</td><td className="p-4">{log.ipAddress || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500"><span>{total} total events</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={page * limit >= total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Next</button></div></div>
      </div>
    </SidebarLayout>
  );
}
