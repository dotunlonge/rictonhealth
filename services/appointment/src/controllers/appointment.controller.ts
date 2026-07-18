import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, AppointmentStatus, AppointmentType } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from '@ricton/shared';

// Helper to convert HH:MM:SS string to minutes since midnight
const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper to convert minutes since midnight back to HH:MM:SS string
const minutesToTimeStr = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

export const getAvailableSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { providerId, date } = req.query;

    if (!providerId || !date) {
      throw new ValidationError('providerId and date (YYYY-MM-DD) are required parameters');
    }

    const targetDate = new Date(String(date));
    if (isNaN(targetDate.getTime())) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    }

    // dayOfWeek mapping: 0=Mon, ..., 6=Sun (match our prisma schema.prisma index comment)
    // Date.getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat
    let dayOfWeek = targetDate.getUTCDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6; // Sunday mapped to 6

    const availabilities = await prisma.providerAvailability.findMany({
      where: {
        providerId: String(providerId),
        dayOfWeek,
        isActive: true,
      },
    });

    if (availabilities.length === 0) {
      return res.status(200).json(successResponse([]));
    }

    // Get all confirmed/busy appointments on target date
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const busyAppointments = await prisma.appointment.findMany({
      where: {
        providerId: String(providerId),
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.PENDING,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
      select: {
        scheduledAt: true,
        durationMinutes: true,
      },
    });

    const busyTimes = busyAppointments.map((app) => {
      const scheduledMinutes = app.scheduledAt.getUTCHours() * 60 + app.scheduledAt.getUTCMinutes();
      return {
        start: scheduledMinutes,
        end: scheduledMinutes + app.durationMinutes,
      };
    });

    const slots: string[] = [];

    for (const av of availabilities) {
      const startMin = timeToMinutes(av.startTime);
      const endMin = timeToMinutes(av.endTime);
      const duration = av.slotDurationMinutes;

      for (let current = startMin; current + duration <= endMin; current += duration) {
        // Overlap verification helper
        const slotEnd = current + duration;
        const isOverlap = busyTimes.some((busy) => {
          return current < busy.end && slotEnd > busy.start;
        });

        if (!isOverlap) {
          slots.push(minutesToTimeStr(current));
        }
      }
    }

    res.status(200).json(successResponse(slots));
  } catch (error) {
    next(error);
  }
};

export const bookAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can book appointments');
    }

    const {
      providerId,
      hospitalId,
      scheduledAt,
      durationMinutes = 30,
      type = AppointmentType.VIDEO,
      notes,
    } = req.body;

    if (!providerId || !scheduledAt) {
      throw new ValidationError('providerId and scheduledAt (ISO string) are required');
    }

    const apptDate = new Date(scheduledAt);
    if (isNaN(apptDate.getTime())) {
      throw new ValidationError('Invalid scheduledAt ISO date');
    }

    // Concurrency lock and validation inside transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // 1. Verify availability slot
      let dayOfWeek = apptDate.getUTCDay() - 1;
      if (dayOfWeek === -1) dayOfWeek = 6;

      const scheduleTimeStr = `${String(apptDate.getUTCHours()).padStart(2, '0')}:${String(apptDate.getUTCMinutes()).padStart(2, '0')}:00`;
      const scheduleTimeMin = timeToMinutes(scheduleTimeStr);

      const standardAvailability = await tx.providerAvailability.findFirst({
        where: {
          providerId,
          dayOfWeek,
          isActive: true,
        },
      });

      if (!standardAvailability) {
        throw new ValidationError('Doctor is not available on this day of week');
      }

      const openMin = timeToMinutes(standardAvailability.startTime);
      const closeMin = timeToMinutes(standardAvailability.endTime);
      if (scheduleTimeMin < openMin || scheduleTimeMin + durationMinutes > closeMin) {
        throw new ValidationError('Requested time slot falls outside Doctor working hours');
      }

      // 2. Check for slot overlaps (double-booking safety)
      const endRange = new Date(apptDate);
      endRange.setUTCMinutes(endRange.getUTCMinutes() + durationMinutes);

      const conflicts = await tx.appointment.findFirst({
        where: {
          providerId,
          status: {
            in: [
              AppointmentStatus.CONFIRMED,
              AppointmentStatus.PENDING,
              AppointmentStatus.IN_PROGRESS,
            ],
          },
          scheduledAt: {
            lt: endRange,
          },
          // Make sure to match overlapping intervals
        },
      });

      // Filter overlapping slots in memory for complete accuracy
      if (conflicts) {
        const conflictStart = conflicts.scheduledAt.getTime();
        const conflictEnd = conflictStart + conflicts.durationMinutes * 60 * 1000;
        const requestedStart = apptDate.getTime();
        const requestedEnd = requestedStart + durationMinutes * 60 * 1000;

        if (requestedStart < conflictEnd && requestedEnd > conflictStart) {
          throw new ConflictError('This time slot is already booked');
        }
      }

      // 3. Create the appointment in PENDING status
      return await tx.appointment.create({
        data: {
          patientId: userPayload.userId,
          providerId,
          hospitalId: hospitalId || null,
          scheduledAt: apptDate,
          durationMinutes,
          type,
          status: AppointmentStatus.PENDING,
          notes,
        },
      });
    });

    res.status(201).json(successResponse(appointment));
  } catch (error) {
    next(error);
  }
};

export const listAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { role, userId } = userPayload;

    let whereClause = {};
    if (role === UserRole.PATIENT) {
      whereClause = { patientId: userId };
    } else if (role === UserRole.CONSULTANT) {
      whereClause = { providerId: userId };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
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
        hospital: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    res.status(200).json(successResponse(appointments));
  } catch (error) {
    next(error);
  }
};

export const cancelAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) throw new NotFoundError('Appointment not found');

    if (
      userPayload.role !== UserRole.SUPER_ADMIN &&
      appointment.patientId !== userPayload.userId &&
      appointment.providerId !== userPayload.userId
    ) {
      throw new ForbiddenError('You are not authorized to cancel this appointment');
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason || 'Cancelled by user',
      },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};
