import { Request, Response, NextFunction } from 'express';
import { prisma } from '@ricton/db';
import { AppError, errorResponse, logger } from '@ricton/shared';
import { z } from 'zod';

const RangeQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', '12m', 'all']).default('30d'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const getOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalPatients, totalProviders, totalPharmacists, totalHospitals] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'PATIENT' } }),
        prisma.user.count({ where: { role: 'PROVIDER' } }),
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
        totalRevenue: payments._sum.amount || 0,
        activeSubscriptions,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching overview analytics');
    next(error);
  }
};

export const getAppointmentsTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const appointments = await prisma.appointment.findMany({
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

    // Simple trend calculation - group by period
    const trend = appointments.map((apt) => ({
      period: apt.createdAt.toISOString().split('T')[0],
      count: 1,
    }));

    // Aggregate by date
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
  } catch (error) {
    logger.error({ err: error }, 'Error fetching appointments trend');
    next(error);
  }
};

export const getRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const payments = await prisma.payment.findMany({
      select: {
        amount: true,
        type: true,
        createdAt: true,
      },
      where: { status: 'SUCCESS' },
    });

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const byType = payments.reduce(
      (acc, p) => {
        const type = p.type || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + p.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const trend = payments.map((p) => ({
      period: p.createdAt.toISOString().split('T')[0],
      amount: p.amount,
    }));

    // Aggregate by date
    const aggregatedTrend = Object.values(
      trend.reduce(
        (acc, item) => {
          if (!acc[item.period]) {
            acc[item.period] = { period: item.period, amount: 0 };
          }
          acc[item.period].amount += item.amount;
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
  } catch (error) {
    logger.error({ err: error }, 'Error fetching revenue analytics');
    next(error);
  }
};

export const getUserGrowth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const users = await prisma.user.findMany({
      select: {
        role: true,
        createdAt: true,
      },
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

    // Aggregate by date
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
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user growth analytics');
    next(error);
  }
};

export const getProviderPerformance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const providers = await prisma.user.findMany({
      where: { role: 'PROVIDER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profile: {
          select: {
            specialty: true,
          },
        },
      },
    });

    const providerStats = await Promise.all(
      providers.map(async (provider) => {
        const [appointmentCount, completedCount] = await Promise.all([
          prisma.appointment.count({ where: { providerId: provider.id } }),
          prisma.appointment.count({
            where: { providerId: provider.id, status: 'COMPLETED' },
          }),
        ]);

        const reviews = await prisma.review.findMany({
          where: { providerId: provider.id },
          select: { rating: true },
        });

        const rating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;

        return {
          providerId: provider.id,
          name: `${provider.firstName} ${provider.lastName}`.trim(),
          specialty: provider.profile?.specialty || null,
          appointmentCount,
          completedCount,
          rating,
        };
      })
    );

    res.json({
      success: true,
      data: {
        providers: providerStats,
        total: providerStats.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching provider performance');
    next(error);
  }
};

export const getPharmacyMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RangeQuerySchema.parse(req.query);

    const [totalPharmacies, verifiedPharmacies] = await Promise.all([
      prisma.user.count({ where: { role: 'PHARMACIST' } }),
      prisma.user.count({ where: { role: 'PHARMACIST', isVerified: true } }),
    ]);

    const orders = await prisma.order.findMany({
      select: {
        status: true,
        totalAmount: true,
      },
    });

    const totalOrders = orders.length;

    const ordersByStatus = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalOrderValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

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
  } catch (error) {
    logger.error({ err: error }, 'Error fetching pharmacy metrics');
    next(error);
  }
};
