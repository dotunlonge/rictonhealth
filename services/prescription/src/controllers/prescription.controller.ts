import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
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

    const author = await prisma.providerProfile.findUnique({
      where: { userId: userPayload.userId },
      select: { isVerified: true },
    });
    if (!author?.isVerified) {
      throw new ForbiddenError(
        'Your medical license must be verified before authoring prescriptions'
      );
    }

    const { patientId, appointmentId, notes, items } = req.body;

    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('patientId and at least one prescription item are required');
    }

    // Verify patient exists
    const patient = await prisma.user.findUnique({
      where: { id: patientId },
      select: { id: true, role: true, patientProfile: { select: { allergies: true } } },
    });
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundError('Patient user not found');
    }

    // Enforce provider-patient clinical relationship. If an appointment is supplied,
    // it must belong to this provider+patient; otherwise require a prior appointment.
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true, providerId: true, status: true, scheduledAt: true },
      });
      if (
        !appointment ||
        appointment.patientId !== patientId ||
        appointment.providerId !== userPayload.userId ||
        !['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(appointment.status) ||
        appointment.scheduledAt < new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
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
          const quantity = Number(item.quantity);
          if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
            throw new ValidationError(
              'Prescription quantity must be an integer between 1 and 1000'
            );
          }
          // #50 Structured dosage: must include amount + unit (e.g. "500mg", "2 tablets").
          if (
            !/^\d+(\.\d+)?\s*(mg|g|ml|mcg|IU|tablets?|capsules?)/i.test(String(item.dosage).trim())
          ) {
            throw new ValidationError('Dosage must include amount + unit (e.g. 500mg, 2 tablets)');
          }
          // #50 Controlled-substance guard: hard block on large quantities.
          const CONTROLLED = ['tramadol', 'codeine', 'morphine', 'oxycodone', 'fentanyl'];
          if (
            CONTROLLED.some((c) => String(item.drugName).toLowerCase().includes(c)) &&
            quantity > 30
          ) {
            throw new ValidationError(
              `Controlled substance ${item.drugName} limited to 30 units per prescription`
            );
          }
          const allergies = Array.isArray(patient.patientProfile?.allergies)
            ? (patient.patientProfile.allergies as string[])
            : [];
          if (
            allergies.some((allergy) => item.drugName.toLowerCase().includes(allergy.toLowerCase()))
          ) {
            throw new ValidationError(
              `Medication conflicts with the patient's recorded allergy: ${item.drugName}`
            );
          }
          return {
            prescriptionId: p.id,
            drugName: item.drugName,
            dosage: item.dosage,
            quantity,
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

    // #51 Verify OTP then atomically consume it (Lua compare-del, fallback to del).
    const key = provider?.user?.email || provider?.user?.phone || userPayload.userId;
    const redisKey = `otp:${key}`;

    const rawOtp: unknown = await redis.get(redisKey);

    if (rawOtp && rawOtp !== 'null') {
      const parsedData = typeof rawOtp === 'string' ? JSON.parse(rawOtp) : rawOtp;
      if (parsedData && parsedData.hash && !verifyOtp(parsedData.hash, otpCode)) {
        throw new UnauthorizedError('Invalid signature verification OTP');
      }
    } else {
      throw new UnauthorizedError('Signature verification OTP has expired. Please send a new OTP.');
    }

    // Atomic single-use consume: delete only if value unchanged since read.
    try {
      const redisAny = redis as unknown as {
        eval?: (...args: unknown[]) => Promise<unknown>;
      };
      if (typeof redisAny.eval === 'function') {
        await redisAny.eval(
          "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
          1,
          redisKey,
          String(rawOtp)
        );
      } else {
        await redis.del(redisKey);
      }
    } catch {
      try {
        await redis.del(redisKey);
      } catch {
        // best-effort consume; sign flow already verified the OTP
      }
    }

    const signedAt = new Date();
    // #L4 Rx snapshot: license + signature hash. Best-effort so signing still
    // works when the migration columns are not yet applied (falls back clean).
    const prescriberLicense = provider.licenseNumber || null;
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${id}:${userPayload.userId}:${signedAt.toISOString()}`)
      .digest('hex');
    let signed;
    try {
      signed = await (prisma.prescription.update as any)({
        where: { id },
        data: {
          status: PrescriptionStatus.SIGNED,
          signedAt,
          prescriberLicense,
          signatureHash,
        },
        include: { items: true },
      });
    } catch (e) {
      if (
        e instanceof Error &&
        /prescriberLicense|signatureHash|Unknown argument|P2022/i.test(e.message)
      ) {
        signed = await prisma.prescription.update({
          where: { id },
          data: {
            status: PrescriptionStatus.SIGNED,
            signedAt: new Date(),
          },
          include: { items: true },
        });
      } else {
        throw e;
      }
    }

    // #53 Audit trail for prescription signing (best-effort).
    try {
      await prisma.auditLog.create({
        data: {
          actorId: userPayload.userId,
          action: 'PRESCRIPTION_SIGNED',
          resourceType: 'PRESCRIPTION',
          resourceId: id,
          metadata: { patientId: prescription.patientId } as any,
        },
      });
    } catch {
      // do not fail sign flow on audit failure
    }

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

    // #P5/#145 Prefer POST /pharmacy/prescriptions/fulfill (atomic order+stock).
    // Kept backward-compatible for existing clients; deprecation header guides migration.
    res.setHeader('Deprecation', 'true');
    res.setHeader('Link', '</api/pharmacy/prescriptions/fulfill>; rel="successor"');

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
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 50);
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
