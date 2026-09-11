import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma, UserRole, UserStatus } from '@ricton/db';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ConflictError,
  ErrorDetails,
} from '@ricton/shared';
import {
  AdminUserListQuerySchema,
  AdminUpdateUserStatusSchema,
  AdminVerifyProviderSchema,
  AdminProvisionUserSchema,
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

const sanitizeAdminUser = (user: Record<string, unknown>) => {
  const {
    // stripped: never leave the service boundary
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    passwordHash,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    twoFactorSecret,
    ...safe
  } = user as Record<string, unknown> & {
    passwordHash?: unknown;
    twoFactorSecret?: unknown;
  };
  return safe;
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        oauthProvider: true,
        consentVersion: true,
        consentAt: true,
        lastLoginAt: true,
        twoFactorEnabled: true,
        tokenVersion: true,
        hospitalId: true,
        createdAt: true,
        updatedAt: true,
        patientProfile: true,
        providerProfile: true,
        pharmacyProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json(successResponse(sanitizeAdminUser(user as Record<string, unknown>)));
  } catch (error) {
    next(error);
  }
};

/**
 * Provision a privileged user (SUPER_ADMIN only, route-gated + active-gated).
 * The ONLY creation path for HOSPITAL_ADMIN, since public registration and
 * OAuth accept self-serve roles exclusively. Provisioned users start ACTIVE
 * with verified contact (admin identity-proofed at creation).
 */
export const provisionUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bodyResult = AdminProvisionUserSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new ValidationError(
        'Invalid request body',
        bodyResult.error.errors as unknown as ErrorDetails
      );
    }
    const { email, phone, password, role, hospitalId } = bodyResult.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])] },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictError('User already exists with this email or phone');
    }

    if (hospitalId) {
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { id: true },
      });
      if (!hospital) {
        throw new NotFoundError('Hospital not found');
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          phone,
          passwordHash,
          role: role as UserRole,
          status: UserStatus.ACTIVE,
          emailVerified: Boolean(email),
          phoneVerified: Boolean(phone),
          hospitalId: hospitalId || null,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          hospitalId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: req.user?.userId || null,
          action: 'USER_PROVISIONED',
          resourceType: 'User',
          resourceId: created.id,
          metadata: { role, hospitalId: hospitalId || null },
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });
      return created;
    });

    res
      .status(201)
      .json(successResponse(sanitizeAdminUser(user as unknown as Record<string, unknown>)));
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
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
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
        user: sanitizeAdminUser(updatedUser as unknown as Record<string, unknown>),
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
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(
      successResponse({
        message: 'User verified successfully',
        user: sanitizeAdminUser(updatedUser as unknown as Record<string, unknown>),
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
    const take = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const skip = Math.max(Number(req.query.offset) || 0, 0);
    const hospitals = await prisma.hospital.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
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
      data: {
        name: hospitalData.name,
        email: hospitalData.email,
        phone: hospitalData.phone,
        address: {
          line1: hospitalData.address,
          city: hospitalData.city,
          state: hospitalData.state,
          country: hospitalData.country,
        },
      },
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

    const existing = await prisma.hospital.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Hospital not found');

    const hospitalData = bodyResult.data;
    const currentAddress =
      existing.address && typeof existing.address === 'object' && !Array.isArray(existing.address)
        ? (existing.address as Record<string, unknown>)
        : {};
    const hasAddressUpdate = Boolean(
      hospitalData.address || hospitalData.city || hospitalData.state || hospitalData.country
    );

    const hospital = await prisma.hospital.update({
      where: { id },
      data: {
        name: hospitalData.name,
        email: hospitalData.email,
        phone: hospitalData.phone,
        ...(hasAddressUpdate
          ? {
              address: {
                ...currentAddress,
                ...(hospitalData.address ? { line1: hospitalData.address } : {}),
                ...(hospitalData.city ? { city: hospitalData.city } : {}),
                ...(hospitalData.state ? { state: hospitalData.state } : {}),
                ...(hospitalData.country ? { country: hospitalData.country } : {}),
              },
            }
          : {}),
      },
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

    // Real per-provider aggregates (single groupBy, no N+1, no full scans).
    const appointmentsByProvider = await prisma.appointment.groupBy({
      by: ['providerId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    const topProviderIds = appointmentsByProvider.map((g) => g.providerId);
    const topProfiles = topProviderIds.length
      ? await prisma.providerProfile.findMany({
          where: { userId: { in: topProviderIds } },
        })
      : [];
    const profileByUserId = new Map(topProfiles.map((p) => [p.userId, p]));
    const topProvidersFormatted = appointmentsByProvider.map((g) => {
      const p = profileByUserId.get(g.providerId);
      return {
        id: p?.id ?? g.providerId,
        name: p ? `${p.firstName} ${p.lastName}` : g.providerId,
        appointmentsCount: g._count.id,
        rating: p?.rating ? Number(p.rating) : null,
      };
    });

    // Bounded 30-day daily growth series (aggregate-only, no row hydration).
    const dayAgo30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [usersByDay, appointmentsByDay, revenueByDay] = await Promise.all([
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
        FROM "users" WHERE "createdAt" >= ${dayAgo30}
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT date_trunc('day', "scheduledAt") AS day, COUNT(*)::int AS count
        FROM "appointments" WHERE "scheduledAt" >= ${dayAgo30}
        GROUP BY 1 ORDER BY 1`,
      prisma.$queryRaw<Array<{ day: Date; total: unknown }>>`
        SELECT date_trunc('day', "createdAt") AS day, COALESCE(SUM("amount"), 0) AS total
        FROM "payments" WHERE "status" = 'SUCCESS' AND "createdAt" >= ${dayAgo30}
        GROUP BY 1 ORDER BY 1`,
    ]);
    const growthData = {
      userGrowth: usersByDay.map((r) => ({ date: r.day, count: Number(r.count) })),
      appointmentGrowth: appointmentsByDay.map((r) => ({ date: r.day, count: Number(r.count) })),
      revenueGrowth: revenueByDay.map((r) => ({ date: r.day, total: Number(r.total) })),
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
