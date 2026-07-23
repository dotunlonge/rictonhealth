import { Request, Response, NextFunction } from 'express';
import { prisma, Prisma } from '@ricton/db';
import { logger, getCached, setCached } from '@ricton/shared';
import { z } from 'zod';

const RangeQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', '12m', 'all']).default('30d'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const getOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'analytics:overview';
    const cached = await getCached<Record<string, unknown>>(cacheKey, { ttlSeconds: 600 });
    if (cached) {
      return res.json(cached);
    }

    const [totalUsers, totalPatients, totalProviders, totalPharmacists, totalHospitals] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'PATIENT' } }),
        prisma.user.count({ where: { role: 'CONSULTANT' } }),
        prisma.user.count({ where: { role: 'PHARMACIST' } }),
        prisma.user.count({ where: { role: 'HOSPITAL_ADMIN' } }),
      ]);

    const [totalAppointments, completedAppointments] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'COMPLETED' } }),
    ]);

    const payments = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'SUCCESS' },
    });

    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'ACTIVE' },
    });

    const data = {
      success: true,
      data: {
        totalUsers,
        totalPatients,
        totalProviders,
        totalPharmacists,
        totalHospitals,
        totalAppointments,
        completedAppointments,
        totalRevenue: Number(payments._sum.amount || 0),
        activeSubscriptions,
      },
    };

    await setCached(cacheKey, data, { ttlSeconds: 600 });

    res.json(data);
  } catch (error: unknown) {
    next(error);
  }
};

export const getAppointmentsTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const whereClause: Prisma.AppointmentWhereInput = {};
    if (query.from || query.to) {
      whereClause.createdAt = {};
      if (query.from) whereClause.createdAt.gte = new Date(query.from);
      if (query.to) whereClause.createdAt.lte = new Date(query.to);
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      select: {
        status: true,
        type: true,
        createdAt: true,
      },
    });

    const byStatus = appointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byType = appointments.reduce(
      (acc, apt) => {
        acc[apt.type || 'UNKNOWN'] = (acc[apt.type || 'UNKNOWN'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const trend = appointments.map((apt) => ({
      period: apt.createdAt.toISOString().split('T')[0],
      count: 1,
    }));

    const aggregatedTrend = Object.values(
      trend.reduce(
        (acc, item) => {
          if (!acc[item.period]) {
            acc[item.period] = { period: item.period, count: 0 };
          }
          acc[item.period].count += item.count;
          return acc;
        },
        {} as Record<string, { period: string; count: number }>
      )
    ).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      success: true,
      data: {
        total: appointments.length,
        byStatus,
        byType,
        trend: aggregatedTrend,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error fetching appointments trend');
    next(error);
  }
};

export const getRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const whereClause: Prisma.PaymentWhereInput = { status: 'SUCCESS' };
    if (query.from || query.to) {
      whereClause.createdAt = {};
      if (query.from) whereClause.createdAt.gte = new Date(query.from);
      if (query.to) whereClause.createdAt.lte = new Date(query.to);
    }

    const payments = await prisma.payment.findMany({
      select: {
        amount: true,
        type: true,
        createdAt: true,
      },
      where: whereClause,
    });

    const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const byType = payments.reduce(
      (acc, p) => {
        const type = p.type || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + Number(p.amount);
        return acc;
      },
      {} as Record<string, number>
    );

    const trend = payments.map((p) => ({
      period: p.createdAt.toISOString().split('T')[0],
      amount: Number(p.amount),
    }));

    const aggregatedTrend = Object.values(
      trend.reduce(
        (acc, item) => {
          if (!acc[item.period]) {
            acc[item.period] = { period: item.period, amount: 0 };
          }
          acc[item.period].amount += Number(item.amount);
          return acc;
        },
        {} as Record<string, { period: string; amount: number }>
      )
    ).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      success: true,
      data: {
        totalRevenue,
        byType,
        trend: aggregatedTrend,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error fetching revenue analytics');
    next(error);
  }
};

export const getUserGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const whereClause: Prisma.UserWhereInput = {};
    if (query.from || query.to) {
      whereClause.createdAt = {};
      if (query.from) whereClause.createdAt.gte = new Date(query.from);
      if (query.to) whereClause.createdAt.lte = new Date(query.to);
    }

    const users = await prisma.user.findMany({
      select: {
        role: true,
        createdAt: true,
      },
      where: whereClause,
    });

    const totalUsers = users.length;

    const byRole = users.reduce(
      (acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const trend = users.map((u) => ({
      period: u.createdAt.toISOString().split('T')[0],
      count: 1,
    }));

    const aggregatedTrend = Object.values(
      trend.reduce(
        (acc, item) => {
          if (!acc[item.period]) {
            acc[item.period] = { period: item.period, count: 0 };
          }
          acc[item.period].count += item.count;
          return acc;
        },
        {} as Record<string, { period: string; count: number }>
      )
    ).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      success: true,
      data: {
        totalUsers,
        byRole,
        trend: aggregatedTrend,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error fetching user growth analytics');
    next(error);
  }
};

export const getProviderPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const providers = await prisma.providerProfile.findMany({
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        specialty: true,
        rating: true,
      },
    });

    const providerUserIds = providers.map((p) => p.userId);

    const appointmentWhereClause: Prisma.AppointmentWhereInput = {
      providerId: { in: providerUserIds },
    };
    if (query.from || query.to) {
      appointmentWhereClause.createdAt = {};
      if (query.from) appointmentWhereClause.createdAt.gte = new Date(query.from);
      if (query.to) appointmentWhereClause.createdAt.lte = new Date(query.to);
    }

    const [appointmentCounts, completedCounts] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['providerId'],
        where: appointmentWhereClause,
        _count: { id: true },
      }),
      prisma.appointment.groupBy({
        by: ['providerId'],
        where: {
          ...appointmentWhereClause,
          status: 'COMPLETED',
        },
        _count: { id: true },
      }),
    ]);

    const appointmentCountMap = new Map(appointmentCounts.map((r) => [r.providerId, r._count.id]));
    const completedCountMap = new Map(completedCounts.map((r) => [r.providerId, r._count.id]));

    const providerStats = providers.map((provider) => ({
      providerId: provider.id,
      name: `${provider.firstName} ${provider.lastName}`.trim(),
      specialty: provider.specialty || null,
      appointmentCount: appointmentCountMap.get(provider.userId) || 0,
      completedCount: completedCountMap.get(provider.userId) || 0,
      rating: provider.rating ? Number(provider.rating) : null,
    }));

    res.json({
      success: true,
      data: {
        providers: providerStats,
        total: providerStats.length,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error fetching provider performance');
    next(error);
  }
};

export const getPharmacyMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const [totalPharmacies, verifiedPharmacies] = await Promise.all([
      prisma.pharmacyProfile.count(),
      prisma.pharmacyProfile.count({ where: { isVerified: true } }),
    ]);

    const orderWhereClause: Prisma.PharmacyOrderWhereInput = {};
    if (query.from || query.to) {
      orderWhereClause.createdAt = {};
      if (query.from) orderWhereClause.createdAt.gte = new Date(query.from);
      if (query.to) orderWhereClause.createdAt.lte = new Date(query.to);
    }

    const orders = await prisma.pharmacyOrder.findMany({
      select: {
        status: true,
        totalAmount: true,
      },
      where: orderWhereClause,
    });

    const totalOrders = orders.length;

    const ordersByStatus = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalOrderValue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    res.json({
      success: true,
      data: {
        totalPharmacies,
        verifiedPharmacies,
        totalOrders,
        ordersByStatus,
        totalOrderValue,
      },
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error fetching pharmacy metrics');
    next(error);
  }
};
