import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ValidationError, ForbiddenError } from '@ricton/shared';
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

    res.status(200).json(successResponse(user));
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
};

export const getAvatarUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { fileType } = req.body;
    if (!fileType) throw new ValidationError('fileType is required (e.g. image/jpeg)');

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
      })
    );
  } catch (error) {
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

    const [providers, total] = await Promise.all([
      prisma.providerProfile.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        include: { hospital: true },
      }),
      prisma.providerProfile.count({ where }),
    ]);

    res
      .status(200)
      .json(successResponse({ providers, total, limit: Number(limit), offset: Number(offset) }));
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
};
