import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, AppointmentStatus, AppointmentType, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  AppError,
} from '@ricton/shared';

export const getAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { providerId, date } = req.query;

    if (!providerId || !date) {
      throw new ValidationError('providerId and date are required');
    }

    const targetDate = new Date(date as string);
    const dayOfWeek = targetDate.getDay();

    // Get provider's availability for this day
    const availability = await prisma.providerAvailability.findFirst({
      where: {
        providerId: providerId as string,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!availability) {
      return res.status(200).json(successResponse([]));
    }

    // Get all active/confirmed appointments for this provider on this date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        providerId: providerId as string,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
      select: {
        scheduledAt: true,
        durationMinutes: true,
      },
    });

    // Generate available slots
    const slots: string[] = [];
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);
    const slotDuration = availability.slotDurationMinutes;

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStart = new Date(targetDate);
      slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      // Check if this slot conflicts with any existing appointment
      const hasConflict = appointments.some((apt) => {
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = new Date(aptStart.getTime() + apt.durationMinutes * 60000);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!hasConflict) {
        slots.push(slotStart.toISOString());
      }

      currentMinutes += slotDuration;
    }

    res.status(200).json(successResponse(slots));
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { providerId, scheduledAt, type, reason, durationMinutes } = req.body;

    if (!providerId || !scheduledAt || !type) {
      throw new ValidationError('providerId, scheduledAt, and type are required');
    }

    if (!Object.values(AppointmentType).includes(type)) {
      throw new ValidationError(
        `Invalid appointment type. Must be one of: ${Object.values(AppointmentType).join(', ')}`
      );
    }

    const scheduledDate = new Date(scheduledAt);
    const dayOfWeek = scheduledDate.getDay();

    // Check provider availability
    const availability = await prisma.providerAvailability.findFirst({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!availability) {
      throw new ValidationError('Provider is not available on this day');
    }

    // Check for conflicts with exclusive lock
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const slotDuration = durationMinutes || availability.slotDurationMinutes;

    const slotStart = new Date(scheduledDate);
    slotStart.setHours(Math.floor(startHour), startMin, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

    // Find conflicting appointments
    const conflictingAppointments = await prisma.appointment.findMany({
      where: {
        providerId,
        scheduledAt: {
          gte: new Date(scheduledDate.setHours(0, 0, 0, 0)),
          lte: new Date(scheduledDate.setHours(23, 59, 59, 999)),
        },
        status: {
          in: [
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
      },
    });

    const hasConflict = conflictingAppointments.some((apt) => {
      const aptStart = new Date(apt.scheduledAt);
      const aptEnd = new Date(aptStart.getTime() + apt.durationMinutes * 60000);
      return slotStart < aptEnd && slotEnd > aptStart;
    });

    if (hasConflict) {
      throw new AppError('This time slot is already booked', 409, 'APPOINTMENT_CONFLICT');
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: userPayload.userId,
        providerId,
        hospitalId: req.body.hospitalId,
        scheduledAt: slotStart,
        durationMinutes: slotDuration,
        type,
        reason,
        status: AppointmentStatus.PENDING,
      },
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
      },
    });

    // Auto-create telemedicine room for VIDEO appointments
    if (type === AppointmentType.VIDEO) {
      await prisma.telemedicineRoom.create({
        data: {
          providerId,
          appointmentId: appointment.id,
          roomType: 'ONE_ON_ONE',
          externalRoomId: `room-${appointment.id}`,
          status: 'CREATED',
        },
      });
    }

    res.status(201).json(successResponse(appointment));
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { status, type, from, to, limit = 20, offset = 0 } = req.query;

    const where: Prisma.AppointmentWhereInput = {};

    if (userPayload.role === UserRole.PATIENT) {
      where.patientId = userPayload.userId;
    } else if (userPayload.role === UserRole.CONSULTANT) {
      where.providerId = userPayload.userId;
    } else if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
      const adminUser = await prisma.user.findUnique({
        where: { id: userPayload.userId },
        include: { hospital: true },
      });
      if (adminUser?.hospital) {
        where.hospitalId = adminUser.hospital.id;
      } else {
        where.hospitalId = null;
      }
    } else if (userPayload.role === UserRole.SUPER_ADMIN) {
      // Super admin can see all appointments
    } else {
      throw new ForbiddenError('You do not have permission to view appointments');
    }

    if (status) where.status = status as AppointmentStatus;
    if (type) where.type = type as AppointmentType;
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from as string);
      if (to) where.scheduledAt.lte = new Date(to as string);
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { scheduledAt: 'desc' },
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
          telemedicineRoom: true,
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    res.status(200).json(
      successResponse({
        appointments,
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + appointments.length < total,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getAppointmentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
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
        telemedicineRoom: true,
        prescriptions: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Check authorization
    if (userPayload.role === UserRole.PATIENT && appointment.patientId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to view this appointment');
    }
    if (userPayload.role === UserRole.CONSULTANT && appointment.providerId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to view this appointment');
    }

    res.status(200).json(successResponse(appointment));
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    if (!status || !Object.values(AppointmentStatus).includes(status)) {
      throw new ValidationError(
        `Invalid status. Must be one of: ${Object.values(AppointmentStatus).join(', ')}`
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { telemedicineRoom: true },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Check authorization
    if (userPayload.role === UserRole.CONSULTANT && appointment.providerId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to update this appointment');
    }
    if (
      userPayload.role === UserRole.HOSPITAL_ADMIN &&
      appointment.hospitalId !==
        (await prisma.user.findUnique({ where: { id: userPayload.userId } }))?.hospitalId
    ) {
      throw new ForbiddenError('You are not authorized to update this appointment');
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        cancellationReason: status === AppointmentStatus.CANCELLED ? cancellationReason : undefined,
        cancelledBy: status === AppointmentStatus.CANCELLED ? userPayload.role : undefined,
      },
      include: {
        patient: { select: { id: true, email: true, phone: true, patientProfile: true } },
        provider: { select: { id: true, email: true, phone: true, providerProfile: true } },
      },
    });

    // If cancelled, end any active telemedicine room
    if (status === AppointmentStatus.CANCELLED && appointment.telemedicineRoom) {
      await prisma.telemedicineRoom.update({
        where: { id: appointment.telemedicineRoom.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }

    res.status(200).json(successResponse(updatedAppointment));
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
      include: { telemedicineRoom: true },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    // Check authorization
    if (userPayload.role === UserRole.PATIENT && appointment.patientId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to cancel this appointment');
    }
    if (userPayload.role === UserRole.CONSULTANT && appointment.providerId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to cancel this appointment');
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: reason,
        cancelledBy: userPayload.role,
      },
      include: {
        patient: { select: { id: true, email: true, phone: true, patientProfile: true } },
        provider: { select: { id: true, email: true, phone: true, providerProfile: true } },
      },
    });

    // If cancelled, end any active telemedicine room
    if (appointment.telemedicineRoom) {
      await prisma.telemedicineRoom.update({
        where: { id: appointment.telemedicineRoom.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }

    res.status(200).json(successResponse(updatedAppointment));
  } catch (error) {
    next(error);
  }
};
