import { Request, Response, NextFunction } from 'express';
import { prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, HTTP_STATUS } from '@ricton/shared';

// Smartguard is a read lens over the persistent audit log — no process-local
// fixtures. Alerts = recent elevated-risk audit events; threats = the
// security-critical subset; acknowledge/mitigate append audit entries so every
// operator action is itself audited and survives restarts/replicas.

const THREAT_ACTIONS = ['TOKEN_REUSE_ATTACK', 'DEVICE_MISMATCH', 'PASSWORD_RESET_FAILURE'];
const ALERT_RISK_THRESHOLD = 40;

type Severity = 'low' | 'medium' | 'high' | 'critical';

function severityFor(risk: number | null | undefined, action: string): Severity {
  if (action === 'TOKEN_REUSE_ATTACK') return 'critical';
  if ((risk ?? 0) >= 80) return 'critical';
  if ((risk ?? 0) >= 60) return 'high';
  if ((risk ?? 0) >= 40) return 'medium';
  return 'low';
}

async function acknowledgedIds(): Promise<Set<string>> {
  const acks = await prisma.auditLog.findMany({
    where: {
      action: 'ALERT_ACKNOWLEDGED',
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { resourceId: true },
    take: 1000,
  });
  return new Set(acks.map((a) => a.resourceId).filter((id): id is string => Boolean(id)));
}

async function mitigatedIds(): Promise<Set<string>> {
  const mits = await prisma.auditLog.findMany({
    where: {
      action: 'THREAT_MITIGATED',
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { resourceId: true },
    take: 1000,
  });
  return new Set(mits.map((m) => m.resourceId).filter((id): id is string => Boolean(id)));
}

export const getStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [activeThreats, unacknowledgedAlerts] = await Promise.all([
      prisma.auditLog.count({
        where: {
          action: { in: THREAT_ACTIONS },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.auditLog.count({
        where: {
          riskScore: { gte: ALERT_RISK_THRESHOLD },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

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
  } catch (error) {
    next(error);
  }
};

export const getAlerts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [events, acked] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          OR: [{ riskScore: { gte: ALERT_RISK_THRESHOLD } }, { action: { in: THREAT_ACTIONS } }],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      acknowledgedIds(),
    ]);

    res.status(HTTP_STATUS.OK).json(
      successResponse(
        events.map((e) => ({
          id: e.id,
          type: e.action.toLowerCase(),
          severity: severityFor(e.riskScore, e.action),
          message: `${e.action} (${e.resourceType})`,
          source: e.resourceType,
          acknowledged: acked.has(e.id),
          createdAt: e.createdAt.toISOString(),
        }))
      )
    );
  } catch (error) {
    next(error);
  }
};

export const acknowledgeAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const id = req.params.id || (req.body as { id?: string }).id;
    if (!id) {
      throw new NotFoundError('Alert not found');
    }
    const event = await prisma.auditLog.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundError('Alert not found');
    }
    const ack = await prisma.auditLog.create({
      data: {
        actorId: userPayload.userId,
        action: 'ALERT_ACKNOWLEDGED',
        resourceType: 'AuditLog',
        resourceId: id,
        metadata: { action: event.action, riskScore: event.riskScore },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });
    res
      .status(HTTP_STATUS.OK)
      .json(successResponse({ id: event.id, acknowledged: true, acknowledgedAt: ack.createdAt }));
  } catch (error) {
    next(error);
  }
};

export const getMetrics = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalEvents, eventsLast24h, threatCount, failedLogins] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.auditLog.count({ where: { action: { in: THREAT_ACTIONS } } }),
      prisma.auditLog.count({
        where: { action: 'LOGIN_FAILURE', createdAt: { gte: dayAgo } },
      }),
    ]);
    res.status(HTTP_STATUS.OK).json(
      successResponse({
        totalEvents,
        eventsLast24h,
        threatCount,
        failedLoginsLast24h: failedLogins,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getThreats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [events, mitigated] = await Promise.all([
      prisma.auditLog.findMany({
        where: { action: { in: THREAT_ACTIONS } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      mitigatedIds(),
    ]);
    res.status(HTTP_STATUS.OK).json(
      successResponse(
        events.map((e) => ({
          id: e.id,
          ip: e.ipAddress,
          action: e.action,
          severity: severityFor(e.riskScore, e.action),
          status: mitigated.has(e.id) ? 'mitigated' : 'active',
          detectedAt: e.createdAt.toISOString(),
        }))
      )
    );
  } catch (error) {
    next(error);
  }
};

export const mitigateThreat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const event = await prisma.auditLog.findUnique({ where: { id } });
    if (!event || !THREAT_ACTIONS.includes(event.action)) {
      throw new NotFoundError('Threat not found');
    }
    const mitigation = await prisma.auditLog.create({
      data: {
        actorId: userPayload.userId,
        action: 'THREAT_MITIGATED',
        resourceType: 'AuditLog',
        resourceId: id,
        metadata: { action: event.action },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });
    res
      .status(HTTP_STATUS.OK)
      .json(
        successResponse({ id: event.id, status: 'mitigated', mitigatedAt: mitigation.createdAt })
      );
  } catch (error) {
    next(error);
  }
};

export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 50);
    const offset = Number(req.query.offset) || 0;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count(),
    ]);
    res.status(HTTP_STATUS.OK).json(successResponse({ logs, total, limit, offset }));
  } catch (error) {
    next(error);
  }
};
