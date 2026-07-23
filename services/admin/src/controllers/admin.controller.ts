import { Request, Response, NextFunction } from 'express';
import { prisma } from '@ricton/db';
import { successResponse } from '@ricton/shared';
import {
  AdminUserListQuerySchema,
  AdminUpdateUserStatusSchema,
  AdminVerifyProviderSchema,
  AdminHospitalCreateSchema,
  AdminAuditLogQuerySchema,
  AdminAnalyticsQuerySchema,
} from '../schemas/admin.schema';
import { NotFoundError, ForbiddenError, ValidationError } from '@ricton/shared';

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = AdminUserListQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid query parameters', queryResult.error.errors);
    }

    const { page: pageStr, limit: limitStr, role, status, search } = queryResult.data;
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (role) whereClause.role = role;
    if (status) whereClause.status = status;
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
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
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bodyResult = AdminUpdateUserStatusSchema.safeParse(req.body);

    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', bodyResult.error.errors);
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
          ...(reason && { metadata: { ...user.metadata, suspensionReason: reason } }),
        },
        select: {
          id: true,
          email: true,
          status: true,
          updatedAt: true,
        },
      });

      // Create audit log within same transaction
      await tx.auditLog.create({
        data: {
          userId: req.user?.userId || 'system',
          action: 'USER_STATUS_UPDATE',
          resource: 'User',
          resourceId: id,
          details: { previousStatus: user.status, newStatus: status, reason },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });

      return updated;
    });

    res.status(200).json(successResponse(updatedUser));
  } catch (error) {
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
      data: { isVerified: true, status: 'ACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || 'system',
        action: 'USER_VERIFIED',
        resource: 'User',
        resourceId: id,
        details: { email: user.email, phone: user.phone },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res
      .status(200)
      .json(successResponse({ message: 'User verified successfully', user: updatedUser }));
  } catch (error) {
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
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          documents: {
            select: {
              type: true,
              url: true,
              status: true,
              uploadedAt: true,
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
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      specialty: p.specialty,
      licenseNumber: p.licenseNumber,
      submittedAt: p.createdAt.toISOString(),
      documents: p.documents.map((d) => ({
        type: d.type,
        url: d.url,
        status: d.status,
      })),
    }));

    res.status(200).json(
      successResponse({
        providers: formattedProviders,
        meta: { total, page, limit },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const verifyProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const bodyResult = AdminVerifyProviderSchema.safeParse(req.body);

    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', bodyResult.error.errors);
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
          verifiedAt: verified ? new Date() : null,
          verificationNotes: notes,
        },
      });

      await tx.user.update({
        where: { id: provider.userId },
        data: {
          isVerified: verified,
          // Only set to ACTIVE if transitioning from PENDING, don't overwrite SUSPENDED/DEACTIVATED
          status: verified && provider.user.status === 'PENDING' ? 'ACTIVE' : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.userId || 'system',
          action: verified ? 'PROVIDER_VERIFIED' : 'PROVIDER_REJECTED',
          resource: 'ProviderProfile',
          resourceId: id,
          details: { notes, providerEmail: provider.user.email },
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
  } catch (error) {
    next(error);
  }
};

export const listHospitals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(successResponse(hospitals));
  } catch (error) {
    next(error);
  }
};

export const createHospital = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyResult = AdminHospitalCreateSchema.safeParse(req.body);

    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', bodyResult.error.errors);
    }

    const hospitalData = bodyResult.data;

    const hospital = await prisma.hospital.create({
      data: hospitalData,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || 'system',
        action: 'HOSPITAL_CREATED',
        resource: 'Hospital',
        resourceId: hospital.id,
        details: { name: hospital.name },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res.status(201).json(successResponse(hospital));
  } catch (error) {
    next(error);
  }
};

export const getHospitalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        departments: true,
        staff: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                role: true,
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
  } catch (error) {
    next(error);
  }
};

export const updateHospital = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Validate request body with update schema
    const bodyResult = AdminHospitalUpdateSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError('Invalid request body', bodyResult.error.errors);
    }

    const hospital = await prisma.hospital.update({
      where: { id },
      data: bodyResult.data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || 'system',
        action: 'HOSPITAL_UPDATED',
        resource: 'Hospital',
        resourceId: id,
        details: { name: hospital.name },
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res.status(200).json(successResponse(hospital));
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = AdminAuditLogQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid query parameters', queryResult.error.errors);
    }

    const { page: pageStr, limit: limitStr, userId, action, startDate, endDate } = queryResult.data;
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (userId) whereClause.userId = userId;
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
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = AdminAnalyticsQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError('Invalid query parameters', queryResult.error.errors);
    }

    // period is unused, but we parse it to validate

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
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        appointments: {
          where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
          select: { id: true },
        },
      },
      orderBy: {
        appointments: {
          _count: 'desc',
        },
      },
    });

    const topProvidersFormatted = topProviders.map((p) => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      appointmentsCount: p.appointments.length,
      revenue: 0, // Would need to calculate from appointments
      rating: null, // Would need ratings model
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
  } catch (error) {
    next(error);
  }
};
