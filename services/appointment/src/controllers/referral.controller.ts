import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ValidationError, ForbiddenError } from '@ricton/shared';

/**
 * #F2 Referral: POST /referrals { toProviderId, patientId, reason?, consent? }.
 * CONSULTANT-only (route-gated): must have a clinical relationship with the
 * patient (an appointment row) and explicit patient consent (consent:true).
 * consentAt is stamped server-side — never trust a client timestamp.
 */
export const createReferral = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.CONSULTANT) {
      throw new ForbiddenError('Only consultants can create referrals');
    }
    const { toProviderId, patientId, reason, consent } = (req.body || {}) as {
      toProviderId?: unknown;
      patientId?: unknown;
      reason?: unknown;
      consent?: unknown;
    };
    if (typeof toProviderId !== 'string' || !toProviderId.trim()) {
      throw new ValidationError('toProviderId is required');
    }
    if (typeof patientId !== 'string' || !patientId.trim()) {
      throw new ValidationError('patientId is required');
    }
    if (consent !== true) {
      throw new ValidationError('Patient consent is required (consent:true)');
    }
    if (reason !== undefined && typeof reason !== 'string') {
      throw new ValidationError('reason must be a string');
    }

    const [toProvider, patient] = await Promise.all([
      prisma.user.findUnique({ where: { id: toProviderId }, select: { id: true, role: true } }),
      prisma.user.findUnique({ where: { id: patientId }, select: { id: true, role: true } }),
    ]);
    if (!toProvider || toProvider.role !== UserRole.CONSULTANT) {
      throw new NotFoundError('Receiving provider not found');
    }
    if (!patient || patient.role !== UserRole.PATIENT) {
      throw new NotFoundError('Patient not found');
    }

    // CONSULTANT may only refer their own patient (appointment relationship).
    const relationship = await prisma.appointment.findFirst({
      where: { patientId, providerId: userPayload.userId },
      select: { id: true },
    });
    if (!relationship) {
      throw new ForbiddenError('No clinical relationship with this patient');
    }

    const referral = await prisma.referral.create({
      data: {
        fromProviderId: userPayload.userId,
        toProviderId,
        patientId,
        reason: reason?.trim() || null,
        consentAt: new Date(),
      },
    });

    // Audit every referral (best-effort; never blocks the response).
    try {
      await prisma.auditLog.create({
        data: {
          actorId: userPayload.userId,
          action: 'REFERRAL_CREATED',
          resourceType: 'Referral',
          resourceId: referral.id,
          metadata: { toProviderId, patientId } as never,
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });
    } catch (err) {
      console.warn(`[appointment] audit log failed for referral ${referral.id}`, err);
    }

    res.status(201).json(successResponse(referral));
  } catch (error) {
    next(error);
  }
};

/**
 * #F2 Referral: GET /referrals — role-scoped.
 * CONSULTANT sees sent + received; PATIENT sees own; staff see all (capped).
 */
export const listReferrals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 50);
    const skip = Math.max(Number(req.query.offset) || 0, 0);

    const where =
      userPayload.role === UserRole.CONSULTANT
        ? { OR: [{ fromProviderId: userPayload.userId }, { toProviderId: userPayload.userId }] }
        : userPayload.role === UserRole.PATIENT
          ? { patientId: userPayload.userId }
          : {};

    const [referrals, total] = await Promise.all([
      prisma.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.referral.count({ where }),
    ]);

    res
      .status(200)
      .json(successResponse({ referrals, meta: { total, limit: take, offset: skip } }));
  } catch (error) {
    next(error);
  }
};
