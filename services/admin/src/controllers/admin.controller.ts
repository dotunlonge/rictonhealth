import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import { successResponse, NotFoundError, ValidationError, ErrorDetails } from '@ricton/shared';
import {
  AdminUserListQuerySchema,
  AdminUpdateUserStatusSchema,
  AdminVerifyProviderSchema,
  AdminHospitalCreateSchema,
  AdminHospitalUpdateSchema,
  AdminAuditLogQuerySchema,
  AdminAnalyticsQuerySchema,
} from '../schemas/admin.schema';

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queryResult = AdminUserListQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError(
        'Invalid query parameters',
        queryResult.error.errors as unknown as ErrorDetails
      );
    }

    const { page: pageStr, limit: limitStr, role, status, search } = queryResult.data;
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (role) whereClause.role = role as UserRole;
    if (status) whereClause.status = status as UserStatus;
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patientProfile: true,
          providerProfile: true,
          pharmacyProfile: true,
        },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.patientProfile?.firstName || user.providerProfile?.firstName || 'N/A',
      lastName: user.patientProfile?.lastName || user.providerProfile?.lastName || 'N/A',
      role: user.role,
      status: user.status,
      isVerified:
        user.emailVerified || user.phoneVerified || user.providerProfile?.isVerified || false,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    }));

    res.status(200).json(
      successResponse({
        users: formattedUsers,
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
        patientProfile: true,
        providerProfile: true,
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
      throw new ValidationError(
        'Invalid request body',
        bodyResult.error.errors as unknown as ErrorDetails
      );
    }

    const { status, reason } = bodyResult.data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { status: status as UserStatus },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user?.userId || null,
          action: `USER_STATUS_UPDATED_${status}`,
          resourceType: 'User',
          resourceId: id,
          metadata: { reason, previousStatus: user.status, newStatus: status },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });

      return updated;
    });

    res.status(200).json(
      successResponse({
        message: `User status updated to ${status}`,
        user: updatedUser,
      })
    );
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
      data: { emailVerified: true, phoneVerified: true, status: 'ACTIVE' },
    });

    res.status(200).json(
      successResponse({
        message: 'User verified successfully',
        user: updatedUser,
      })
    );
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
        skip,
        take: limit,
      }),
      prisma.providerProfile.count({ where: { isVerified: false } }),
    ]);

    const formattedProviders = providers.map((p) => ({
      id: p.id,
      userId: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      specialty: p.specialty || 'General',
      licenseNumber: p.licenseNumber || 'N/A',
      submittedAt: p.idVerifiedAt ? p.idVerifiedAt.toISOString() : new Date().toISOString(),
      documents: Array.isArray(p.documents)
        ? (p.documents as unknown as Array<Record<string, unknown>>).map((d) => ({
            type: (d.type as string) || 'LICENSE',
            url: (d.url as string) || '',
            status: (d.status as string) || 'PENDING',
          }))
        : [],
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
      throw new ValidationError(
        'Invalid request body',
        bodyResult.error.errors as unknown as ErrorDetails
      );
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
        },
      });

      await tx.user.update({
        where: { id: provider.userId },
        data: {
          status: verified && provider.user.status === 'PENDING' ? 'ACTIVE' : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user?.userId || null,
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
      throw new ValidationError(
        'Invalid request body',
        bodyResult.error.errors as unknown as ErrorDetails
      );
    }

    const hospitalData = bodyResult.data;

    const hospital = await prisma.hospital.create({
      data: hospitalData,
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.userId || null,
        action: 'HOSPITAL_CREATED',
        resourceType: 'Hospital',
        resourceId: hospital.id,
        metadata: { name: hospital.name },
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
        providers: true,
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

    const bodyResult = AdminHospitalUpdateSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(
        'Invalid request body',
        bodyResult.error.errors as unknown as ErrorDetails
      );
    }

    const hospital = await prisma.hospital.update({
      where: { id },
      data: bodyResult.data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.userId || null,
        action: 'HOSPITAL_UPDATED',
        resourceType: 'Hospital',
        resourceId: id,
        metadata: { name: hospital.name },
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
      throw new ValidationError(
        'Invalid query parameters',
        queryResult.error.errors as unknown as ErrorDetails
      );
    }

    const { page: pageStr, limit: limitStr, userId, action, startDate, endDate } = queryResult.data;
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (userId) whereClause.actorId = userId;
    if (action) whereClause.action = action;
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) (whereClause.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (whereClause.createdAt as Record<string, unknown>).lte = new Date(endDate);
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
      throw new ValidationError(
        'Invalid query parameters',
        queryResult.error.errors as unknown as ErrorDetails
      );
    }

    const [totalUsers, totalProviders, totalHospitals, totalAppointments, activeSubscriptions] =
      await Promise.all([
        prisma.user.count(),
        prisma.providerProfile.count(),
        prisma.hospital.count(),
        prisma.appointment.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      ]);

    const payments = await prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    });

    const totalRevenue = payments._sum.amount ? Number(payments._sum.amount) : 0;

    const topProviders = await prisma.providerProfile.findMany({
      take: 10,
    });

    const topProvidersFormatted = topProviders.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      appointmentsCount: 0,
      revenue: 0,
      rating: p.rating ? Number(p.rating) : null,
    }));

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
