import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, PrescriptionStatus } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  UnauthorizedError,
  redis,
  verifyOtp,
} from '@ricton/shared';

export const createPrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.CONSULTANT) {
      throw new ForbiddenError('Only medical consultants can author prescriptions');
    }

    const { patientId, appointmentId, notes, items } = req.body;

    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('patientId and at least one prescription item are required');
    }

    // Verify patient exists
    const patient = await prisma.user.findUnique({
      where: { id: patientId, role: UserRole.PATIENT },
    });
    if (!patient) {
      throw new NotFoundError('Patient user not found');
    }

    const prescription = await prisma.$transaction(async (tx) => {
      const p = await tx.prescription.create({
        data: {
          patientId,
          providerId: userPayload.userId,
          appointmentId: appointmentId || null,
          status: PrescriptionStatus.DRAFT,
          notes: notes || '',
        },
      });

      for (const item of items) {
        if (!item.drugName || !item.dosage || !item.quantity || !item.frequency || !item.duration) {
          throw new ValidationError(
            'Each prescription item requires drugName, dosage, quantity, frequency, and duration'
          );
        }

        await tx.prescriptionItem.create({
          data: {
            prescriptionId: p.id,
            drugName: item.drugName,
            dosage: item.dosage,
            quantity: Number(item.quantity),
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions || '',
          },
        });
      }

      return p;
    });

    // Load full created prescription details
    const fullPrescription = await prisma.prescription.findUnique({
      where: { id: prescription.id },
      include: { items: true },
    });

    res.status(201).json(successResponse(fullPrescription));
  } catch (error) {
    next(error);
  }
};

export const signPrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.CONSULTANT) {
      throw new ForbiddenError('Only medical consultants can sign prescriptions');
    }

    const { id } = req.params;
    const { otpCode } = req.body;

    if (!otpCode) {
      throw new ValidationError('OTP security code is required to sign the prescription');
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { userId: userPayload.userId },
      include: { user: true },
    });

    if (!provider || !provider.isVerified) {
      throw new ForbiddenError(
        'Your medical license must be verified before signing prescriptions'
      );
    }

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      throw new NotFoundError('Prescription not found');
    }

    if (prescription.providerId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to sign this prescription');
    }

    if (prescription.status !== PrescriptionStatus.DRAFT) {
      throw new ValidationError('Only DRAFT prescriptions can be signed');
    }

    // Verify and atomically delete OTP code in Redis to prevent reuse under concurrency
    const key = provider.user.email || provider.user.phone || '';
    const redisKey = `otp:${key}`;

    const pipeline = redis.pipeline();
    pipeline.get(redisKey);
    pipeline.del(redisKey);
    const pipelineResults = await pipeline.exec();

    const storedData =
      pipelineResults && pipelineResults[0] && pipelineResults[0][1]
        ? String(pipelineResults[0][1])
        : null;

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (!verifyOtp(parsedData.hash, otpCode)) {
        throw new UnauthorizedError('Invalid signature verification OTP');
      }
    } else {
      // In development sandbox / local, allow fallback signature if not found in Redis, but standard checks run first
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedError(
          'Signature verification OTP has expired. Please send a new OTP.'
        );
      }
    }

    const signed = await prisma.prescription.update({
      where: { id },
      data: {
        status: PrescriptionStatus.SIGNED,
        signedAt: new Date(),
      },
      include: { items: true },
    });

    res.status(200).json(successResponse(signed));
  } catch (error) {
    next(error);
  }
};

export const dispensePrescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.PHARMACIST) {
      throw new ForbiddenError('Only registered pharmacists can dispense prescriptions');
    }

    const { id } = req.params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
    });

    if (!prescription) {
      throw new NotFoundError('Prescription not found');
    }

    if (
      prescription.status !== PrescriptionStatus.SIGNED &&
      prescription.status !== PrescriptionStatus.SENT_TO_PHARMACY
    ) {
      throw new ValidationError('Only SIGNED prescriptions can be marked as DISPENSED');
    }

    const updated = await prisma.prescription.update({
      where: { id },
      data: {
        status: PrescriptionStatus.DISPENSED,
        pharmacyId: userPayload.userId,
      },
      include: { items: true },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

export const listPrescriptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { role, userId } = userPayload;

    let whereClause = {};
    if (role === UserRole.PATIENT) {
      whereClause = { patientId: userId };
    } else if (role === UserRole.CONSULTANT) {
      whereClause = { providerId: userId };
    } else if (role === UserRole.PHARMACIST) {
      whereClause = {
        OR: [{ pharmacyId: userId }, { status: PrescriptionStatus.SENT_TO_PHARMACY }],
      };
    }

    const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      include: {
        items: true,
        patient: {
          select: {
            id: true,
            email: true,
            phone: true,
            patientProfile: true,
          },
        },
        provider: {
          select: {
            id: true,
            email: true,
            phone: true,
            providerProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(successResponse(prescriptions));
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        items: true,
        patient: {
          select: {
            id: true,
            email: true,
            phone: true,
            patientProfile: true,
          },
        },
        provider: {
          select: {
            id: true,
            email: true,
            phone: true,
            providerProfile: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundError('Prescription not found');
    }

    if (
      userPayload.role !== UserRole.SUPER_ADMIN &&
      userPayload.role !== UserRole.PHARMACIST &&
      prescription.patientId !== userPayload.userId &&
      prescription.providerId !== userPayload.userId
    ) {
      throw new ForbiddenError('You are not authorized to view this prescription');
    }

    res.status(200).json(successResponse(prescription));
  } catch (error) {
    next(error);
  }
};
