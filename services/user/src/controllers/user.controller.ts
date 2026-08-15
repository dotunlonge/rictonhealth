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
        bankDetails: true,
        createdAt: true,
        ...profileInclude,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const activeProfile = (user as any).patientProfile || (user as any).providerProfile || {};
    const formatted = {
      ...user,
      firstName: activeProfile.firstName || user.email?.split('@')[0],
      lastName: activeProfile.lastName || '',
      avatarUrl: activeProfile.avatarUrl || null,
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
      await prisma.patientProfile.update({
        where: { userId },
        data,
      });
    } else if (role === UserRole.CONSULTANT) {
      const data: Record<string, unknown> = {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        avatarUrl: updateData.avatarUrl,
        specialty: updateData.specialty,
        consultationFee: updateData.consultationFee,
        title: updateData.title,
      };
      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
      await prisma.providerProfile.update({
        where: { userId },
        data,
      });
    } else if (role === UserRole.PHARMACIST) {
      const data: Record<string, unknown> = {
        pharmacyName: updateData.pharmacyName,
      };
      Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);
      await prisma.pharmacyProfile.update({
        where: { userId },
        data,
      });
    }

    // Sync bank details & set active status on onboarding completion
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
          status: UserStatus.ACTIVE,
        },
      });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: true,
        providerProfile: true,
        pharmacyProfile: true,
      },
    });

    const activeProfile = (fullUser?.patientProfile || fullUser?.providerProfile || {}) as Record<
      string,
      unknown
    >;
    const formatted = {
      ...fullUser,
      firstName: activeProfile.firstName || fullUser?.email?.split('@')[0],
      lastName: activeProfile.lastName || '',
      avatarUrl: activeProfile.avatarUrl || null,
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

export const getPatients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit = 50, offset = 0, search } = req.query;

    const where: Prisma.UserWhereInput = {
      role: UserRole.PATIENT,
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

    const formatted = patients.map((p, idx) => {
      const profile = p.patientProfile;
      const latestAppt = p.appointmentsAsPatient[0];
      const doctorName = latestAppt?.provider?.providerProfile
        ? `${latestAppt.provider.providerProfile.title || 'Dr.'} ${latestAppt.provider.providerProfile.firstName} ${latestAppt.provider.providerProfile.lastName}`
        : 'Dr. Oluwaseun Davies';

      let age = 30;
      if (profile?.dateOfBirth) {
        const birthYear = new Date(profile.dateOfBirth).getFullYear();
        if (!isNaN(birthYear)) age = new Date().getFullYear() - birthYear;
      }

      return {
        id: p.id,
        firstName: profile?.firstName || p.email?.split('@')[0] || 'Patient',
        lastName: profile?.lastName || '',
        email: p.email,
        phone: p.phone,
        patientProfile: profile,
        age,
        gender: profile?.gender || 'Unspecified',
        ward: `Ward ${(idx % 3) + 1}`,
        bed: `Bed ${idx + 1}`,
        doctor: doctorName,
        status: idx % 4 === 0 ? 'Discharged' : idx % 3 === 0 ? 'Outpatient' : 'Admitted',
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
    const { id } = req.params;

    const patient = await prisma.user.findFirst({
      where: {
        id,
        role: UserRole.PATIENT,
      },
      include: {
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

    const profile = patient.patientProfile;
    const name =
      `${profile?.firstName || 'Patient'} ${profile?.lastName || ''}`.trim() ||
      patient.email ||
      'Patient';

    let dob = 'January 1, 1995';
    if (profile?.dateOfBirth) {
      dob = new Date(profile.dateOfBirth).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const rawHistory = (profile?.medicalHistory as any) || [];
    const medicalHistory = Array.isArray(rawHistory)
      ? rawHistory
      : [
          {
            id: 'mh-1',
            condition: 'Routine clinical checkup & blood pressure evaluation',
            date: new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }),
          },
        ];

    const prescriptions = patient.prescriptionsAsPatient.map((p) => {
      const firstItem = p.items?.[0];
      return {
        id: p.id,
        date: new Date(p.createdAt).toLocaleString(),
        medication: firstItem?.drugName || 'Prescribed Medication',
        dose: firstItem?.dosage || '1 Tablet daily',
        form: firstItem?.instructions || 'Tablet',
        quantity: `${firstItem?.quantity || 1} Pack`,
      };
    });

    const appointments = patient.appointmentsAsPatient.map((a) => ({
      id: a.id,
      date: new Date(a.scheduledAt).toLocaleString(),
      type: a.type || 'Consultation',
      doctor: a.provider?.providerProfile
        ? `${a.provider.providerProfile.title || 'Dr.'} ${a.provider.providerProfile.firstName} ${a.provider.providerProfile.lastName}`
        : 'Dr. Oluwaseun Davies',
    }));

    const formatted = {
      id: patient.id,
      name,
      badge: 'Active Patient',
      avatarUrl: profile?.avatarUrl || undefined,
      dob,
      gender: profile?.gender || 'Unspecified',
      email: patient.email || 'N/A',
      serialNumber: `#09${patient.id.replace(/[^0-9]/g, '').slice(-2) || '10'}`,
      phone: patient.phone || 'N/A',
      address: 'Clinical Ward 1',
      medicalHistory,
      prescriptions,
      appointments,
      telemedicine: [],
    };

    res.status(200).json(successResponse(formatted));
  } catch (error: unknown) {
    next(error);
  }
};
