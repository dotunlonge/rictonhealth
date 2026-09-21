import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  prisma,
  UserRole,
  UserStatus,
  AppointmentStatus,
  Prisma,
  ensureDoctorsSeeded,
  seedDoctors,
} from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  getCached,
  setCached,
  invalidateCache,
  makeCacheKey,
  AppError,
} from '@ricton/shared';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET_NAME, S3_REGION } from '../config/s3';

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;
    const role = userPayload.role;

    let profileInclude: Record<string, boolean> = {};
    if (role === UserRole.PATIENT) profileInclude = { patientProfile: true };
    else if (role === UserRole.CONSULTANT) profileInclude = { providerProfile: true };
    else if (role === UserRole.PHARMACIST) profileInclude = { pharmacyProfile: true };
    else if (role === UserRole.HOSPITAL_ADMIN) profileInclude = { hospital: true };

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
        bankDetails: true,
        hospitalId: true,
        createdAt: true,
        ...profileInclude,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const activeProfile =
      (user as any).patientProfile ||
      (user as any).providerProfile ||
      (user as any).pharmacyProfile ||
      {};
    const formatted = {
      ...user,
      firstName:
        activeProfile.firstName || (user as any).hospital?.name || user.email?.split('@')[0],
      lastName: activeProfile.lastName || '',
      avatarUrl: activeProfile.avatarUrl || (user as any).hospital?.logoUrl || null,
    };

    res.status(200).json(successResponse(formatted));
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

    const hospital = adminUser?.hospital;

    if (!hospital) {
      throw new NotFoundError(
        'No hospital organization is associated with your account. Please complete hospital onboarding.'
      );
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

export const getPatientDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can access the patient dashboard');
    }

    const userId = userPayload.userId;

    const [totalAppointments, pendingAppointments, completedAppointments, upcomingAppointments] =
      await Promise.all([
        prisma.appointment.count({
          where: { patientId: userId },
        }),
        prisma.appointment.count({
          where: { patientId: userId, status: AppointmentStatus.PENDING },
        }),
        prisma.appointment.count({
          where: { patientId: userId, status: AppointmentStatus.COMPLETED },
        }),
        prisma.appointment.findMany({
          where: { patientId: userId, scheduledAt: { gte: new Date() } },
          take: 5,
          orderBy: { scheduledAt: 'asc' },
          include: {
            provider: {
              select: {
                id: true,
                email: true,
                phone: true,
                providerProfile: true,
              },
            },
          },
        }),
      ]);

    res.status(200).json(
      successResponse({
        stats: {
          totalAppointments,
          pendingAppointments,
          completedAppointments,
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

    if (role === UserRole.PATIENT) {
      const data: Record<string, unknown> = {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        avatarUrl: updateData.avatarUrl,
        dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined,
        gender: updateData.gender,
        bloodType: updateData.bloodType,
        allergies: updateData.allergies,
      };
      // Clean undefined keys
      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
      // Upsert: OAuth/admin-provisioned accounts may have no profile row yet;
      // a plain update would 500 with P2025.
      await prisma.patientProfile.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          firstName: (data.firstName as string) ?? '',
          lastName: (data.lastName as string) ?? '',
          ...(data as Record<string, string>),
        },
      });
    } else if (role === UserRole.CONSULTANT) {
      const data: Record<string, unknown> = {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        avatarUrl: updateData.avatarUrl,
        specialty: updateData.specialty,
        consultationFee: updateData.consultationFee,
        title: updateData.title,
        licenseNumber: updateData.licenseNumber,
      };
      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
      await prisma.providerProfile.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          firstName: (data.firstName as string) ?? '',
          lastName: (data.lastName as string) ?? '',
          ...(data as Record<string, string>),
        },
      });
      await invalidateCache('providers*');
    } else if (role === UserRole.PHARMACIST) {
      const data: Record<string, unknown> = {
        pharmacyName: updateData.pharmacyName,
      };
      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
      // Pharmacists never get a profile row at registration (password or
      // OAuth), so update-always would 500 their very first settings save.
      await prisma.pharmacyProfile.upsert({
        where: { userId },
        update: data,
        create: {
          userId,
          pharmacyName: (data.pharmacyName as string) ?? '',
          ...(data as Record<string, string>),
        },
      });
    } else if (role === UserRole.HOSPITAL_ADMIN) {
      // If hospital facility data is submitted during onboarding or settings update
      if (
        updateData.hospitalName ||
        updateData.registrationNumber ||
        updateData.cacNumber ||
        updateData.departments ||
        updateData.address
      ) {
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { hospital: true },
        });
        const hospitalName =
          updateData.hospitalName || currentUser?.hospital?.name || 'Hospital Facility';
        const hospitalAddress = updateData.address
          ? typeof updateData.address === 'string'
            ? { address: updateData.address, city: updateData.city, state: updateData.state }
            : updateData.address
          : currentUser?.hospital?.address;
        const departments = updateData.departments || currentUser?.hospital?.departments || [];
        const documents = {
          licenseFileUploaded: Boolean(
            updateData.licenseFileUploaded || updateData.documents?.licenseFileUploaded
          ),
          cacFileUploaded: Boolean(
            updateData.cacFileUploaded || updateData.documents?.cacFileUploaded
          ),
          ...(typeof updateData.documents === 'object' ? updateData.documents : {}),
        };

        if (currentUser?.hospitalId) {
          await prisma.hospital.update({
            where: { id: currentUser.hospitalId },
            data: {
              name: hospitalName,
              registrationNumber:
                updateData.registrationNumber || updateData.cacNumber || undefined,
              phone: updateData.emergencyPhone || updateData.phone || undefined,
              email: updateData.supportEmail || updateData.email || undefined,
              address: hospitalAddress as any,
              departments: departments as any,
              documents: documents as any,
              onboardingComplete: true,
            },
          });
        } else {
          const newHospital = await prisma.hospital.create({
            data: {
              name: hospitalName,
              registrationNumber:
                updateData.registrationNumber || updateData.cacNumber || undefined,
              phone: updateData.emergencyPhone || updateData.phone || undefined,
              email: updateData.supportEmail || updateData.email || undefined,
              address: hospitalAddress as any,
              departments: departments as any,
              documents: documents as any,
              onboardingComplete: true,
            },
          });
          await prisma.user.update({
            where: { id: userId },
            data: {
              hospitalId: newHospital.id,
              status: currentUser?.status === UserStatus.PENDING ? UserStatus.ACTIVE : undefined,
            },
          });
        }
      }
    }

    // Sync bank details if provided
    const incomingBank =
      updateData.bankDetails ||
      (updateData.bankName
        ? {
            bankName: updateData.bankName,
            bankCode: updateData.bankCode,
            accountNumber: updateData.accountNumber,
            accountName: updateData.accountName,
            settlementFrequency: updateData.settlementFrequency || 'INSTANT',
          }
        : null) ||
      (updateData.hospitalAdminProfile?.metadata?.bankName
        ? {
            bankName: updateData.hospitalAdminProfile.metadata.bankName,
            accountNumber: updateData.hospitalAdminProfile.metadata.accountNumber,
            accountName: updateData.hospitalAdminProfile.metadata.accountName,
          }
        : updateData.providerProfile?.metadata?.bankName
          ? {
              bankName: updateData.providerProfile.metadata.bankName,
              accountNumber: updateData.providerProfile.metadata.accountNumber,
              accountName: updateData.providerProfile.metadata.accountName,
            }
          : updateData.pharmacyProfile?.metadata?.bankName
            ? {
                bankName: updateData.pharmacyProfile.metadata.bankName,
                accountNumber: updateData.pharmacyProfile.metadata.accountNumber,
                accountName: updateData.pharmacyProfile.metadata.accountName,
              }
            : null);

    if (incomingBank) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          bankDetails: incomingBank,
        },
      });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        providerProfile: true,
        pharmacyProfile: true,
        hospital: true,
      },
    });

    if (fullUser) {
      delete (fullUser as any).passwordHash;
      delete (fullUser as any).twoFactorSecret;
      delete (fullUser as any).tokenVersion;
    }

    const activeProfile = (fullUser?.patientProfile ||
      fullUser?.providerProfile ||
      fullUser?.pharmacyProfile ||
      {}) as Record<string, unknown>;
    const formatted = {
      ...fullUser,
      firstName:
        activeProfile.firstName || fullUser?.hospital?.name || fullUser?.email?.split('@')[0],
      lastName: activeProfile.lastName || '',
      avatarUrl: activeProfile.avatarUrl || fullUser?.hospital?.logoUrl || null,
    };

    res.status(200).json(successResponse(formatted));
  } catch (error: unknown) {
    next(error);
  }
};

export const getAvatarUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { fileType } = req.body;
    if (!fileType) throw new ValidationError('fileType is required (e.g. image/jpeg)');
    if (!S3_BUCKET_NAME) {
      throw new AppError('Avatar object storage is not configured', 503, 'SERVICE_NOT_CONFIGURED');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileType)) {
      throw new ValidationError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const key = `avatars/${userPayload.userId}/${crypto.randomUUID()}.${extensionByType[fileType]}`;
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

    res.status(200).json(
      successResponse({
        uploadUrl: presignedUrl,
        publicUrl: `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${key}`,
        maxSizeBytes: 2 * 1024 * 1024, // 2MB
      })
    );
  } catch (error: unknown) {
    next(error);
  }
};

export const getProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { specialty, name, search, limit = 20, offset = 0 } = req.query;
    const searchTerm = (name || search) as string | undefined;

    // Self-healing: in production/dev, auto-provision if doctors or weekly schedules are missing
    if (process.env.NODE_ENV !== 'test') {
      await ensureDoctorsSeeded(prisma);
    }

    const isProd = process.env.NODE_ENV === 'production';
    const where: Prisma.ProviderProfileWhereInput = {
      ...(isProd ? { isVerified: true } : {}),
      ...(specialty && { specialty: { equals: String(specialty), mode: 'insensitive' } }),
      ...(searchTerm && {
        OR: [
          { firstName: { contains: String(searchTerm), mode: 'insensitive' } },
          { lastName: { contains: String(searchTerm), mode: 'insensitive' } },
          { specialty: { contains: String(searchTerm), mode: 'insensitive' } },
          { bio: { contains: String(searchTerm), mode: 'insensitive' } },
        ],
      }),
    };

    const cacheKey = makeCacheKey([
      'providers',
      specialty as string | undefined,
      searchTerm,
      limit as string | undefined,
      offset as string | undefined,
    ]);
    const cached = await getCached<{ providers: any[]; total: number }>(cacheKey, {
      ttlSeconds: 300,
    });
    // Critical: Never serve empty array from cache if Redis held negative cache
    if (cached && Array.isArray(cached.providers) && cached.providers.length > 0) {
      return res.status(200).json(successResponse(cached));
    }

    let [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        include: { hospital: true },
      }),
      prisma.providerProfile.count({ where }),
    ]);

    // Self-healing fallback: If count is 0 and no filters were passed in dev/prod, seed doctors and re-query
    if (
      process.env.NODE_ENV !== 'test' &&
      total === 0 &&
      !specialty &&
      !searchTerm &&
      Number(offset) === 0
    ) {
      await seedDoctors(prisma);
      [providers, total] = await Promise.all([
        prisma.providerProfile.findMany({
          where,
          take: Number(limit),
          skip: Number(offset),
          include: { hospital: true },
        }),
        prisma.providerProfile.count({ where }),
      ]);
    }

    const result = { providers, total, limit: Number(limit), offset: Number(offset) };
    if (result.providers.length > 0) {
      await setCached(cacheKey, result, { ttlSeconds: 300 });
    }

    res.status(200).json(successResponse(result));
  } catch (error: unknown) {
    next(error);
  }
};

export const getProviderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const provider = await prisma.providerProfile.findFirst({
      where: {
        OR: [{ userId: id }, { id }],
      },
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

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const allowedListRoles = new Set<UserRole>([
      UserRole.CONSULTANT,
      UserRole.HOSPITAL_ADMIN,
      UserRole.SUPER_ADMIN,
    ]);
    if (!allowedListRoles.has(userPayload.role)) {
      throw new ForbiddenError('Only clinical staff can list patient records');
    }
    const { limit = 50, offset = 0, search } = req.query;

    let adminHospitalId: string | undefined;
    if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
      const admin = await prisma.user.findUnique({
        where: { id: userPayload.userId },
        select: { hospitalId: true },
      });
      if (!admin?.hospitalId) {
        throw new ForbiddenError('Hospital administrator is not assigned to a hospital');
      }
      adminHospitalId = admin.hospitalId;
    }

    const where: Prisma.UserWhereInput = {
      role: UserRole.PATIENT,
      ...(userPayload.role === UserRole.CONSULTANT && {
        appointmentsAsPatient: { some: { providerId: userPayload.userId } },
      }),
      ...(adminHospitalId && { hospitalId: adminHospitalId }),
      ...(search && {
        OR: [
          { email: { contains: String(search), mode: 'insensitive' } },
          { phone: { contains: String(search), mode: 'insensitive' } },
          {
            patientProfile: {
              OR: [
                { firstName: { contains: String(search), mode: 'insensitive' } },
                { lastName: { contains: String(search), mode: 'insensitive' } },
              ],
            },
          },
        ],
      }),
    };

    const [patients, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { createdAt: 'desc' },
        include: {
          patientProfile: true,
          appointmentsAsPatient: {
            where:
              userPayload.role === UserRole.CONSULTANT
                ? { providerId: userPayload.userId }
                : adminHospitalId
                  ? { hospitalId: adminHospitalId }
                  : undefined,
            take: 1,
            orderBy: { scheduledAt: 'desc' },
            include: {
              provider: {
                select: {
                  providerProfile: { select: { firstName: true, lastName: true, title: true } },
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formatted = patients.map((p) => {
      const profile = p.patientProfile;
      const latestAppt = p.appointmentsAsPatient[0];
      const doctorName = latestAppt?.provider?.providerProfile
        ? `${latestAppt.provider.providerProfile.title || ''} ${latestAppt.provider.providerProfile.firstName || ''} ${latestAppt.provider.providerProfile.lastName || ''}`.trim() ||
          null
        : null;

      let age: number | null = null;
      if (profile?.dateOfBirth) {
        const birthYear = new Date(profile.dateOfBirth).getFullYear();
        if (!isNaN(birthYear)) age = new Date().getFullYear() - birthYear;
      }

      return {
        id: p.id,
        firstName: profile?.firstName || null,
        lastName: profile?.lastName || null,
        email: p.email,
        phone: p.phone,
        patientProfile: profile,
        age,
        gender: profile?.gender || null,
        latestProvider: doctorName,
        status: p.status,
        latestAppointment: latestAppt
          ? {
              id: latestAppt.id,
              scheduledAt: latestAppt.scheduledAt,
              status: latestAppt.status,
              type: latestAppt.type,
            }
          : null,
        createdAt: p.createdAt,
      };
    });

    res.status(200).json(successResponse({ patients: formatted, total }));
  } catch (error: unknown) {
    next(error);
  }
};

export const getPatientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    // Authorization: patient may read self; consultant must have an appointment
    // relationship; hospital admin must share hospitalId; super admin allowed.
    if (userPayload.role === UserRole.PATIENT && userPayload.userId !== id) {
      throw new ForbiddenError('Patients may only access their own record');
    }
    if (
      userPayload.role !== UserRole.PATIENT &&
      userPayload.role !== UserRole.CONSULTANT &&
      userPayload.role !== UserRole.HOSPITAL_ADMIN &&
      userPayload.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('You are not authorized to view patient records');
    }
    if (userPayload.role === UserRole.CONSULTANT) {
      const relationship = await prisma.appointment.findFirst({
        where: { patientId: id, providerId: userPayload.userId },
        select: { id: true },
      });
      if (!relationship) {
        throw new ForbiddenError('No clinical relationship with this patient');
      }
    }
    if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
      const [adminUser, patientUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: userPayload.userId }, select: { hospitalId: true } }),
        prisma.user.findUnique({ where: { id }, select: { hospitalId: true, role: true } }),
      ]);
      if (!patientUser || patientUser.role !== UserRole.PATIENT) {
        throw new NotFoundError('Patient not found');
      }
      if (!adminUser?.hospitalId || adminUser.hospitalId !== patientUser.hospitalId) {
        throw new ForbiddenError('Hospital scope mismatch for this patient record');
      }
    }

    const patient = await prisma.user.findFirst({
      where: {
        id,
        role: UserRole.PATIENT,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        hospitalId: true,
        createdAt: true,
        patientProfile: true,
        prescriptionsAsPatient: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
          },
        },
        appointmentsAsPatient: {
          take: 10,
          orderBy: { scheduledAt: 'desc' },
          include: {
            provider: {
              select: {
                id: true,
                providerProfile: { select: { firstName: true, lastName: true, title: true } },
              },
            },
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    res.status(200).json(successResponse(patient));
  } catch (error: unknown) {
    next(error);
  }
};
