'use client';

import { useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  LifeBuoy,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

type TicketStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

type Ticket = {
  id: string;
  userId?: string;
  subject: string;
  body: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  updatedAt?: string;
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<TicketStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (selectedStatus: TicketStatus) => {
    setLoading(true);
    const query = selectedStatus === 'ALL' ? '' : `?status=${selectedStatus}`;
    const r = await api.get<{ tickets: Ticket[] }>(`/admin/support/tickets/all${query}`);
    if (r.success) {
      setTickets(r.data?.tickets || []);
    } else {
      setFeedback({
        message: r.error?.message || 'Unable to load support tickets.',
        type: 'error',
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(statusFilter);
  }, [load, statusFilter]);

  const updateTicket = async (id: string, nextStatus: 'IN_PROGRESS' | 'RESOLVED') => {
    setActing(id);
    setFeedback(null);
    const r = await api.patch(`/admin/support/tickets/${id}`, { status: nextStatus });
    setActing(null);

    if (r.success) {
      setTickets((all) =>
        all.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
      );
      setFeedback({
        message:
          nextStatus === 'RESOLVED'
            ? 'Ticket marked as RESOLVED and audit trail generated.'
            : 'Ticket triaged to IN_PROGRESS.',
        type: 'success',
      });
    } else {
      setFeedback({ message: r.error?.message || 'Unable to update ticket status.', type: 'error' });
    }
  };

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const id = (t.id || '').toLowerCase();
    const subject = (t.subject || '').toLowerCase();
    const body = (t.body || '').toLowerCase();
    return id.includes(q) || subject.includes(q) || body.includes(q);
  });

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Console */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1877F2]/10 text-[#1877F2]">
                <LifeBuoy className="w-3.5 h-3.5" /> Support Operations Desk
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Audited Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              Support Triage & Dispute Resolution
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Investigate patient complaints, payment disputes, and system questions. Every triage transition is logged for compliance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void load(statusFilter)}
              disabled={loading}
              title="Refresh Tickets"
              className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              {feedback.message}
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Status Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 overflow-x-auto">
            {(
              [
                { key: 'ALL', label: 'All Tickets' },
                { key: 'OPEN', label: 'Open', count: counts.open },
                { key: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
                { key: 'RESOLVED', label: 'Resolved', count: counts.resolved },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.key
                    ? 'bg-white text-[#1877F2] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      tab.key === 'OPEN'
                        ? 'bg-amber-100 text-amber-800'
                        : tab.key === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket subject, ID, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-8 h-8 border-3 border-[#1877F2] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading support tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl">
              ✓
            </div>
            <h3 className="font-bold text-slate-800 text-base">Inbox Clear</h3>
            <p className="text-slate-400 text-xs mt-1">
              No support tickets found matching this filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((t) => {
              const isOpen = t.status === 'OPEN';
              const isInProgress = t.status === 'IN_PROGRESS';
              const isResolved = t.status === 'RESOLVED';

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-start justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          isOpen
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : isInProgress
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isOpen ? <AlertCircle className="w-3.5 h-3.5" /> : isInProgress ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {t.status.replace('_', ' ')}
                      </span>

                      <span className="font-mono text-xs text-slate-400">
                        ID: {t.id.slice(0, 8)}…{t.id.slice(-4)}
                      </span>

                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(t.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">{t.subject}</h2>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                        {t.body}
                      </p>
                    </div>

                    {t.userId && (
                      <p className="text-[11px] text-slate-400 font-medium">
                        Filed by Account: <code className="font-mono text-slate-600">{t.userId}</code>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center md:flex-col gap-2 shrink-0 md:pt-1">
                    {isOpen && (
                      <button
                        onClick={() => void updateTicket(t.id, 'IN_PROGRESS')}
                        disabled={acting === t.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1877F2] hover:bg-[#1565C0] text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" /> Start Triage
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => void updateTicket(t.id, 'RESOLVED')}
                        disabled={acting === t.id}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve Issue
                      </button>
                    )}

                    {isResolved && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved & Audited
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
