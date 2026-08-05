import { Request, Response } from 'express';
import { successResponse, NotFoundError, HTTP_STATUS } from '@ricton/shared';

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source: string;
  acknowledged: boolean;
  createdAt: string;
}

interface Threat {
  id: string;
  ip: string;
  action: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'mitigated' | 'resolved';
  detectedAt: string;
  mitigatedAt?: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  resource: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

const alerts: Alert[] = [
  {
    id: 'alert-001',
    type: 'rate_limit_exceeded',
    severity: 'medium',
    message: 'Rate limit exceeded for IP 203.0.113.42',
    source: 'gateway',
    acknowledged: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-002',
    type: 'suspicious_login',
    severity: 'high',
    message: 'Multiple failed login attempts detected for user admin',
    source: 'auth-service',
    acknowledged: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'alert-003',
    type: 'anomaly_detected',
    severity: 'critical',
    message: 'Unusual data access pattern detected on /api/users/me',
    source: 'user-service',
    acknowledged: false,
    createdAt: new Date().toISOString(),
  },
];

const threats: Threat[] = [
  {
    id: 'threat-001',
    ip: '203.0.113.42',
    action: 'brute_force_login',
    severity: 'high',
    status: 'active',
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'threat-002',
    ip: '198.51.100.23',
    action: 'data_exfiltration',
    severity: 'critical',
    status: 'active',
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'threat-003',
    ip: '192.0.2.10',
    action: 'port_scan',
    severity: 'medium',
    status: 'mitigated',
    detectedAt: new Date().toISOString(),
    mitigatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

const auditLog: AuditEntry[] = [
  {
    id: 'audit-001',
    action: 'alert_acknowledged',
    actor: 'admin',
    resource: 'alert-001',
    timestamp: new Date().toISOString(),
    details: { severity: 'medium' },
  },
  {
    id: 'audit-002',
    action: 'threat_mitigated',
    actor: 'system',
    resource: 'threat-003',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    details: { action: 'ip_blocked' },
  },
];

export const getStatus = (_req: Request, res: Response) => {
  const activeThreats = threats.filter((t) => t.status === 'active').length;
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;

  res.status(HTTP_STATUS.OK).json(
    successResponse({
      service: 'smartguard',
      status: 'operational',
      activeThreats,
      unacknowledgedAlerts,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
};

export const getAlerts = (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json(successResponse(alerts));
};

export const acknowledgeAlert = (req: Request, res: Response) => {
  const { id } = req.params;
  const alert = alerts.find((a) => a.id === id);
  if (!alert) {
    throw new NotFoundError('Alert not found');
  }
  alert.acknowledged = true;
  auditLog.push({
    id: `audit-${Date.now()}`,
    action: 'alert_acknowledged',
    actor: 'admin',
    resource: id,
    timestamp: new Date().toISOString(),
  });
  res.status(HTTP_STATUS.OK).json(successResponse(alert));
};

export const getMetrics = (_req: Request, res: Response) => {
  const metrics = {
    totalRequests: 15420,
    blockedRequests: 342,
    rateLimitedRequests: 128,
    avgResponseTimeMs: 45,
    errorRate: 0.02,
    threatCount: threats.length,
    activeThreats: threats.filter((t) => t.status === 'active').length,
    alertsLast24h: alerts.length,
  };
  res.status(HTTP_STATUS.OK).json(successResponse(metrics));
};

export const getThreats = (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json(successResponse(threats));
};

export const mitigateThreat = (req: Request, res: Response) => {
  const { id } = req.params;
  const threat = threats.find((t) => t.id === id);
  if (!threat) {
    throw new NotFoundError('Threat not found');
  }
  threat.status = 'mitigated';
  threat.mitigatedAt = new Date().toISOString();
  auditLog.push({
    id: `audit-${Date.now()}`,
    action: 'threat_mitigated',
    actor: 'admin',
    resource: id,
    timestamp: new Date().toISOString(),
    details: { action: 'threat_mitigated' },
  });
  res.status(HTTP_STATUS.OK).json(successResponse(threat));
};

export const getAuditLog = (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json(successResponse(auditLog));
};
