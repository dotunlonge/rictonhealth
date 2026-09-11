import { Request, Response, NextFunction } from 'express';
import { prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { logger } from '@ricton/shared';
import { NotFoundError } from '@ricton/shared';
import { parseAnalyticsTimeWindow } from '../time-range';

/**
 * Tenant scope: SUPER_ADMIN sees the platform; HOSPITAL_ADMIN is confined to
 * their own hospital (hospitalId resolved from their user record).
 */
async function resolveScope(req: Request): Promise<{ hospitalId: string | null }> {
  const userPayload = req.user as JwtPayload;
  if ((userPayload as { role?: string }).role === 'SUPER_ADMIN') {
    return { hospitalId: null };
  }
  const adminUser = await prisma.user.findUnique({
    where: { id: userPayload.userId },
    select: { hospitalId: true },
  });
  if (!adminUser?.hospitalId) {
    throw new NotFoundError(
      'No hospital organization is associated with your account. Platform-wide analytics requires SUPER_ADMIN.'
    );
  }
  return { hospitalId: adminUser.hospitalId };
}

export const getOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hospitalId } = await resolveScope(req);
    const userScope = hospitalId ? { hospitalId } : {};
    const apptScope = hospitalId ? { hospitalId } : {};
    // Providers may be linked via either their user record or their profile.
    const providerScope = hospitalId
      ? { OR: [{ hospitalId }, { providerProfile: { hospitalId } }] }
      : {};

    const [totalUsers, totalPatients, totalProviders, totalPharmacists, totalHospitals] =
      await Promise.all([
        prisma.user.count({ where: userScope }),
        prisma.user.count({ where: { ...userScope, role: 'PATIENT' } }),
        prisma.user.count({ where: { ...providerScope, role: 'CONSULTANT' } }),
        prisma.user.count({
          where: { role: 'PHARMACIST', ...(hospitalId ? { hospitalId } : {}) },
        }),
        hospitalId ? prisma.hospital.count({ where: { id: hospitalId } }) : prisma.hospital.count(),
      ]);

    const [totalAppointments, completedAppointments] = await Promise.all([
      prisma.appointment.count({ where: apptScope }),
      prisma.appointment.count({ where: { ...apptScope, status: 'COMPLETED' } }),
    ]);

    const payments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: hospitalId ? { status: 'SUCCESS', user: { hospitalId } } : { status: 'SUCCESS' },
    });

    const activeSubscriptions = await prisma.subscription.count({
      where: hospitalId ? { status: 'ACTIVE', user: { hospitalId } } : { status: 'ACTIVE' },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalPatients,
        totalProviders,
        totalPharmacists,
        totalHospitals,
        totalAppointments,
        completedAppointments,
        totalRevenue: payments._sum.amount ? Number(payments._sum.amount) : 0,
        activeSubscriptions,
        scope: hospitalId ? { hospitalId } : { platform: true },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching overview analytics');
    next(error);
  }
};

export const getAppointmentsTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hospitalId } = await resolveScope(req);
    const { since, until, createdAt } = parseAnalyticsTimeWindow(req.query);

    const byStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        ...(hospitalId ? { hospitalId } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      _count: { id: true },
    });

    const byType = await prisma.appointment.groupBy({
      by: ['type'],
      where: {
        ...(hospitalId ? { hospitalId } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      _count: { id: true },
    });

    const daily = await prisma.$queryRaw<Array<{ period: string; count: bigint }>>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS period,
             COUNT(*)::int AS count
      FROM "appointments"
      WHERE (${hospitalId}::uuid IS NULL OR "hospitalId" = ${hospitalId}::uuid)
        AND (${since}::timestamptz IS NULL OR "createdAt" >= ${since}::timestamptz)
        AND (${until}::timestamptz IS NULL OR "createdAt" <= ${until}::timestamptz)
      GROUP BY 1 ORDER BY 1 LIMIT 400`;

    res.json({
      success: true,
      data: {
        total: byStatus.reduce((s, g) => s + g._count.id, 0),
        byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count.id])),
        byType: Object.fromEntries(byType.map((g) => [g.type, g._count.id])),
        trend: daily.map((r) => ({ period: r.period, count: Number(r.count) })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching appointments trend');
    next(error);
  }
};

export const getRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hospitalId } = await resolveScope(req);
    const { since, until, createdAt } = parseAnalyticsTimeWindow(req.query);

    const byType = await prisma.payment.groupBy({
      by: ['type'],
      where: {
        status: 'SUCCESS',
        ...(hospitalId ? { user: { hospitalId } } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalRevenue = byType.reduce((s, g) => s + Number(g._sum.amount ?? 0), 0);

    const daily = await prisma.$queryRaw<Array<{ period: string; amount: unknown }>>`
      SELECT to_char(date_trunc('day', p."createdAt"), 'YYYY-MM-DD') AS period,
             COALESCE(SUM(p."amount"), 0) AS amount
      FROM "payments" p LEFT JOIN "users" u ON u."id" = p."userId"
      WHERE p."status" = 'SUCCESS'
        AND (${hospitalId}::uuid IS NULL OR u."hospitalId" = ${hospitalId}::uuid)
        AND (${since}::timestamptz IS NULL OR p."createdAt" >= ${since}::timestamptz)
        AND (${until}::timestamptz IS NULL OR p."createdAt" <= ${until}::timestamptz)
      GROUP BY 1 ORDER BY 1 LIMIT 400`;

    res.json({
      success: true,
      data: {
        totalRevenue,
        byType: Object.fromEntries(byType.map((g) => [g.type, Number(g._sum.amount ?? 0)])),
        trend: daily.map((r) => ({ period: r.period, amount: Number(r.amount) })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching revenue analytics');
    next(error);
  }
};

export const getUserGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hospitalId } = await resolveScope(req);
    const { since, until, createdAt } = parseAnalyticsTimeWindow(req.query);

    const byRole = await prisma.user.groupBy({
      by: ['role'],
      where: {
        ...(hospitalId ? { hospitalId } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      _count: { id: true },
    });

    const daily = await prisma.$queryRaw<Array<{ period: string; count: bigint }>>`
      SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS period,
             COUNT(*)::int AS count
      FROM "users"
      WHERE (${hospitalId}::uuid IS NULL OR "hospitalId" = ${hospitalId}::uuid)
        AND (${since}::timestamptz IS NULL OR "createdAt" >= ${since}::timestamptz)
        AND (${until}::timestamptz IS NULL OR "createdAt" <= ${until}::timestamptz)
      GROUP BY 1 ORDER BY 1 LIMIT 400`;

    res.json({
      success: true,
      data: {
        totalUsers: byRole.reduce((s, g) => s + g._count.id, 0),
        byRole: Object.fromEntries(byRole.map((g) => [g.role, g._count.id])),
        trend: daily.map((r) => ({ period: r.period, count: Number(r.count) })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user growth analytics');
    next(error);
  }
};

export const getProviderPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { createdAt } = parseAnalyticsTimeWindow(req.query);
    const { hospitalId } = await resolveScope(req);
    const requestedLimit = Number(req.query.limit) || 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const providerWhere = {
      role: 'CONSULTANT' as const,
      ...(hospitalId ? { OR: [{ hospitalId }, { providerProfile: { hospitalId } }] } : {}),
    };

    const [total, providers] = await Promise.all([
      prisma.user.count({ where: providerWhere }),
      prisma.user.findMany({
        where: providerWhere,
        select: {
          id: true,
          email: true,
          providerProfile: {
            select: {
              firstName: true,
              lastName: true,
              specialty: true,
              rating: true,
            },
          },
        },
        orderBy: { id: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const counts = await prisma.appointment.groupBy({
      by: ['providerId', 'status'],
      where: {
        providerId: { in: providers.map((p) => p.id) },
        ...(createdAt ? { createdAt } : {}),
      },
      _count: { id: true },
    });

    const byProvider = new Map<string, { total: number; completed: number }>();
    for (const c of counts) {
      const entry = byProvider.get(c.providerId) ?? { total: 0, completed: 0 };
      entry.total += c._count.id;
      if (c.status === 'COMPLETED') entry.completed += c._count.id;
      byProvider.set(c.providerId, entry);
    }

    const providerStats = providers.map((provider) => ({
      providerId: provider.id,
      name:
        [provider.providerProfile?.firstName, provider.providerProfile?.lastName]
          .filter(Boolean)
          .join(' ') ||
        provider.email ||
        'Consultant',
      specialty: provider.providerProfile?.specialty || null,
      appointmentCount: byProvider.get(provider.id)?.total ?? 0,
      completedCount: byProvider.get(provider.id)?.completed ?? 0,
      rating: provider.providerProfile?.rating ? Number(provider.providerProfile.rating) : null,
    }));

    res.json({
      success: true,
      data: {
        providers: providerStats,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching provider performance');
    next(error);
  }
};

export const getPharmacyMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { createdAt } = parseAnalyticsTimeWindow(req.query);
    const { hospitalId } = await resolveScope(req);
    const pharmacyUserWhere = {
      role: 'PHARMACIST' as const,
      ...(hospitalId ? { hospitalId } : {}),
    };

    const [totalPharmacies, verifiedPharmacies] = await Promise.all([
      prisma.user.count({ where: pharmacyUserWhere }),
      prisma.pharmacyProfile.count({
        where: {
          isVerified: true,
          ...(hospitalId ? { user: { hospitalId } } : {}),
        },
      }),
    ]);

    const byStatus = await prisma.pharmacyOrder.groupBy({
      by: ['status'],
      where: {
        ...(hospitalId ? { pharmacy: { hospitalId } } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    res.json({
      success: true,
      data: {
        totalPharmacies,
        verifiedPharmacies,
        totalOrders: byStatus.reduce((s, g) => s + g._count.id, 0),
        ordersByStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count.id])),
        totalOrderValue: byStatus.reduce((s, g) => s + Number(g._sum.totalAmount ?? 0), 0),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching pharmacy metrics');
    next(error);
  }
};
