import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma, UserRole, UserStatus, AppointmentStatus, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  getCached,
  setCached,
  invalidateCache,
  makeCacheKey,
  AppError,
  isValidCoordinatePair,
  clampRadiusKm,
  withDistances,
  withinRadius,
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
      // #48 License mutation: credential change re-opens verification.
      try {
        if (updateData.licenseNumber || updateData.specialty) {
          await prisma.providerProfile.update({
            where: { userId },
            data: { isVerified: false },
          });
        }
      } catch {
        // best-effort: do not break profile save if re-verification flag fails
      }
      await invalidateCache('providers*');
    } else if (role === UserRole.PHARMACIST) {
      // #144 Pharmacy onboarding: persist the full premises profile, not
      // just pharmacyName. Columns address/operatingHours/documents/
      // bankDetails all exist on pharmacy_profiles; bank trio also mirrors
      // to users.bankDetails via the shared sync below.
      const bankTrio =
        updateData.bankName || updateData.accountNumber || updateData.accountName
          ? {
              bankName: updateData.bankName,
              bankCode: updateData.bankCode,
              accountNumber: updateData.accountNumber,
              accountName: updateData.accountName,
            }
          : undefined;
      const documents =
        updateData.superintendent ||
        updateData.pharmacyServices ||
        updateData.pcnLicenseUploaded !== undefined
          ? {
              ...(updateData.superintendent && typeof updateData.superintendent === 'object'
                ? { superintendent: updateData.superintendent }
                : {}),
              ...(Array.isArray(updateData.pharmacyServices)
                ? { services: updateData.pharmacyServices }
                : {}),
              ...(updateData.pcnLicenseUploaded !== undefined
                ? { pcnLicenseUploaded: Boolean(updateData.pcnLicenseUploaded) }
                : {}),
            }
          : undefined;
      const data: Record<string, unknown> = {
        pharmacyName: updateData.pharmacyName,
        licenseNumber: updateData.pharmacyRegistration,
        address: updateData.pharmacyAddress,
        operatingHours: updateData.operatingHours,
        documents,
        ...(bankTrio ? { bankDetails: bankTrio } : {}),
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
        // #151 Unify address shape to { line1, city, state, ... }: accept the
        // legacy { street } / { address } forks plus plain-string input.
        const rawAddress = updateData.address ?? currentUser?.hospital?.address;
        const hospitalAddress =
          typeof rawAddress === 'string'
            ? { line1: rawAddress, city: updateData.city, state: updateData.state }
            : rawAddress && typeof rawAddress === 'object'
              ? {
                  ...(rawAddress as Record<string, unknown>),
                  line1:
                    (rawAddress as Record<string, unknown>).line1 ??
                    (rawAddress as Record<string, unknown>).street ??
                    (rawAddress as Record<string, unknown>).address,
                }
              : rawAddress;
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
              // #150/#151 Quarantine: self-registered hospitals stay inactive
              // and unverified until a SUPER_ADMIN verifies documents via
              // POST /admin/hospitals/:id/verify. The admin user stays PENDING.
              isActive: false,
              onboardingComplete: false,
            },
          });
          await prisma.user.update({
            where: { id: userId },
            data: {
              hospitalId: newHospital.id,
              // #150 No hospital self-activation: new hospitals stay PENDING
              // until a SUPER_ADMIN verifies documents and activates the account.
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

    // #V1 Validate NUBAN + E.164 phone before persisting bank details
    if (incomingBank) {
      const acct = (incomingBank as Record<string, unknown>).accountNumber;
      if (acct !== undefined && acct !== null && String(acct) !== '') {
        if (!/^[0-9]{10}$/.test(String(acct))) {
          throw new ValidationError('Invalid account number: must be a 10-digit NUBAN');
        }
      }
      const phoneToValidate = updateData.phone ?? (incomingBank as Record<string, unknown>).phone;
      if (
        phoneToValidate !== undefined &&
        phoneToValidate !== null &&
        String(phoneToValidate) !== ''
      ) {
        if (!/^\+?[1-9][0-9]{7,14}$/.test(String(phoneToValidate))) {
          throw new ValidationError('Invalid phone number format');
        }
      }
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
    const actor = req.user as JwtPayload | undefined;
    const {
      specialty,
      name,
      search,
      limit = 20,
      offset = 0,
      latitude,
      longitude,
      radiusKm,
    } = req.query;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = Math.max(Number(offset) || 0, 0);
    const searchTerm = (name || search) as string | undefined;
    const patientLatitude = latitude === undefined ? Number.NaN : Number(latitude);
    const patientLongitude = longitude === undefined ? Number.NaN : Number(longitude);
    const hasCoordinates = isValidCoordinatePair(patientLatitude, patientLongitude);
    if ((latitude !== undefined || longitude !== undefined) && !hasCoordinates) {
      throw new ValidationError('Latitude and longitude must both be valid coordinates');
    }
    const radius = clampRadiusKm(radiusKm);

    // No runtime auto-seeding: demo doctors are dev fixtures only, seeded
    // explicitly via `prisma db seed`. An empty directory returns empty —
    // it must never fabricate providers, in any environment.

    const isProd = process.env.NODE_ENV === 'production';
    let hospitalId: string | undefined;
    if (actor?.role === UserRole.HOSPITAL_ADMIN) {
      const admin = await prisma.user.findUnique({
        where: { id: actor.userId },
        select: { hospitalId: true },
      });
      if (!admin?.hospitalId)
        throw new ForbiddenError('Hospital administrator is not assigned to a hospital');
      hospitalId = admin.hospitalId;
    }
    const where: Prisma.ProviderProfileWhereInput = {
      ...(isProd ? { isVerified: true } : {}),
      ...(hospitalId ? { hospitalId } : {}),
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
      hospitalId,
      hasCoordinates ? `${patientLatitude},${patientLongitude},${radius}` : undefined,
    ]);
    const cached = await getCached<{ providers: any[]; total: number }>(cacheKey, {
      ttlSeconds: 300,
    });
    // Critical: Never serve empty array from cache if Redis held negative cache
    if (cached && Array.isArray(cached.providers) && cached.providers.length > 0) {
      return res.status(200).json(successResponse(cached));
    }

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        // Geospatial ordering is computed below without requiring PostGIS.
        take: hasCoordinates ? 200 : take,
        skip: hasCoordinates ? 0 : skip,
        include: { hospital: true },
      }),
      prisma.providerProfile.count({ where }),
    ]);

    const toNumber = (value: unknown) => Number(value);
    let nearbyProviders = providers;
    let totalCount = total;
    if (hasCoordinates) {
      // Only public practice locations participate in nearby search; a
      // provider's home address is never exposed here.
      const visible = providers.filter(
        (provider) =>
          provider.practiceLocationVisible &&
          provider.practiceLatitude !== null &&
          provider.practiceLongitude !== null
      );
      const located = withDistances(
        visible,
        { latitude: patientLatitude, longitude: patientLongitude },
        (provider) => ({
          latitude: toNumber(provider.practiceLatitude),
          longitude: toNumber(provider.practiceLongitude),
        })
      );
      const within = withinRadius(located, radius);
      totalCount = within.length;
      nearbyProviders = within.slice(skip, skip + take).map((entry) => ({
        ...entry.item,
        distanceKm: entry.distanceKm,
      }));
    }
    const result = {
      providers: nearbyProviders,
      total: totalCount,
      limit: take,
      offset: skip,
      ...(hasCoordinates ? { radiusKm: radius } : {}),
    };
    if (result.providers.length > 0) {
      await setCached(cacheKey, result, { ttlSeconds: 300 });
    }

    res.status(200).json(successResponse(result));
  } catch (error: unknown) {
    next(error);
  }
};

export const updatePracticeLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as JwtPayload).userId;
    const { practiceAddress, practiceCity, practiceState, latitude, longitude, visible } = req.body;
    const profile = await prisma.providerProfile.update({
      where: { userId },
      data: {
        practiceAddress,
        practiceCity,
        practiceState,
        practiceLatitude: new Prisma.Decimal(latitude),
        practiceLongitude: new Prisma.Decimal(longitude),
        practiceLocationVisible: visible,
      },
    });
    await invalidateCache('providers*');
    res.status(200).json(successResponse(profile));
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
    const take = Math.min(Math.max(Number(limit) || 50, 1), 50);
    const skip = Math.max(Number(offset) || 0, 0);

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
        take,
        skip,
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

/**
 * #L1 Versioned re-consent: PUT /users/me/consent { version }.
 * Mirrors the grant onto User.consentVersion/consentAt and appends a
 * ConsentHistory row (best-effort — never blocks the mirror update).
 */
export const updateConsent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { version } = req.body as { version?: unknown };
    if (typeof version !== 'string' || version.trim() === '') {
      throw new ValidationError('version is required');
    }
    const clean = version.trim();

    const updated = await prisma.user.update({
      where: { id: userPayload.userId },
      data: { consentVersion: clean, consentAt: new Date() },
    });

    try {
      await (prisma as any).consentHistory?.create?.({
        data: {
          userId: userPayload.userId,
          version: clean,
          ip:
            (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            null,
        },
      });
    } catch {
      // best-effort: the User mirror above is authoritative
    }

    res
      .status(200)
      .json(
        successResponse({ consentVersion: updated.consentVersion, consentAt: updated.consentAt })
      );
  } catch (error: unknown) {
    next(error);
  }
};

/**
 * #L3 Erasure worker (inline + cron-able, BullMQ-agnostic).
 * Anonymizes PII for a user with no legal hold:
 * - users: email -> deleted_{id}@deleted.ricton.health, phone -> null,
 *   bankDetails -> null, tokenVersion +1, status DEACTIVATED
 * - refresh_tokens: revoke all active (password-reset pattern)
 * - patient_profiles / provider_profiles: firstName/lastName -> 'Deleted'
 * - pharmacy_profiles: pharmacyName -> 'Deleted', bankDetails -> null
 * - erasure_requests: status -> DONE
 * Best-effort per row: throws on failure so callers can leave PENDING (retryable).
 */
const erasureEmailFor = (userId: string) => `deleted_${userId}@deleted.ricton.health`;

const hasErasureLegalHold = async (userId: string): Promise<boolean> => {
  try {
    const signedCount = await prisma.prescription.count({
      where: {
        status: 'SIGNED' as never,
        OR: [{ patientId: userId }, { providerId: userId }],
      },
    });
    return signedCount > 0;
  } catch {
    return false;
  }
};

const anonymizeErasedUser = async (userId: string): Promise<void> => {
  const anonEmail = erasureEmailFor(userId);
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: anonEmail,
      phone: null,
      bankDetails: Prisma.DbNull,
      tokenVersion: { increment: 1 },
      status: UserStatus.DEACTIVATED,
    },
  });
  // Reuse password-reset session-kill pattern: bump above invalidates access
  // tokens, this revokes refresh tokens so no new access tokens can be minted.
  try {
    await prisma.refreshToken.updateMany({
      where: { userId, isActive: true },
      data: {
        isActive: false,
        isRevoked: true,
        revokedAt: new Date(),
        revokeReason: 'ERASURE',
      },
    });
  } catch {
    // best-effort: tokenVersion bump above already invalidates access tokens
  }
  // updateMany (not update) so missing profile rows don't throw P2025.
  try {
    await prisma.patientProfile.updateMany({
      where: { userId },
      data: { firstName: 'Deleted', lastName: 'Deleted' },
    });
  } catch {
    // best-effort per profile table
  }
  try {
    await prisma.providerProfile.updateMany({
      where: { userId },
      data: { firstName: 'Deleted', lastName: 'Deleted' },
    });
  } catch {
    // best-effort per profile table
  }
  try {
    await prisma.pharmacyProfile.updateMany({
      where: { userId },
      data: { pharmacyName: 'Deleted', bankDetails: Prisma.DbNull },
    });
  } catch {
    // best-effort per profile table
  }
  await (prisma as any).erasureRequest.update({
    where: { userId },
    data: { status: 'DONE' },
  });
};

/**
 * BullMQ-agnostic cron entrypoint: picks PENDING rows and runs the same
 * anonymize routine. Returns a summary. Legal-hold rows are skipped
 * (left PENDING — the HTTP path rejects them with 409 and never queues,
 * but a hold may appear between queueing and processing).
 */
export const processErasureRequests = async (limit = 50) => {
  const pending = await (prisma as any).erasureRequest.findMany({
    where: { status: 'PENDING' },
    take: Math.min(Math.max(limit, 1), 200),
    select: { userId: true },
  });
  const summary = { total: pending.length, done: 0, skippedLegalHold: 0, failed: 0 };
  for (const row of pending as Array<{ userId: string }>) {
    try {
      if (await hasErasureLegalHold(row.userId)) {
        summary.skippedLegalHold += 1;
        continue;
      }
      await anonymizeErasedUser(row.userId);
      summary.done += 1;
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
};

/**
 * #L3 Erasure request: DELETE /users/me.
 * Legal hold: users with SIGNED prescriptions are rejected with 409
 * (records retained 7y). Otherwise a PENDING ErasureRequest row is filed,
 * the account is DEACTIVATED, and anonymization runs immediately inline
 * (best-effort). On anonymize failure the request stays PENDING +
 * DEACTIVATED so processErasureRequests() can retry it.
 */
export const requestErasure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const userId = userPayload.userId;

    let signedCount = 0;
    try {
      signedCount = await prisma.prescription.count({
        where: {
          status: 'SIGNED' as never,
          OR: [{ patientId: userId }, { providerId: userId }],
        },
      });
    } catch {
      signedCount = 0;
    }
    if (signedCount > 0) {
      throw new ConflictError('Legal hold: prescription records retained 7y');
    }

    // Fail closed if the generated client predates the erasure_requests table:
    // deactivating without a queue row would lose the request.
    if (!(prisma as any).erasureRequest?.create) {
      throw new AppError(
        'Erasure queue unavailable (pending migration)',
        503,
        'SERVICE_NOT_CONFIGURED'
      );
    }

    let erasure: any;
    try {
      erasure = await (prisma as any).erasureRequest.create({
        data: { userId, status: 'PENDING' },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = (e as { code?: unknown })?.code;
      if (code === 'P2002' || /unique constraint|already exists/i.test(msg)) {
        erasure = await (prisma as any).erasureRequest.findUnique({ where: { userId } });
      } else {
        throw e;
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DEACTIVATED },
    });

    // Inline worker: anonymize immediately (no legal hold — checked above).
    // Best-effort: on failure leave PENDING + DEACTIVATED for retry via
    // processErasureRequests().
    try {
      await anonymizeErasedUser(userId);
      erasure = await (prisma as any).erasureRequest.findUnique({ where: { userId } });
      res.status(200).json(successResponse({ ...erasure, anonymized: true }));
    } catch {
      erasure = await (prisma as any).erasureRequest.findUnique({ where: { userId } });
      res
        .status(200)
        .json(
          successResponse({ ...(erasure ?? { userId, status: 'PENDING' }), anonymized: false })
        );
    }
  } catch (error: unknown) {
    next(error);
  }
};
