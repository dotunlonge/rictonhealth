import { Request, Response, NextFunction } from 'express';
import { prisma, UserRole, AppointmentStatus, AppointmentType, Prisma } from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import {
  successResponse,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  AppError,
  redis,
} from '@ricton/shared';

/**
 * Set the calling provider's weekly availability (upsert per dayOfWeek).
 * HOSPITAL_ADMIN/SUPER_ADMIN may set availability for a providerId in the body.
 */
export const setAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const {
      providerId: bodyProviderId,
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      isActive,
    } = req.body as {
      providerId?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes?: number;
      isActive?: boolean;
    };

    const providerId =
      userPayload.role === UserRole.CONSULTANT ? userPayload.userId : bodyProviderId;
    if (!providerId) {
      throw new ValidationError('providerId is required');
    }

    const normalize = (t: string) => (t.length === 5 ? `${t}:00` : t);
    const start = normalize(startTime);
    const end = normalize(endTime);
    if (start >= end) {
      throw new ValidationError('startTime must be before endTime');
    }

    const availability = await prisma.providerAvailability.upsert({
      where: {
        providerId_dayOfWeek: { providerId, dayOfWeek },
      },
      create: {
        providerId,
        dayOfWeek,
        startTime: start,
        endTime: end,
        slotDurationMinutes: slotDurationMinutes ?? 30,
        isActive: isActive ?? true,
      },
      update: {
        startTime: start,
        endTime: end,
        slotDurationMinutes: slotDurationMinutes ?? 30,
        isActive: isActive ?? true,
      },
    });

    res.status(200).json(successResponse(availability));
  } catch (error) {
    next(error);
  }
};

export const getAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Support both path params and query params for flexibility
    const rawProviderId = req.params.providerId || (req.query.providerId as string);
    const date = req.query.date as string;

    if (!rawProviderId || !date) {
      throw new ValidationError('providerId and date are required');
    }

    // Resolve providerId whether caller sent User.id or ProviderProfile.id
    let providerId = rawProviderId;
    const profileMatch = await prisma.providerProfile.findFirst({
      where: {
        OR: [{ id: rawProviderId }, { userId: rawProviderId }],
      },
      select: { userId: true },
    });
    if (profileMatch) {
      providerId = profileMatch.userId;
    }

    const targetDate = new Date(date as string);
    // Convert JavaScript day (0=Sunday..6=Saturday) to schema day (0=Monday..6=Sunday)
    const dayOfWeek = (targetDate.getUTCDay() + 6) % 7; // UTC: availability windows are stored/evaluated in UTC

    // Get provider's availability for this day
    let availability = await prisma.providerAvailability.findFirst({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!availability) {
      // Auto-provision standard weekly availability (09:00 - 17:00, 30m slots) for active consultants
      const consultant = await prisma.user.findFirst({
        where: { id: providerId, role: UserRole.CONSULTANT },
      });
      if (consultant) {
        for (let day = 0; day < 7; day++) {
          await prisma.providerAvailability.upsert({
            where: {
              providerId_dayOfWeek: {
                providerId,
                dayOfWeek: day,
              },
            },
            update: {
              startTime: '09:00:00',
              endTime: '17:00:00',
              slotDurationMinutes: 30,
              isActive: true,
            },
            create: {
              providerId,
              dayOfWeek: day,
              startTime: '09:00:00',
              endTime: '17:00:00',
              slotDurationMinutes: 30,
              isActive: true,
            },
          });
        }
        availability = await prisma.providerAvailability.findFirst({
          where: {
            providerId,
            dayOfWeek,
            isActive: true,
          },
        });
      }
    }

    if (!availability) {
      return res.status(200).json(successResponse([]));
    }

    // Get all active/confirmed appointments for this provider on this date
    // Include cross-midnight appointments that might overlap with early morning slots
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Also check previous day for appointments that extend past midnight
    const prevDay = new Date(startOfDay);
    prevDay.setUTCDate(prevDay.getUTCDate() - 1);

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
      slotStart.setUTCHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + slotDuration);

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
    const { providerId, scheduledAt, type, reason, durationMinutes, hospitalId } = req.body;

    if (!providerId || !scheduledAt || !type) {
      throw new ValidationError('providerId, scheduledAt, and type are required');
    }

    if (!Object.values(AppointmentType).includes(type)) {
      throw new ValidationError(
        `Invalid appointment type. Must be one of: ${Object.values(AppointmentType).join(', ')}`
      );
    }

    // Resolve providerId whether caller passed User.id or ProviderProfile.id
    let resolvedProviderId = providerId;
    const profileMatch = await prisma.providerProfile.findFirst({
      where: {
        OR: [{ id: providerId }, { userId: providerId }],
      },
      select: { userId: true },
    });
    if (profileMatch) {
      resolvedProviderId = profileMatch.userId;
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
    const dayOfWeek = (scheduledDate.getUTCDay() + 6) % 7; // UTC

    // Check provider availability
    let availability = await prisma.providerAvailability.findFirst({
      where: {
        providerId: resolvedProviderId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!availability) {
      const consultant = await prisma.user.findFirst({
        where: { id: resolvedProviderId, role: UserRole.CONSULTANT },
      });
      if (consultant) {
        for (let day = 0; day < 7; day++) {
          await prisma.providerAvailability.upsert({
            where: {
              providerId_dayOfWeek: {
                providerId: resolvedProviderId,
                dayOfWeek: day,
              },
            },
            update: {
              startTime: '09:00:00',
              endTime: '17:00:00',
              slotDurationMinutes: 30,
              isActive: true,
            },
            create: {
              providerId: resolvedProviderId,
              dayOfWeek: day,
              startTime: '09:00:00',
              endTime: '17:00:00',
              slotDurationMinutes: 30,
              isActive: true,
            },
          });
        }
        availability = await prisma.providerAvailability.findFirst({
          where: {
            providerId: resolvedProviderId,
            dayOfWeek,
            isActive: true,
          },
        });
      }
    }

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
    const reqHour = scheduledDate.getUTCHours(); // UTC
    const reqMin = scheduledDate.getUTCMinutes(); // UTC
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

    // Use immutable date instances
    const slotStart = new Date(scheduledDate.getTime());
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

    // Derive hospitalId from provider if not provided, or validate it matches provider's hospital
    let finalHospitalId = hospitalId;
    if (!finalHospitalId) {
      const provider = await prisma.user.findUnique({
        where: { id: resolvedProviderId },
        include: { providerProfile: true },
      });
      if (provider?.providerProfile?.hospitalId) {
        finalHospitalId = provider.providerProfile.hospitalId;
      }
    } else {
      // Validate that the provider belongs to the specified hospital
      const provider = await prisma.user.findUnique({
        where: { id: resolvedProviderId },
        include: { providerProfile: true },
      });
      if (provider?.providerProfile?.hospitalId !== finalHospitalId) {
        throw new ValidationError('Provider does not belong to the specified hospital');
      }
    }

    const lockKey = `lock:appointment:${resolvedProviderId}:${slotStart.getTime()}`;
    let lockAcquired = false;
    try {
      const lockRes = await redis.set(lockKey, '1', 'EX', 10, 'NX');
      lockAcquired = lockRes === 'OK' || lockRes === true || lockRes === 1;
    } catch (err) {
      // Redis unavailable: proceed WITHOUT the best-effort lock. Correctness
      // then rests on the Serializable transaction + overlap check below.
      console.warn(
        `[appointment] Redis slot-lock unavailable for ${lockKey}; relying on serializable guard`,
        err
      );
      lockAcquired = true;
    }

    if (!lockAcquired) {
      throw new AppError(
        'This time slot is currently being processed by another patient. Please try again or pick another time.',
        409,
        'APPOINTMENT_CONFLICT'
      );
    }

    try {
      let appointment;
      try {
        appointment = await prisma.$transaction(
          async (tx) => {
            const dayStart = new Date(slotStart.getTime());
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(slotStart.getTime());
            dayEnd.setUTCHours(23, 59, 59, 999); // UTC

            const conflictingAppointments = await tx.appointment.findMany({
              where: {
                providerId: resolvedProviderId,
                scheduledAt: {
                  gte: dayStart,
                  lte: dayEnd,
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
                providerId: resolvedProviderId,
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

            // Auto-create telemedicine room for VIDEO appointments. The external
            // provider identity is provisioned explicitly at token time.
            // Link BOTH directions: room.appointmentId and
            // appointment.telemedicineRoomId. The Prisma relation (and every
            // membership/include check) keys off appointment.telemedicineRoomId;
            // without it patients 403 on token mint for their own visit.
            if (type === AppointmentType.VIDEO) {
              const autoRoom = await tx.telemedicineRoom.create({
                data: {
                  providerId: resolvedProviderId,
                  appointmentId: appt.id,
                  roomType: 'ONE_ON_ONE',
                  externalRoomId: `ricton-${appt.id}`,
                  status: 'CREATED',
                },
              });
              await tx.appointment.update({
                where: { id: appt.id },
                data: { telemedicineRoomId: autoRoom.id },
              });
            }

            return appt;
          },
          // Serializable so the in-transaction overlap check is race-safe even
          // when the best-effort Redis slot lock is unavailable.
          { isolationLevel: 'Serializable', timeout: 30000, maxWait: 15000 }
        );
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === 'P2034'
        ) {
          throw new AppError(
            'This time slot changed concurrently. Please reload availability and try again.',
            409,
            'APPOINTMENT_CONFLICT'
          );
        }
        throw error;
      }

      res.status(201).json(successResponse(appointment));
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
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

    // Prevent cancellation of terminal status appointments
    if (
      [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.NO_SHOW,
        AppointmentStatus.CANCELLED,
      ].includes(appointment.status as any)
    ) {
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
  } catch (error) {
    next(error);
  }
};
