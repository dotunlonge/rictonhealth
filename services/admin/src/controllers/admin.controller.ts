import { Request, Response, NextFunction } from 'express';
import { prisma, Prisma } from '@ricton/db';
import { successResponse } from '@ricton/shared';
import {
  AdminUserListQuerySchema,
  AdminUpdateUserStatusSchema,
  AdminVerifyProviderSchema,
  AdminHospitalCreateSchema,
  AdminHospitalUpdateSchema,
  AdminAuditLogQuerySchema,
  AdminAnalyticsQuerySchema,
} from '../schemas/admin.schema';
import { NotFoundError, ForbiddenError, ValidationError } from '@ricton/shared';

function mapZodError(errors: any[]): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  errors.forEach((err) => {
    const path = err.path.join('.');
    if (!details[path]) details[path] = [];
    details[path].push(err.message);
  });
  return details;
}

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = AdminUserListQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid query parameters', mapZodError(queryResult.error.errors));
    }

    const { page: pageStr, limit: limitStr, role, status, search } = queryResult.data;
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {};

    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    if (search) {
      whereClause.OR = [{ email: { contains: search, mode: 'insensitive' } }];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          patientProfile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          providerProfile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    res.status(200).json(
      successResponse({
        users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        providerProfile: true,
        hospital: true,
        pharmacyProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json(successResponse(user));
  } catch (error: unknown) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bodyResult = AdminUpdateUserStatusSchema.safeParse(req.body);

    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', mapZodError(bodyResult.error.errors));
    }

    const { status, reason } = bodyResult.data;

    // Prevent suspending super admins
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role === 'SUPER_ADMIN' && status !== 'ACTIVE') {
      throw new ForbiddenError('Cannot change status of super admin users');
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          status,
        },
        select: {
          id: true,
          email: true,
          status: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: (req as any).user?.userId || null,
          action: 'USER_STATUS_UPDATE',
          resourceType: 'User',
          resourceId: id,
          metadata: { previousStatus: user.status, newStatus: status, reason },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });

      return updated;
    });

    res.status(200).json(successResponse(updatedUser));
  } catch (error: unknown) {
    next(error);
  }
};

export const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user?.userId || null,
        action: 'USER_VERIFIED',
        resourceType: 'User',
        resourceId: id,
        metadata: { email: user.email, phone: user.phone },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res
      .status(200)
      .json(successResponse({ message: 'User verified successfully', user: updatedUser }));
  } catch (error: unknown) {
    next(error);
  }
};

export const getPendingProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where: { isVerified: false },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
          specialty: true,
          licenseNumber: true,
          createdAt: true,
          documents: true,
          user: {
            select: {
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.providerProfile.count({ where: { isVerified: false } }),
    ]);

    const formattedProviders = providers.map((p) => ({
      id: p.id,
      userId: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      specialty: p.specialty,
      licenseNumber: p.licenseNumber,
      submittedAt: p.createdAt.toISOString(),
      documents: Array.isArray(p.documents)
        ? p.documents.map((d: any) => ({
            type: (d as any).type,
            url: (d as any).url,
            status: (d as any).status,
          }))
        : [],
    }));

    res.status(200).json(
      successResponse({
        providers: formattedProviders,
        meta: { total, page, limit },
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const verifyProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bodyResult = AdminVerifyProviderSchema.safeParse(req.body);

    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', mapZodError(bodyResult.error.errors));
    }

    const { verified, notes } = bodyResult.data;

    const provider = await prisma.providerProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!provider) {
      throw new NotFoundError('Provider profile not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.providerProfile.update({
        where: { id },
        data: {
          isVerified: verified,
          idVerifiedAt: verified ? new Date() : null,
          verificationNotes: notes,
        },
      });

      await tx.user.update({
        where: { id: provider.userId },
        data: {
          status: verified && provider.user.status === 'PENDING' ? 'ACTIVE' : provider.user.status,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: (req as any).user?.userId || null,
          action: verified ? 'PROVIDER_VERIFIED' : 'PROVIDER_REJECTED',
          resourceType: 'ProviderProfile',
          resourceId: id,
          metadata: { notes, providerEmail: provider.user.email },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });
    });

    res.status(200).json(
      successResponse({
        message: verified ? 'Provider verified successfully' : 'Provider verification rejected',
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const listHospitals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(successResponse(hospitals));
  } catch (error: unknown) {
    next(error);
  }
};

export const createHospital = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyResult = AdminHospitalCreateSchema.safeParse(req.body);

    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', mapZodError(bodyResult.error.errors));
    }

    const hospitalData = bodyResult.data;

    const hospital = await prisma.hospital.create({
      data: hospitalData,
    });

    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user?.userId || null,
        action: 'HOSPITAL_CREATED',
        resourceType: 'Hospital',
        resourceId: hospital.id,
        metadata: { name: hospital.name },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res.status(201).json(successResponse(hospital));
  } catch (error: unknown) {
    next(error);
  }
};

export const getHospitalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            patientProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            providerProfile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!hospital) {
      throw new NotFoundError('Hospital not found');
    }

    res.status(200).json(successResponse(hospital));
  } catch (error: unknown) {
    next(error);
  }
};

export const updateHospital = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate request body with update schema
    const bodyResult = AdminHospitalUpdateSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', mapZodError(bodyResult.error.errors));
    }

    const hospital = await prisma.hospital.update({
      where: { id },
      data: bodyResult.data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: (req as any).user?.userId || null,
        action: 'HOSPITAL_UPDATED',
        resourceType: 'Hospital',
        resourceId: id,
        metadata: { name: hospital.name },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res.status(200).json(successResponse(hospital));
  } catch (error: unknown) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = AdminAuditLogQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid query parameters', mapZodError(queryResult.error.errors));
    }

    const { page: pageStr, limit: limitStr, userId, action, startDate, endDate } = queryResult.data;
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.AuditLogWhereInput = {};

    if (userId) whereClause.actorId = userId;
    if (action) whereClause.action = action;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    res.status(200).json(
      successResponse({
        logs,
        meta: { total, page, limit },
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = AdminAnalyticsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid query parameters', mapZodError(queryResult.error.errors));
    }

    // Get overview stats
    const [totalUsers, totalProviders, totalHospitals, totalAppointments, activeSubscriptions] =
      await Promise.all([
        prisma.user.count(),
        prisma.providerProfile.count(),
        prisma.hospital.count(),
        prisma.appointment.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      ]);

    // Calculate total revenue from successful payments
    const payments = await prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    });

    const totalRevenue = payments._sum.amount ? Number(payments._sum.amount) : 0;

    // Get top providers by appointments
    const topProviders = await prisma.providerProfile.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const topProvidersFormatted = topProviders.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      appointmentsCount: 0,
      revenue: 0, // Would need to calculate from appointments
      rating: p.rating ? Number(p.rating) : null,
    }));

    // Generate growth data (simplified - would use date ranges in production)
    const growthData = {
      userGrowth: [],
      appointmentGrowth: [],
      revenueGrowth: [],
    };

    res.status(200).json(
      successResponse({
        overview: {
          totalUsers,
          totalProviders,
          totalHospitals,
          totalAppointments,
          totalRevenue,
          activeSubscriptions,
        },
        growth: growthData,
        topProviders: topProvidersFormatted,
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};
