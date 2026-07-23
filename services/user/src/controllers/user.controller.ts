import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, UserStatus, AppointmentStatus, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  getCached,
  setCached,
  makeCacheKey,
  UserProfileSchema,
} from '@ricton/shared';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET_NAME } from '../config/s3';

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const role = userPayload.role;

    let profileInclude = {};
    if (role === UserRole.PATIENT) profileInclude = { patientProfile: true };
    else if (role === UserRole.CONSULTANT) profileInclude = { providerProfile: true };
    else if (role === UserRole.PHARMACIST) profileInclude = { pharmacyProfile: true };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        ...profileInclude,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const serializedUser = UserProfileSchema.parse(user);
    res.status(200).json(successResponse(serializedUser));
  } catch (error: unknown) {
    next(error);
  }
};

export const getHospitalDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.HOSPITAL_ADMIN) {
      throw new ForbiddenError('Only hospital admins can access the hospital dashboard');
    }

    // Resolve specific tenant hospital linked to the admin user
    const adminUser = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      include: { hospital: true },
    });

    let hospital = adminUser?.hospital;

    if (!hospital) {
      // Find fallback or create a default one for sandbox/onboarding mapping
      hospital = await prisma.hospital.findFirst();
      if (!hospital) {
        hospital = await prisma.hospital.create({
          data: {
            name: 'Ricton General Hospital',
            phone: '07012345678',
            email: 'admin@ricton.health',
            logoUrl: 'https://ricton.health/logo.png',
          },
        });
      }

      // Persist association to prevent unlinked reads on next calls
      await prisma.user.update({
        where: { id: userPayload.userId },
        data: { hospitalId: hospital.id },
      });
    }

    const doctorCount = await prisma.providerProfile.count({
      where: { hospitalId: hospital.id },
    });

    const appointmentCount = await prisma.appointment.count({
      where: { hospitalId: hospital.id },
    });

    const activePatientsCount = await prisma.user.count({
      where: { role: UserRole.PATIENT, status: UserStatus.ACTIVE, hospitalId: hospital.id },
    });

    res.status(200).json(
      successResponse({
        hospital,
        stats: {
          totalDoctors: doctorCount,
          totalAppointments: appointmentCount,
          activePatients: activePatientsCount,
        },
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const getProviderDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.CONSULTANT) {
      throw new ForbiddenError('Only consultants can access the provider dashboard');
    }

    const userId = userPayload.userId;

    const totalAppointments = await prisma.appointment.count({
      where: { providerId: userId },
    });

    const pendingAppointments = await prisma.appointment.count({
      where: { providerId: userId, status: AppointmentStatus.PENDING },
    });

    const completedAppointments = await prisma.appointment.count({
      where: { providerId: userId, status: AppointmentStatus.COMPLETED },
    });

    const aggregateEarnings = await prisma.providerEarning.aggregate({
      where: { providerId: userId },
      _sum: { amount: true },
    });

    const upcomingAppointments = await prisma.appointment.findMany({
      where: { providerId: userId, scheduledAt: { gte: new Date() } },
      take: 5,
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            phone: true,
            patientProfile: true,
          },
        },
      },
    });

    res.status(200).json(
      successResponse({
        stats: {
          totalAppointments,
          pendingAppointments,
          completedAppointments,
          totalEarnings: aggregateEarnings._sum.amount || 0.0,
        },
        upcomingAppointments,
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const updateCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const role = userPayload.role;
    const updateData = req.body;

    let updatedProfile;

    if (role === UserRole.PATIENT) {
      const data = {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined,
        gender: updateData.gender,
        bloodType: updateData.bloodType,
        allergies: updateData.allergies,
      };
      updatedProfile = await prisma.patientProfile.update({
        where: { userId },
        data,
      });
    } else if (role === UserRole.CONSULTANT) {
      const data = {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        specialty: updateData.specialty,
        consultationFee: updateData.consultationFee,
        title: updateData.title,
      };
      updatedProfile = await prisma.providerProfile.update({
        where: { userId },
        data,
      });
    } else if (role === UserRole.PHARMACIST) {
      const data = {
        pharmacyName: updateData.pharmacyName,
      };
      updatedProfile = await prisma.pharmacyProfile.update({
        where: { userId },
        data,
      });
    }

    res.status(200).json(successResponse(updatedProfile));
  } catch (error: unknown) {
    next(error);
  }
};

export const getAvatarUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { fileType } = req.body;
    if (!fileType) throw new ValidationError('fileType is required (e.g. image/jpeg)');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      throw new ValidationError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    const key = `avatars/${userPayload.userId}-${Date.now()}`;
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

    res.status(200).json(
      successResponse({
        uploadUrl: presignedUrl,
        publicUrl: `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${key}`,
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const getProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { specialty, name, limit = 20, offset = 0 } = req.query;

    const where: Prisma.ProviderProfileWhereInput = {
      isVerified: true,
      ...(specialty && { specialty: { equals: String(specialty), mode: 'insensitive' } }),
      ...(name && {
        OR: [
          { firstName: { contains: String(name), mode: 'insensitive' } },
          { lastName: { contains: String(name), mode: 'insensitive' } },
        ],
      }),
    };

    const cacheKey = makeCacheKey([
      'providers',
      specialty as string | undefined,
      name as string | undefined,
      limit as string | undefined,
      offset as string | undefined,
    ]);
    const cached = await getCached<{ providers: any[]; total: number }>(cacheKey, {
      ttlSeconds: 300,
    });
    if (cached) {
      return res.status(200).json(successResponse(cached));
    }

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        include: { hospital: true },
      }),
      prisma.providerProfile.count({ where }),
    ]);

    const result = { providers, total, limit: Number(limit), offset: Number(offset) };
    await setCached(cacheKey, result, { ttlSeconds: 300 });

    res.status(200).json(successResponse(result));
  } catch (error: unknown) {
    next(error);
  }
};

export const getProviderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: id }, // Assuming ID is the User ID, adjust if it's the profile ID
      include: { hospital: true, user: { select: { email: true, status: true } } },
    });

    if (!provider) throw new NotFoundError('Provider not found');
    res.status(200).json(successResponse(provider));
  } catch (error: unknown) {
    next(error);
  }
};

export const updateMedicalHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can update medical history');
    }

    const { medicalHistory } = req.body;

    // We expect it to match our JSON array schema
    const updatedProfile = await prisma.patientProfile.update({
      where: { userId: userPayload.userId },
      data: {
        medicalHistory: medicalHistory as Prisma.InputJsonValue,
      },
    });

    res.status(200).json(successResponse(updatedProfile.medicalHistory));
  } catch (error: unknown) {
    next(error);
  }
};
