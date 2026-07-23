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
    // Support both path params and query params for flexibility
    const providerId = req.params.providerId || (req.query.providerId as string);
    const date = req.query.date as string;

    if (!providerId || !date) {
      throw new ValidationError('providerId and date are required');
    }

    const targetDate = new Date(date as string);
    // Convert JavaScript day (0=Sunday..6=Saturday) to schema day (0=Monday..6=Sunday)
    const dayOfWeek = (targetDate.getDay() + 6) % 7;

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
    // Include cross-midnight appointments that might overlap with early morning slots
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Also check previous day for appointments that extend past midnight
    const prevDay = new Date(startOfDay);
    prevDay.setDate(prevDay.getDate() - 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        providerId: providerId as string,
        OR: [
          {
            scheduledAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          {
            scheduledAt: {
              gte: prevDay,
              lt: startOfDay,
            },
            // Only include if appointment extends into target date
            durationMinutes: {
              gt: 0,
            },
          },
        ],
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
  } catch (error: unknown) {
    next(error);
  }
};

export const createAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { providerId, scheduledAt, type, reason, durationMinutes, hospitalId } = req.body;

    if (!providerId || !scheduledAt || !type) {
      throw new ValidationError('providerId, scheduledAt, and type are required');
    }

    if (!Object.values(AppointmentType).includes(type)) {
      throw new ValidationError(
        `Invalid appointment type. Must be one of: ${Object.values(AppointmentType).join(', ')}`
      );
    }

    const scheduledDate = new Date(scheduledAt);

    // Validate that scheduledAt is not in the past
    const now = new Date();
    if (scheduledDate < now) {
      throw new ValidationError('Cannot book appointments in the past');
    }

    // Validate seconds and milliseconds are zero for proper slot alignment
    if (scheduledDate.getSeconds() !== 0 || scheduledDate.getMilliseconds() !== 0) {
      throw new ValidationError(
        'Appointment time must be aligned to minute boundaries (seconds and milliseconds must be 0)'
      );
    }

    // Convert JavaScript day (0=Sunday..6=Saturday) to schema day (0=Monday..6=Sunday)
    const dayOfWeek = (scheduledDate.getDay() + 6) % 7;

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

    // Validate slot duration is positive to prevent infinite loops
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);
    const slotDuration = durationMinutes || availability.slotDurationMinutes;

    if (slotDuration <= 0) {
      throw new ValidationError('Slot duration must be positive');
    }

    // Calculate requested time in minutes
    const reqHour = scheduledDate.getHours();
    const reqMin = scheduledDate.getMinutes();
    const reqMinutes = reqHour * 60 + reqMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Validate requested time falls within availability window
    if (reqMinutes < startMinutes || reqMinutes + slotDuration > endMinutes) {
      throw new ValidationError('Requested time is outside the provider availability window');
    }

    // Validate slot alignment to provider's configured grid
    if ((reqMinutes - startMinutes) % availability.slotDurationMinutes !== 0) {
      throw new ValidationError('Requested time must align to the provider slot grid');
    }

    // Use the requested scheduledDate directly (not overwritten to startTime)
    const slotStart = new Date(scheduledDate);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

    // Derive hospitalId from provider if not provided, or validate it matches provider's hospital
    let finalHospitalId = hospitalId;
    if (!finalHospitalId) {
      const provider = await prisma.user.findUnique({
        where: { id: providerId },
        include: { providerProfile: true },
      });
      if (provider?.providerProfile?.hospitalId) {
        finalHospitalId = provider.providerProfile.hospitalId;
      }
    } else {
      // Validate that the provider belongs to the specified hospital
      const provider = await prisma.user.findUnique({
        where: { id: providerId },
        include: { providerProfile: true },
      });
      if (provider?.providerProfile?.hospitalId !== finalHospitalId) {
        throw new ValidationError('Provider does not belong to the specified hospital');
      }
    }

    // Create appointment with telemedicine room in a single transaction with Serializable isolation to prevent double bookings
    const appointment = await prisma.$transaction(
      async (tx) => {
        // Find conflicting appointments inside the transaction
        const conflictingAppointments = await tx.appointment.findMany({
          where: {
            providerId,
            scheduledAt: {
              gte: new Date(new Date(scheduledDate).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(scheduledDate).setHours(23, 59, 59, 999)),
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

        const appt = await tx.appointment.create({
          data: {
            patientId: userPayload.userId,
            providerId,
            hospitalId: finalHospitalId,
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
          await tx.telemedicineRoom.create({
            data: {
              providerId,
              appointmentId: appt.id,
              roomType: 'ONE_ON_ONE',
              externalRoomId: `room-${appt.id}`,
              status: 'CREATED',
            },
          });
        }

        return appt;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    res.status(201).json(successResponse(appointment));
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
    if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
      const adminUser = await prisma.user.findUnique({
        where: { id: userPayload.userId },
        include: { hospital: true },
      });
      if (!adminUser?.hospital || adminUser.hospital.id !== appointment.hospitalId) {
        throw new ForbiddenError('You are not authorized to view this appointment');
      }
    }

    res.status(200).json(successResponse(appointment));
  } catch (error: unknown) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    if (!status || !Object.values(AppointmentStatus).includes(status as AppointmentStatus)) {
      throw new ValidationError(
        `Invalid status. Must be one of: ${Object.values(AppointmentStatus).join(', ')}`
      );
    }

    const validStatus = status as AppointmentStatus;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { telemedicineRoom: true },
    });

    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

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
        status: validStatus,
        cancellationReason:
          validStatus === AppointmentStatus.CANCELLED ? cancellationReason : undefined,
        cancelledBy: validStatus === AppointmentStatus.CANCELLED ? userPayload.role : undefined,
      },
      include: {
        patient: { select: { id: true, email: true, phone: true, patientProfile: true } },
        provider: { select: { id: true, email: true, phone: true, providerProfile: true } },
      },
    });

    if (validStatus === AppointmentStatus.CANCELLED && appointment.telemedicineRoom) {
      await prisma.telemedicineRoom.update({
        where: { id: appointment.telemedicineRoom.id },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }

    res.status(200).json(successResponse(updatedAppointment));
  } catch (error: unknown) {
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

    // Prevent cancellation of terminal status appointments
    const terminalStatuses: string[] = [
      AppointmentStatus.COMPLETED,
      AppointmentStatus.NO_SHOW,
      AppointmentStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(appointment.status)) {
      throw new ValidationError(`Cannot cancel an appointment with status ${appointment.status}`);
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
  } catch (error: unknown) {
    next(error);
  }
};
