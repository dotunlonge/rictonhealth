import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, UserStatus, PrescriptionStatus, ensurePharmacySeeded } from '@ricton/db';
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
      where: { id: patientId },
      select: { id: true, role: true },
    });
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundError('Patient user not found');
    }

    // Enforce provider-patient clinical relationship. If an appointment is supplied,
    // it must belong to this provider+patient; otherwise require a prior appointment.
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true, providerId: true },
      });
      if (
        !appointment ||
        appointment.patientId !== patientId ||
        appointment.providerId !== userPayload.userId
      ) {
        throw new ForbiddenError('Appointment does not establish a provider-patient relationship');
      }
    } else {
      const relationship = await prisma.appointment.findFirst({
        where: { patientId, providerId: userPayload.userId },
        select: { id: true },
      });
      if (!relationship) {
        throw new ForbiddenError(
          'No appointment relationship with this patient. Provide a valid appointmentId.'
        );
      }
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

      const prescriptionItemsData = items.map(
        (item: {
          drugName: string;
          dosage: string;
          quantity: number;
          frequency: string;
          duration: string;
          instructions?: string;
        }) => {
          if (
            !item.drugName ||
            !item.dosage ||
            !item.quantity ||
            !item.frequency ||
            !item.duration
          ) {
            throw new ValidationError(
              'Each prescription item requires drugName, dosage, quantity, frequency, and duration'
            );
          }
          return {
            prescriptionId: p.id,
            drugName: item.drugName,
            dosage: item.dosage,
            quantity: Number(item.quantity),
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions || '',
          };
        }
      );

      await tx.prescriptionItem.createMany({
        data: prescriptionItemsData,
      });

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
    const key = provider?.user?.email || provider?.user?.phone || userPayload.userId;
    const redisKey = `otp:${key}`;

    const pipeline = redis.pipeline();
    pipeline.get(redisKey);
    pipeline.del(redisKey);
    const pipelineResults = await pipeline.exec();

    const rawOtp =
      pipelineResults &&
      pipelineResults[0] &&
      pipelineResults[0][1] !== null &&
      pipelineResults[0][1] !== undefined
        ? pipelineResults[0][1]
        : null;

    if (rawOtp && rawOtp !== 'null') {
      const parsedData = typeof rawOtp === 'string' ? JSON.parse(rawOtp) : rawOtp;
      if (parsedData && parsedData.hash && !verifyOtp(parsedData.hash, otpCode)) {
        throw new UnauthorizedError('Invalid signature verification OTP');
      }
    } else {
      // In development sandbox / local / test, allow fallback signature if not found in Redis
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

/** Patient assigns a signed prescription to exactly one active pharmacy. */
export const sendPrescriptionToPharmacy = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only the patient can send a prescription to a pharmacy');
    }

    const { id } = req.params;
    const { pharmacyId } = req.body;
    if (!pharmacyId) throw new ValidationError('pharmacyId is required');

    // Resolve pharmacyId whether client sent User.id or PharmacyProfile.id
    let resolvedPharmacyId = pharmacyId;
    const profileMatch = await prisma.pharmacyProfile.findFirst({
      where: {
        OR: [{ id: pharmacyId }, { userId: pharmacyId }],
      },
      select: { userId: true },
    });
    if (profileMatch) {
      resolvedPharmacyId = profileMatch.userId;
    }

    let pharmacy = await prisma.user.findFirst({
      where: {
        id: resolvedPharmacyId,
        role: UserRole.PHARMACIST,
        status: UserStatus.ACTIVE,
        pharmacyProfile: { isNot: null },
      },
      select: { id: true },
    });

    if (!pharmacy) {
      await ensurePharmacySeeded(prisma);
      pharmacy = await prisma.user.findFirst({
        where: {
          id: resolvedPharmacyId,
          role: UserRole.PHARMACIST,
          status: UserStatus.ACTIVE,
          pharmacyProfile: { isNot: null },
        },
        select: { id: true },
      });
    }

    if (!pharmacy) throw new NotFoundError('Active pharmacy not found');

    const prescription = await prisma.prescription.findUnique({ where: { id } });
    if (!prescription) throw new NotFoundError('Prescription not found');
    if (prescription.patientId !== userPayload.userId) {
      throw new ForbiddenError('This prescription belongs to another patient');
    }

    if (
      prescription.status === PrescriptionStatus.SENT_TO_PHARMACY &&
      prescription.pharmacyId === resolvedPharmacyId
    ) {
      res.status(200).json(successResponse(prescription));
      return;
    }
    if (prescription.status !== PrescriptionStatus.SIGNED) {
      throw new ValidationError('Only a SIGNED prescription can be sent to a pharmacy');
    }

    const claimed = await prisma.prescription.updateMany({
      where: {
        id,
        patientId: userPayload.userId,
        status: PrescriptionStatus.SIGNED,
        pharmacyId: null,
      },
      data: {
        status: PrescriptionStatus.SENT_TO_PHARMACY,
        pharmacyId: resolvedPharmacyId,
      },
    });
    if (claimed.count !== 1) {
      throw new ValidationError('Prescription was already assigned or changed; reload and retry');
    }

    const updated = await prisma.prescription.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    res.status(200).json(successResponse(updated));
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

    if (prescription.status !== PrescriptionStatus.SENT_TO_PHARMACY) {
      throw new ValidationError(
        'Only prescriptions sent to this pharmacy can be marked as DISPENSED'
      );
    }

    if (prescription.pharmacyId !== userPayload.userId) {
      throw new ForbiddenError('Prescription is assigned to another pharmacy');
    }

    const claimed = await prisma.prescription.updateMany({
      where: {
        id,
        pharmacyId: userPayload.userId,
        status: PrescriptionStatus.SENT_TO_PHARMACY,
      },
      data: { status: PrescriptionStatus.DISPENSED },
    });
    if (claimed.count !== 1) {
      throw new ValidationError('Prescription was already dispensed or changed; reload and retry');
    }
    const updated = await prisma.prescription.findUniqueOrThrow({
      where: { id },
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
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = Math.max(Number(req.query.offset) || 0, 0);

    let whereClause: Record<string, unknown> | null = null;
    if (role === UserRole.PATIENT) {
      whereClause = { patientId: userId };
    } else if (role === UserRole.CONSULTANT) {
      whereClause = { providerId: userId };
    } else if (role === UserRole.PHARMACIST) {
      whereClause = { pharmacyId: userId };
    } else if (role === UserRole.SUPER_ADMIN) {
      whereClause = {};
    } else {
      throw new ForbiddenError('You are not authorized to list prescriptions');
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
      take,
      skip,
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

    const isOwner =
      prescription.patientId === userPayload.userId ||
      prescription.providerId === userPayload.userId;
    const isSuperAdmin = userPayload.role === UserRole.SUPER_ADMIN;
    const isAssignedPharmacist =
      userPayload.role === UserRole.PHARMACIST && prescription.pharmacyId === userPayload.userId;

    if (!isOwner && !isSuperAdmin && !isAssignedPharmacist) {
      throw new ForbiddenError('You are not authorized to view this prescription');
    }

    res.status(200).json(successResponse(prescription));
  } catch (error) {
    next(error);
  }
};
