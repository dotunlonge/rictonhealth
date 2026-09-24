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
import { createAppointmentNotification, sendAppointmentNudges, slotLabel } from '../notifications';

/**
 * True when a Prisma/Postgres error represents a concurrent booking conflict:
 * serializable write conflict (P2034 / 40001), deadlock (40P01), or the
 * `no_overlapping_provider_bookings` exclusion violation (23P01, surfaced by
 * Prisma as P2010/raw-query failure). All must surface as 409, never 500.
 */
export function isSlotConflictError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const rec = error as { code?: unknown; message?: unknown };
  const code = typeof rec.code === 'string' ? rec.code : '';
  const message = rec.message instanceof Error ? rec.message.message : String(rec.message ?? '');
  if (code === 'P2034' || code === '40001' || code === '40P01') return true;
  if (/exclusion constraint|23P01|no_overlapping_provider_bookings/i.test(message)) return true;
  if (code === 'P2010' && /conflict|exclusion|overlap/i.test(message)) return true;
  return false;
}
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

    // Multi-tenant guard: a hospital admin may only set hours for providers
    // in their own hospital. SUPER_ADMIN is platform-wide; consultants act
    // only as themselves (resolved above).
    if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
      const [adminUser, providerProfile] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userPayload.userId },
          select: { hospitalId: true },
        }),
        prisma.providerProfile.findFirst({
          where: { OR: [{ id: providerId }, { userId: providerId }] },
          select: { hospitalId: true },
        }),
      ]);
      if (
        !adminUser?.hospitalId ||
        !providerProfile?.hospitalId ||
        adminUser.hospitalId !== providerProfile.hospitalId
      ) {
        throw new ForbiddenError('You can only manage providers in your hospital');
      }
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
      // Auto-provision standard weekly availability (09:00 - 17:00, 30m slots) for active consultants.
      // Intentional default (product sign-off) — logged so ops can spot
      // unconfigured providers in the schedule.
      const consultant = await prisma.user.findFirst({
        where: { id: providerId, role: UserRole.CONSULTANT },
      });
      if (consultant) {
        console.info(
          `[appointment] auto-provisioning default 09:00-17:00 availability for provider ${providerId}`
        );
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
        // Intentional default (product sign-off): a consultant who never
        // configured hours is bookable 09:00–17:00 daily. Logged so ops can
        // spot unconfigured providers in the schedule.
        console.info(
          `[appointment] auto-provisioning default 09:00-17:00 availability for provider ${resolvedProviderId}`
        );
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
    // Best-effort exact-slot lock: serializes the common case (same grid
    // slot). Offset overlaps (different durations) and cross-midnight ranges
    // bypass this key and fall through to the Serializable overlap check +
    // the no_overlapping_provider_bookings exclusion constraint below, both
    // of which surface 409 APPOINTMENT_CONFLICT (see isSlotConflictError).
    let lockAcquired = false;
    try {
      const lockRes = await redis.set(lockKey, '1', 'EX', 30, 'NX');
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
        if (isSlotConflictError(error)) {
          throw new AppError(
            'This time slot is no longer available — it may overlap another visit. Please pick another time.',
            409,
            'APPOINTMENT_CONFLICT'
          );
        }
        throw error;
      }

      // Lifecycle notifications. IN_APP rows are written BEFORE responding
      // (DB-only, no Redis coupling) so the inbox is consistent the moment
      // the client refreshes; a failure here logs and still responds.
      // EMAIL/SMS stay post-response so a sick queue can never stall a booking.
      const slot = slotLabel(slotStart);
      const meta = { appointmentId: appointment.id, scheduledAt: slotStart.toISOString() };
      const bookedNudges = [
        {
          userId: appointment.patientId,
          type: 'APPOINTMENT_BOOKED' as const,
          title: 'Appointment requested',
          body: `Your ${type === AppointmentType.VIDEO ? 'video' : 'in-person'} visit is booked for ${slot} and awaiting provider confirmation.`,
          email: appointment.patient?.email,
          phone: appointment.patient?.phone,
        },
        {
          userId: resolvedProviderId,
          type: 'APPOINTMENT_BOOKED' as const,
          title: 'New booking request',
          body: `A patient booked a ${type === AppointmentType.VIDEO ? 'video' : 'in-person'} visit for ${slot}. Please confirm.`,
          email: appointment.provider?.email,
          phone: appointment.provider?.phone,
        },
      ];
      for (const n of bookedNudges) {
        try {
          await createAppointmentNotification({ ...n, metadata: meta });
        } catch (err) {
          console.warn(`[appointment] IN_APP pre-response failed for ${n.userId}`, err);
        }
      }

      res.status(201).json(successResponse(appointment));

      for (const n of bookedNudges) {
        await sendAppointmentNudges(n);
      }
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
        // Fail closed: a hospital-less admin sees nothing (matching on
        // hospitalId null would leak hospital-less appointments instead).
        throw new ForbiddenError('Admin account is not linked to a hospital');
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
          // Paid badges: clients show PAID/UNPAID without a second round-trip.
          // Payment stays advisory (cash/offline flows exist) — confirmation
          // never blocks on it.
          payment: { select: { id: true, status: true, amount: true } },
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
        // Paid badges (advisory — cash/offline flows exist).
        payment: { select: { id: true, status: true, amount: true } },
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

    // Clinical workflow guard: visits move forward only. Skipping stages
    // (e.g. PENDING straight to COMPLETED) fabricates care history, and
    // terminal states are immutable. Use cancel/reschedule for changes.
    // CONFIRMED may complete directly: small clinics end the visit without a
    // separate "start visit" tap, and nothing keys off IN_PROGRESS today.
    const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELLED]: [],
      [AppointmentStatus.NO_SHOW]: [],
    };
    if (
      status !== appointment.status &&
      !ALLOWED_TRANSITIONS[appointment.status as AppointmentStatus].includes(
        status as AppointmentStatus
      )
    ) {
      throw new ValidationError(`Cannot move appointment from ${appointment.status} to ${status}`);
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

    // Lifecycle notifications (best-effort). This endpoint is staff-only, so
    // confirmations and cancellations here always inform the patient. IN_APP
    // is written pre-response (durable); nudges go post-response (queued).
    const statusNudge =
      status === AppointmentStatus.CONFIRMED
        ? {
            userId: updatedAppointment.patientId,
            type: 'APPOINTMENT_CONFIRMED' as const,
            title: 'Appointment confirmed',
            body: `Your visit on ${slotLabel(updatedAppointment.scheduledAt)} is confirmed. Join from your appointments list when it is time.`,
            email: updatedAppointment.patient?.email,
            phone: updatedAppointment.patient?.phone,
          }
        : status === AppointmentStatus.CANCELLED
          ? {
              userId: updatedAppointment.patientId,
              type: 'APPOINTMENT_CANCELLED' as const,
              title: 'Appointment cancelled',
              body: `Your visit on ${slotLabel(updatedAppointment.scheduledAt)} was cancelled by the clinic.${cancellationReason ? ` Reason: ${cancellationReason}` : ''}`,
              email: updatedAppointment.patient?.email,
              phone: updatedAppointment.patient?.phone,
            }
          : null;
    if (statusNudge) {
      try {
        await createAppointmentNotification({
          ...statusNudge,
          metadata: { appointmentId: updatedAppointment.id },
        });
      } catch (err) {
        console.warn(`[appointment] IN_APP pre-response failed for ${statusNudge.userId}`, err);
      }
    }

    res.status(200).json(successResponse(updatedAppointment));

    if (statusNudge) {
      await sendAppointmentNudges(statusNudge);
    }
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

    // Notify the other party (best-effort): patient cancel → provider,
    // consultant cancel → patient. IN_APP pre-response (durable), nudges
    // post-response (queued).
    const cancelledByPatient = userPayload.role === UserRole.PATIENT;
    const cancelNudge = {
      userId: cancelledByPatient ? updatedAppointment.providerId : updatedAppointment.patientId,
      type: 'APPOINTMENT_CANCELLED' as const,
      title: 'Appointment cancelled',
      body: cancelledByPatient
        ? `The patient cancelled their visit on ${slotLabel(updatedAppointment.scheduledAt)}.${reason ? ` Reason: ${reason}` : ''}`
        : `Your visit on ${slotLabel(updatedAppointment.scheduledAt)} was cancelled by the clinic.${reason ? ` Reason: ${reason}` : ''}`,
      email: cancelledByPatient
        ? updatedAppointment.provider?.email
        : updatedAppointment.patient?.email,
      phone: cancelledByPatient
        ? updatedAppointment.provider?.phone
        : updatedAppointment.patient?.phone,
    };
    try {
      await createAppointmentNotification({
        ...cancelNudge,
        metadata: { appointmentId: updatedAppointment.id },
      });
    } catch (err) {
      console.warn(`[appointment] IN_APP pre-response failed for ${cancelNudge.userId}`, err);
    }

    res.status(200).json(successResponse(updatedAppointment));

    await sendAppointmentNudges(cancelNudge);
  } catch (error) {
    next(error);
  }
};

/**
 * Move a PENDING/CONFIRMED appointment to a new slot with the same provider.
 * Re-runs the booking validations (future, grid-aligned, inside the provider
 * window, no overlap excluding self) under the same Redis slot-lock +
 * Serializable guard, so rescheduling can never double-book. The linked
 * VIDEO room follows automatically: the join window derives from the
 * appointment's scheduledAt, so no room changes are needed.
 */
export const rescheduleAppointment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const { scheduledAt, durationMinutes } = req.body as {
      scheduledAt?: string;
      durationMinutes?: number;
    };

    if (!scheduledAt) {
      throw new ValidationError('scheduledAt is required');
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }

    if (userPayload.role === UserRole.PATIENT && appointment.patientId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to reschedule this appointment');
    }
    if (userPayload.role === UserRole.CONSULTANT && appointment.providerId !== userPayload.userId) {
      throw new ForbiddenError('You are not authorized to reschedule this appointment');
    }

    if (
      !([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] as AppointmentStatus[]).includes(
        appointment.status as AppointmentStatus
      )
    ) {
      throw new ValidationError(
        `Only PENDING or CONFIRMED appointments can be rescheduled (current: ${appointment.status})`
      );
    }

    const slotStart = new Date(scheduledAt);
    if (Number.isNaN(slotStart.getTime())) {
      throw new ValidationError('scheduledAt must be a valid datetime');
    }
    if (slotStart < new Date()) {
      throw new ValidationError('Cannot reschedule appointments into the past');
    }
    if (slotStart.getSeconds() !== 0 || slotStart.getMilliseconds() !== 0) {
      throw new ValidationError(
        'Appointment time must be aligned to minute boundaries (seconds and milliseconds must be 0)'
      );
    }

    const dayOfWeek = (slotStart.getUTCDay() + 6) % 7;
    const availability = await prisma.providerAvailability.findFirst({
      where: { providerId: appointment.providerId, dayOfWeek, isActive: true },
    });
    if (!availability) {
      throw new ValidationError('Provider is not available on this day');
    }
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);
    const slotDuration = durationMinutes || appointment.durationMinutes;
    if (slotDuration <= 0) {
      throw new ValidationError('Slot duration must be positive');
    }
    const reqMinutes = slotStart.getUTCHours() * 60 + slotStart.getUTCMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    if (reqMinutes < startMinutes || reqMinutes + slotDuration > endMinutes) {
      throw new ValidationError('Requested time is outside the provider availability window');
    }
    if ((reqMinutes - startMinutes) % availability.slotDurationMinutes !== 0) {
      throw new ValidationError('Requested time must align to the provider slot grid');
    }
    const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

    const lockKey = `lock:appointment:${appointment.providerId}:${slotStart.getTime()}`;
    let lockAcquired = false;
    try {
      const lockRes = await redis.set(lockKey, '1', 'EX', 30, 'NX');
      lockAcquired = lockRes === 'OK' || lockRes === true || lockRes === 1;
    } catch (err) {
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
      let updated;
      try {
        updated = await prisma.$transaction(
          async (tx) => {
            const dayStart = new Date(slotStart.getTime());
            dayStart.setUTCHours(0, 0, 0, 0);
            const dayEnd = new Date(slotStart.getTime());
            dayEnd.setUTCHours(23, 59, 59, 999);

            const conflictingAppointments = await tx.appointment.findMany({
              where: {
                providerId: appointment.providerId,
                id: { not: appointment.id },
                scheduledAt: { gte: dayStart, lte: dayEnd },
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
            return tx.appointment.update({
              where: { id: appointment.id },
              data: { scheduledAt: slotStart, durationMinutes: slotDuration },
              include: {
                patient: { select: { id: true, email: true, phone: true } },
                provider: { select: { id: true, email: true, phone: true } },
              },
            });
          },
          { isolationLevel: 'Serializable', timeout: 30000, maxWait: 15000 }
        );
      } catch (error) {
        if (isSlotConflictError(error)) {
          throw new AppError(
            'This time slot is no longer available — it may overlap another visit. Please pick another time.',
            409,
            'APPOINTMENT_CONFLICT'
          );
        }
        throw error;
      }
      // Notify the other party. IN_APP pre-response (durable), nudges
      // post-response (queued).
      const movedByPatient = userPayload.role === UserRole.PATIENT;
      const other = movedByPatient ? updated.provider : updated.patient;
      const rescheduleNudge = {
        userId: movedByPatient ? updated.providerId : updated.patientId,
        type: 'APPOINTMENT_RESCHEDULED' as const,
        title: 'Appointment rescheduled',
        body: movedByPatient
          ? `The patient moved their visit to ${slotLabel(slotStart)}.`
          : `Your visit was moved to ${slotLabel(slotStart)}.`,
        email: other?.email,
        phone: other?.phone,
      };
      const rescheduleMeta = {
        appointmentId: updated.id,
        scheduledAt: slotStart.toISOString(),
        previousScheduledAt: appointment.scheduledAt.toISOString(),
      };
      try {
        await createAppointmentNotification({ ...rescheduleNudge, metadata: rescheduleMeta });
      } catch (err) {
        console.warn(`[appointment] IN_APP pre-response failed for ${rescheduleNudge.userId}`, err);
      }

      res.status(200).json(successResponse(updated));

      await sendAppointmentNudges(rescheduleNudge);
    } finally {
      await redis.del(lockKey).catch(() => {});
    }
  } catch (error) {
    next(error);
  }
};
