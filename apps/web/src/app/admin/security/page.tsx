'use client';

import { useCallback, useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';

// Minimal SecOps console over the smartguard service (#117).
// Gateway + Next rewrites already route /api/smartguard/*
// (gateway/kong.yml smartguard-routes, apps/web/next.config.ts);
// this page is the previously-missing UI surface. SUPER_ADMIN only
// (mirrors the service's requireRole('SUPER_ADMIN') guard).

type SmartguardStatus = {
  service: string;
  status: string;
  activeThreats: number;
  unacknowledgedAlerts: number;
  uptime: number;
  timestamp: string;
};

type SmartguardMetrics = {
  totalEvents: number;
  eventsLast24h: number;
  threatCount: number;
  failedLoginsLast24h: number;
  timestamp: string;
};

type Alert = {
  id: string;
  type: string;
  severity: string;
  message: string;
  source: string;
  acknowledged: boolean;
  createdAt: string;
};

type Threat = {
  id: string;
  ip: string | null;
  action: string;
  severity: string;
  status: string;
  detectedAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorId: string | null;
  createdAt: string;
};

function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export default function AdminSecurityPage() {
  const [status, setStatus] = useState<SmartguardStatus | null>(null);
  const [metrics, setMetrics] = useState<SmartguardMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [audit, setAudit] = useState<{ logs: AuditEntry[]; total: number }>({
    logs: [],
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [statusRes, metricsRes, alertsRes, threatsRes, auditRes] = await Promise.all([
      api.get<SmartguardStatus>('/smartguard/status'),
      api.get<SmartguardMetrics>('/smartguard/metrics'),
      api.get<Alert[]>('/smartguard/alerts'),
      api.get<Threat[]>('/smartguard/threats'),
      api.get<{ logs: AuditEntry[]; total: number }>('/smartguard/audit-log?limit=20'),
    ]);
    if (statusRes.success && statusRes.data) setStatus(statusRes.data);
    if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
    if (alertsRes.success && alertsRes.data) setAlerts(asArray<Alert>(alertsRes.data));
    if (threatsRes.success && threatsRes.data) setThreats(asArray<Threat>(threatsRes.data));
    if (auditRes.success && auditRes.data) {
      const raw = auditRes.data as { logs?: AuditEntry[]; total?: number } | AuditEntry[];
      setAudit(
        Array.isArray(raw)
          ? { logs: raw, total: raw.length }
          : { logs: raw.logs ?? [], total: raw.total ?? 0 }
      );
    }
    const failures = [statusRes, metricsRes, alertsRes, threatsRes, auditRes].filter(
      (r) => !r.success
    );
    if (failures.length === 5) {
      setError(failures[0].error?.message || 'Unable to load Smartguard data.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acknowledge = async (id: string) => {
    setActing(id);
    const res = await api.post(`/smartguard/alerts/${id}/acknowledge`, {});
    if (res.success) {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    } else {
      setError(res.error?.message || 'Failed to acknowledge alert.');
    }
    setActing(null);
  };

  const mitigate = async (id: string) => {
    setActing(id);
    const res = await api.post(`/smartguard/threats/${id}/mitigate`, {});
    if (res.success) {
      setThreats((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'mitigated' } : t)));
    } else {
      setError(res.error?.message || 'Failed to mitigate threat.');
    }
    setActing(null);
  };

  const cards = [
    { label: 'Service status', value: status?.status ?? '—' },
    { label: 'Active threats (24h)', value: status?.activeThreats ?? metrics?.threatCount ?? '—' },
    { label: 'Unacknowledged alerts', value: status?.unacknowledgedAlerts ?? '—' },
    { label: 'Events (24h)', value: metrics?.eventsLast24h ?? '—' },
    { label: 'Failed logins (24h)', value: metrics?.failedLoginsLast24h ?? '—' },
    { label: 'Total audit events', value: metrics?.totalEvents ?? audit.total },
  ];

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Security operations</h1>
            <p className="mt-1 text-xs text-slate-500">
              Smartguard lens over the audit log. Every acknowledge / mitigate action is itself
              audited.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-lg font-black text-slate-900">
                {loading ? (
                  <span className="inline-block h-5 w-12 animate-pulse rounded bg-slate-100" />
                ) : (
                  String(card.value)
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="p-4 text-sm font-bold text-slate-900">Alerts</h2>
          <table className="w-full text-left text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Message</th>
                <th className="p-4">Source</th>
                <th className="p-4">State</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading alerts…
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No alerts.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td className="whitespace-nowrap p-4">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{alert.severity}</td>
                    <td className="p-4">{alert.message}</td>
                    <td className="p-4">{alert.source}</td>
                    <td className="p-4">{alert.acknowledged ? 'Acknowledged' : 'Open'}</td>
                    <td className="p-4">
                      {!alert.acknowledged && (
                        <button
                          type="button"
                          disabled={acting === alert.id}
                          onClick={() => void acknowledge(alert.id)}
                          className="rounded-lg bg-[#1877F2] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
                        >
                          {acting === alert.id ? 'Working…' : 'Acknowledge'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="p-4 text-sm font-bold text-slate-900">Threats</h2>
          <table className="w-full text-left text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Detected</th>
                <th className="p-4">Action</th>
                <th className="p-4">Severity</th>
                <th className="p-4">IP</th>
                <th className="p-4">Status</th>
                <th className="p-4">Mitigate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading threats…
                  </td>
                </tr>
              ) : threats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No threats.
                  </td>
                </tr>
              ) : (
                threats.map((threat) => (
                  <tr key={threat.id}>
                    <td className="whitespace-nowrap p-4">
                      {new Date(threat.detectedAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{threat.action}</td>
                    <td className="p-4">{threat.severity}</td>
                    <td className="p-4">{threat.ip || '—'}</td>
                    <td className="p-4">{threat.status}</td>
                    <td className="p-4">
                      {threat.status !== 'mitigated' && (
                        <button
                          type="button"
                          disabled={acting === threat.id}
                          onClick={() => void mitigate(threat.id)}
                          className="rounded-lg bg-[#1877F2] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
                        >
                          {acting === threat.id ? 'Working…' : 'Mitigate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <h2 className="p-4 text-sm font-bold text-slate-900">
            Recent audit events ({audit.total} total)
          </h2>
          <table className="w-full text-left text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Time</th>
                <th className="p-4">Action</th>
                <th className="p-4">Resource</th>
                <th className="p-4">Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Loading audit events…
                  </td>
                </tr>
              ) : audit.logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No audit events.
                  </td>
                </tr>
              ) : (
                audit.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap p-4">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{log.action}</td>
                    <td className="p-4">
                      {log.resourceType}
                      {log.resourceId ? ` · ${log.resourceId}` : ''}
                    </td>
                    <td className="p-4">{log.actorId || 'System'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}
