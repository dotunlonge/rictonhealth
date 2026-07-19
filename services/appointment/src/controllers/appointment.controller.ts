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

    const startOfQuery = new Date(targetDate);
    startOfQuery.setDate(startOfQuery.getDate() - 1); // Go back 24 hours to capture cross-midnight overlaps

    const busyAppointments = await prisma.appointment.findMany({
      where: {
        providerId: String(providerId),
        scheduledAt: {
          gte: startOfQuery,
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
      const targetMidnight = startOfDay.getTime();
      const appStartMs = app.scheduledAt.getTime();
      const appEndMs = appStartMs + app.durationMinutes * 60 * 1000;

      const relativeStartMin = Math.floor((appStartMs - targetMidnight) / (60 * 1000));
      const relativeEndMin = Math.ceil((appEndMs - targetMidnight) / (60 * 1000));

      return {
        start: relativeStartMin,
        end: relativeEndMin,
      };
    });

    const slots: string[] = [];

    for (const av of availabilities) {
      const startMin = timeToMinutes(av.startTime);
      const endMin = timeToMinutes(av.endTime);
      const duration = av.slotDurationMinutes;
      if (duration <= 0) continue;

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

    if (apptDate.getTime() <= Date.now()) {
      throw new ValidationError('scheduledAt must be a future date/time');
    }

    if (apptDate.getUTCSeconds() !== 0 || apptDate.getUTCMilliseconds() !== 0) {
      throw new ValidationError(
        'scheduledAt must align to the minute with no seconds or milliseconds'
      );
    }

    // Concurrency lock and validation inside transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // Lock the doctor's user record to serialize slot allocation
      await tx.$executeRaw`SELECT id FROM users WHERE id = ${providerId}::uuid FOR UPDATE`;

      // 1. Verify availability slot
      let dayOfWeek = apptDate.getUTCDay() - 1;
      if (dayOfWeek === -1) dayOfWeek = 6;

      const scheduleTimeStr = `${String(apptDate.getUTCHours()).padStart(2, '0')}:${String(apptDate.getUTCMinutes()).padStart(2, '0')}:00`;
      const scheduleTimeMin = timeToMinutes(scheduleTimeStr);

      const availabilities = await tx.providerAvailability.findMany({
        where: {
          providerId,
          dayOfWeek,
          isActive: true,
        },
      });

      if (availabilities.length === 0) {
        throw new ValidationError('Doctor is not available on this day of week');
      }

      // Find the specific availability window that covers the requested slot start and fits duration inside window
      const matchedAv = availabilities.find((av) => {
        const openMin = timeToMinutes(av.startTime);
        const closeMin = timeToMinutes(av.endTime);
        const slotDuration = durationMinutes || av.slotDurationMinutes;
        return scheduleTimeMin >= openMin && scheduleTimeMin + slotDuration <= closeMin;
      });

      if (!matchedAv) {
        throw new ValidationError('Requested time slot falls outside Doctor working hours');
      }

      // Enforce the matched availability's configured slotDurationMinutes to drive the appointment duration
      const finalDuration = durationMinutes || matchedAv.slotDurationMinutes;
      if (finalDuration !== matchedAv.slotDurationMinutes) {
        throw new ValidationError(
          `Requested duration (${finalDuration}m) does not match the doctor's configured slot duration (${matchedAv.slotDurationMinutes}m)`
        );
      }

      // Ensure the start time aligns exactly on the slot grid intervals
      const openMin = timeToMinutes(matchedAv.startTime);
      if ((scheduleTimeMin - openMin) % matchedAv.slotDurationMinutes !== 0) {
        throw new ValidationError(
          "Requested start time does not align with the doctor's scheduled slot intervals"
        );
      }

      // 2. Check for slot overlaps (double-booking safety)
      const startOfDay = new Date(apptDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(apptDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const activeAppointments = await tx.appointment.findMany({
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
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const requestedStart = apptDate.getTime();
      const requestedEnd = requestedStart + finalDuration * 60 * 1000;

      for (const existing of activeAppointments) {
        const existingStart = existing.scheduledAt.getTime();
        const existingEnd = existingStart + existing.durationMinutes * 60 * 1000;

        if (requestedStart < existingEnd && requestedEnd > existingStart) {
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
          durationMinutes: finalDuration,
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
    } else if (role === UserRole.SUPER_ADMIN || role === UserRole.HOSPITAL_ADMIN) {
      if (role === UserRole.HOSPITAL_ADMIN) {
        const adminUser = await prisma.user.findUnique({ where: { id: userId } });
        whereClause = { hospitalId: adminUser?.hospitalId || 'unassigned-hospital' };
      } else {
        whereClause = {};
      }
    } else {
      throw new ForbiddenError('You are not authorized to list appointments');
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

    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      throw new ValidationError(
        `Cannot cancel appointment with terminal status: ${appointment.status}`
      );
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
