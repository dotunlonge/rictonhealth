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
// #C1 Leave: normalize a YYYY-MM-DD (or datetime) input to a UTC-midnight
// Date for the ProviderLeave @db.Date column so upsert + lookup agree.
export function leaveDay(input: string | Date): Date {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// #C1 Leave: true when the provider has a leave row covering `at`.
export async function isProviderOnLeave(providerId: string, at: Date): Promise<boolean> {
  const leave = await prisma.providerLeave.findFirst({
    where: { providerId, date: leaveDay(at) },
    select: { id: true },
  });
  return !!leave;
}

async function assertSameHospital(adminUserId: string, providerId: string): Promise<void> {
  const [adminUser, providerProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: adminUserId }, select: { hospitalId: true } }),
    prisma.providerProfile.findFirst({
      where: { OR: [{ id: providerId }, { userId: providerId }] },
      select: { hospitalId: true, userId: true },
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

// #C1 Leave: POST /leave — CONSULTANT own, HOSPITAL_ADMIN/SUPER_ADMIN any (upsert).
export const upsertLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const {
      providerId: bodyProviderId,
      date,
      reason,
    } = req.body as {
      providerId?: string;
      date?: string;
      reason?: string;
    };

    const providerId =
      userPayload.role === UserRole.CONSULTANT ? userPayload.userId : bodyProviderId;
    if (!providerId) {
      throw new ValidationError('providerId is required');
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      throw new ValidationError('date is required (YYYY-MM-DD)');
    }
    if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
      await assertSameHospital(userPayload.userId, providerId);
    }

    const leave = await prisma.providerLeave.upsert({
      where: { providerId_date: { providerId, date: leaveDay(date) } },
      create: { providerId, date: leaveDay(date), reason: reason?.trim() || null },
      update: { reason: reason?.trim() || null },
    });

    res.status(200).json(successResponse(leave));
  } catch (error) {
    next(error);
  }
};

// #C1 Leave: GET /leave?providerId=&from=&to= — list leave rows.
export const listLeaves = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const {
      providerId: queryProviderId,
      from,
      to,
    } = req.query as {
      providerId?: string;
      from?: string;
      to?: string;
    };

    // CONSULTANT sees only their own leave; staff may filter by provider.
    const providerId =
      userPayload.role === UserRole.CONSULTANT ? userPayload.userId : queryProviderId || undefined;

    const where: { providerId?: string; date?: { gte?: Date; lte?: Date } } = {};
    if (providerId) where.providerId = providerId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = leaveDay(from);
      if (to) where.date.lte = leaveDay(to);
    }

    const leaves = await prisma.providerLeave.findMany({
      where,
      orderBy: { date: 'asc' },
      take: 100,
    });

    res.status(200).json(successResponse(leaves));
  } catch (error) {
    next(error);
  }
};

// #C1 Leave: DELETE /leave/:id — CONSULTANT own, HOSPITAL_ADMIN/SUPER_ADMIN any.
export const deleteLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const leave = await prisma.providerLeave.findUnique({ where: { id } });
    if (!leave) {
      throw new NotFoundError('Leave not found');
    }
    if (userPayload.role === UserRole.CONSULTANT && leave.providerId !== userPayload.userId) {
      throw new ForbiddenError('You can only manage your own leave');
    }
    if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
      await assertSameHospital(userPayload.userId, leave.providerId);
    }

    await prisma.providerLeave.delete({ where: { id } });

    res.status(200).json(successResponse({ message: 'Leave deleted successfully' }));
  } catch (error) {
    next(error);
  }
};

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

    // Timezone: accept optional `timezone` query (default Africa/Lagos),
    // validate as IANA via Intl. Used for day-of-week evaluation where
    // possible, UTC fallback otherwise.
    const requestedTimezone = (req.query.timezone as string) || 'Africa/Lagos';
    let timezone = 'Africa/Lagos';
    try {
      Intl.DateTimeFormat(undefined, { timeZone: requestedTimezone });
      timezone = requestedTimezone;
    } catch {
      console.warn(`[appointment] invalid timezone "${requestedTimezone}"; falling back to UTC`);
      timezone = 'UTC';
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
    // #C1 Leave: a provider on leave offers no slots for the day.
    if (await isProviderOnLeave(providerId, targetDate)) {
      return res.status(200).json(successResponse([]));
    }
    // Convert JavaScript day (0=Sunday..6=Saturday) to schema day (0=Monday..6=Sunday)
    // Evaluate the day in the requested timezone when possible, UTC fallback.
    let dayOfWeek = (targetDate.getUTCDay() + 6) % 7; // UTC: availability windows are stored/evaluated in UTC
    try {
      const weekday = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short',
      }).format(targetDate);
      const weekdayMap: Record<string, number> = {
        Mon: 0,
        Tue: 1,
        Wed: 2,
        Thu: 3,
        Fri: 4,
        Sat: 5,
        Sun: 6,
      };
      if (weekday in weekdayMap) {
        dayOfWeek = weekdayMap[weekday];
      }
    } catch {
      // UTC fallback already set above
    }
    console.info(`[appointment] getAvailability timezone=${timezone} dayOfWeek=${dayOfWeek}`);

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
    const nowWithBuffer = new Date(Date.now() + 15 * 60000);

    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStart = new Date(targetDate);
      slotStart.setUTCHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);

      // Past slots offered then rejected (#10): never offer slots within
      // the 15-minute booking buffer.
      if (slotStart <= nowWithBuffer) {
        currentMinutes += slotDuration;
        continue;
      }

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

    // #23 Verified gate: only verified providers are bookable.
    const providerVerification = await prisma.providerProfile.findUnique({
      where: { userId: resolvedProviderId },
      select: { isVerified: true },
    });
    if (!providerVerification?.isVerified) {
      throw new ValidationError('Provider is not yet verified');
    }

    if (resolvedProviderId === userPayload.userId) {
      throw new ValidationError('You cannot book an appointment with yourself');
    }

    const scheduledDate = new Date(scheduledAt);

    // #C1 Leave: never book a provider on leave.
    if (await isProviderOnLeave(resolvedProviderId, scheduledDate)) {
      throw new ValidationError('Provider is on leave on this date');
    }

    // Validate that scheduledAt is not in the past
    const now = new Date();
    if (scheduledDate < now) {
      throw new ValidationError('Cannot book appointments in the past');
    }

    // #63 Booking buffer: reject bookings < 15min ahead (slots list already hides them).
    if (scheduledDate.getTime() < Date.now() + 15 * 60000) {
      throw new ValidationError('Book at least 15 minutes ahead');
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

    if (slotDuration !== availability.slotDurationMinutes) {
      throw new ValidationError('Appointment duration must match the provider slot duration');
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
    if (type === AppointmentType.IN_PERSON && !finalHospitalId) {
      throw new ValidationError('An in-person appointment requires a clinic venue');
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
            // #64 Overnight spill: interval query (not day-bounded) so cross-day
            // overlaps are not missed. #63 BUFFER_MINUTES=5: expand existing
            // appointments by 5min each side to block back-to-back `==` edges.
            const BUFFER_MINUTES = 5;
            const rangeStart = new Date(slotStart.getTime() - 12 * 60 * 60000);
            const rangeEnd = new Date(slotEnd.getTime() + 12 * 60 * 60000);

            const conflictingAppointments = await tx.appointment.findMany({
              where: {
                providerId: resolvedProviderId,
                scheduledAt: {
                  gte: rangeStart,
                  lte: rangeEnd,
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
              // #63 BUFFER_MINUTES=5: back-to-back `==` counts as overlap.
              const bufferedStart = new Date(aptStart.getTime() - BUFFER_MINUTES * 60000);
              const bufferedEnd = new Date(aptEnd.getTime() + BUFFER_MINUTES * 60000);
              return slotStart < bufferedEnd && slotEnd > bufferedStart;
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
                feeSnapshot:
                  (
                    await tx.providerProfile.findUnique({
                      where: { userId: resolvedProviderId },
                      select: { consultationFee: true },
                    })
                  )?.consultationFee ?? null,
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
        take: Math.min(Number(limit) || 20, 50),
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
          limit: Math.min(Number(limit) || 20, 50),
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
    } else if (
      userPayload.role !== UserRole.PATIENT &&
      userPayload.role !== UserRole.CONSULTANT &&
      userPayload.role !== UserRole.SUPER_ADMIN
    ) {
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
    const { status, cancellationReason, waivedReason } = req.body;
    const telemedicineConsent = (req.body as { telemedicineConsent?: boolean }).telemedicineConsent;
    // #C2 Follow-up: optional due date, persisted only on COMPLETED.
    const followUpRaw = (req.body as { followUpAt?: string }).followUpAt;
    let followUpAt: Date | undefined;
    if (followUpRaw !== undefined) {
      followUpAt = new Date(followUpRaw);
      if (Number.isNaN(followUpAt.getTime())) {
        throw new ValidationError('followUpAt must be a valid datetime');
      }
      if (status !== AppointmentStatus.COMPLETED) {
        throw new ValidationError('followUpAt can only be set when completing a visit');
      }
    }

    if (!status || !Object.values(AppointmentStatus).includes(status)) {
      throw new ValidationError(
        `Invalid status. Must be one of: ${Object.values(AppointmentStatus).join(', ')}`
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        telemedicineRoom: true,
        payment: true,
        provider: { select: { providerProfile: { select: { consultationFee: true } } } },
      },
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

    if (status === AppointmentStatus.CONFIRMED) {
      // #39 Verified gate: an unverified provider's visits cannot confirm.
      // Best-effort lookup — fail closed when the profile is missing/unverified.
      const confirmVerification = await prisma.providerProfile.findUnique({
        where: { userId: appointment.providerId },
        select: { isVerified: true },
      });
      if (!confirmVerification?.isVerified) {
        throw new ForbiddenError('Provider is not yet verified');
      }
      const fee = appointment.feeSnapshot ?? appointment.provider.providerProfile?.consultationFee;
      const isFree = fee == null || Number(fee) === 0;
      const isPaid = appointment.payment?.status === 'SUCCESS';
      if (!isFree && !isPaid && !waivedReason?.trim()) {
        throw new ValidationError(
          'Payment must succeed before confirmation, or staff must provide a waiver reason'
        );
      }
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

    // #56 Visit consent: VIDEO visits require per-visit consent before starting.
    if (
      status === AppointmentStatus.IN_PROGRESS &&
      appointment.type === AppointmentType.VIDEO &&
      !telemedicineConsent &&
      !appointment.telemedicineConsentAt
    ) {
      throw new ValidationError('Telemedicine consent required');
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        cancellationReason: status === AppointmentStatus.CANCELLED ? cancellationReason : undefined,
        waivedReason:
          status === AppointmentStatus.CONFIRMED && waivedReason ? waivedReason.trim() : undefined,
        cancelledBy: status === AppointmentStatus.CANCELLED ? userPayload.role : undefined,
        // #56 Visit consent: stamp per-visit telemedicine consent when a VIDEO visit starts.
        ...(status === AppointmentStatus.IN_PROGRESS &&
        appointment.type === AppointmentType.VIDEO &&
        telemedicineConsent
          ? { telemedicineConsentAt: new Date() }
          : {}),
        // #C2 Follow-up: persist the recall due date on completion.
        ...(status === AppointmentStatus.COMPLETED && followUpAt ? { followUpAt } : {}),
      },
      include: {
        patient: { select: { id: true, email: true, phone: true, patientProfile: true } },
        provider: { select: { id: true, email: true, phone: true, providerProfile: true } },
      },
    });

    // Audit every status change (best-effort; never blocks the response).
    try {
      await prisma.auditLog.create({
        data: {
          actorId: userPayload.userId,
          action: 'APPOINTMENT_STATUS_CHANGE',
          resourceType: 'Appointment',
          resourceId: id,
          metadata: { from: appointment.status, to: status } as never,
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });
    } catch (err) {
      console.warn(`[appointment] audit log failed for status change ${id}`, err);
    }

    // Rewards earn on COMPLETED (best-effort; @@unique guard ignores replays).
    if (status === AppointmentStatus.COMPLETED) {
      try {
        await prisma.rewardTransaction.create({
          data: {
            userId: updatedAppointment.patientId,
            type: 'EARN',
            points: 50,
            source: 'APPOINTMENT',
            description: 'Completed appointment',
            referenceId: updatedAppointment.id,
          },
        });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'P2002') {
          console.warn(`[appointment] reward earn failed for ${id}`, err);
        }
      }
    }

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

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      throw new ValidationError('A cancellation reason is required');
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { telemedicineRoom: true, payment: true },
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
    if (userPayload.role === UserRole.HOSPITAL_ADMIN || userPayload.role === UserRole.SUPER_ADMIN) {
      if (userPayload.role === UserRole.HOSPITAL_ADMIN) {
        const admin = await prisma.user.findUnique({
          where: { id: userPayload.userId },
          select: { hospitalId: true },
        });
        if (!admin?.hospitalId || admin.hospitalId !== appointment.hospitalId) {
          throw new ForbiddenError('You are not authorized to cancel this appointment');
        }
      }
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
        cancellationReason: reason.trim(),
        cancelledBy: userPayload.role,
      },
      include: {
        patient: { select: { id: true, email: true, phone: true, patientProfile: true } },
        provider: { select: { id: true, email: true, phone: true, providerProfile: true } },
      },
    });

    // Late-cancel: within 4h of scheduledAt counts as late.
    const isLateCancel =
      new Date(appointment.scheduledAt).getTime() - Date.now() < 4 * 60 * 60 * 1000;

    // Audit every cancellation (best-effort).
    try {
      await prisma.auditLog.create({
        data: {
          actorId: userPayload.userId,
          action: 'APPOINTMENT_STATUS_CHANGE',
          resourceType: 'Appointment',
          resourceId: id,
          metadata: {
            from: appointment.status,
            to: AppointmentStatus.CANCELLED,
            isLateCancel,
          } as never,
          ipAddress: req.ip || '',
          userAgent: req.headers['user-agent'] || '',
        },
      });
    } catch (err) {
      console.warn(`[appointment] audit log failed for cancel ${id}`, err);
    }

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
        ? `The patient cancelled their visit on ${slotLabel(updatedAppointment.scheduledAt)}.${reason ? ` Reason: ${reason}` : ''}${isLateCancel ? ' (late cancellation)' : ''}`
        : `Your visit on ${slotLabel(updatedAppointment.scheduledAt)} was cancelled by the clinic.${reason ? ` Reason: ${reason}` : ''}${isLateCancel ? ' (late cancellation)' : ''}`,
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
        metadata: { appointmentId: updatedAppointment.id, isLateCancel } as never,
      });
    } catch (err) {
      console.warn(`[appointment] IN_APP pre-response failed for ${cancelNudge.userId}`, err);
    }

    res.status(200).json(successResponse(updatedAppointment, { isLateCancel } as never));

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
            // #64 Overnight spill: interval query (not day-bounded) so cross-day
            // overlaps are not missed. #63 BUFFER_MINUTES=5: expand existing
            // appointments by 5min each side to block back-to-back `==` edges.
            const BUFFER_MINUTES = 5;
            const rangeStart = new Date(slotStart.getTime() - 12 * 60 * 60000);
            const rangeEnd = new Date(slotEnd.getTime() + 12 * 60 * 60000);

            const conflictingAppointments = await tx.appointment.findMany({
              where: {
                providerId: appointment.providerId,
                id: { not: appointment.id },
                scheduledAt: { gte: rangeStart, lte: rangeEnd },
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
              // #63 BUFFER_MINUTES=5: back-to-back `==` counts as overlap.
              const bufferedStart = new Date(aptStart.getTime() - BUFFER_MINUTES * 60000);
              const bufferedEnd = new Date(aptEnd.getTime() + BUFFER_MINUTES * 60000);
              return slotStart < bufferedEnd && slotEnd > bufferedStart;
            });
            if (hasConflict) {
              throw new AppError('This time slot is already booked', 409, 'APPOINTMENT_CONFLICT');
            }
            return tx.appointment.update({
              where: { id: appointment.id },
              data: { scheduledAt: slotStart, durationMinutes: slotDuration, reminderSentAt: null },
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

/**
 * #20 Reviews: POST /:id/reviews — PATIENT rates their own COMPLETED visit.
 * One review per visit (reviews.appointmentId is UNIQUE; P2002 → 409).
 * Rating must be an integer 1-5.
 */
export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.PATIENT) {
      throw new ForbiddenError('Only patients can submit reviews');
    }
    const { id } = req.params;
    const { rating, comment } = req.body as { rating?: unknown; comment?: unknown };

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new ValidationError('rating must be an integer between 1 and 5');
    }
    if (comment !== undefined && typeof comment !== 'string') {
      throw new ValidationError('comment must be a string');
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true, patientId: true, providerId: true, status: true },
    });
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }
    if (appointment.patientId !== userPayload.userId) {
      throw new ForbiddenError('You can only review your own visits');
    }
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new ValidationError('Only completed visits can be reviewed');
    }

    try {
      const review = await (prisma as any).review.create({
        data: {
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          providerId: appointment.providerId,
          rating: ratingNum,
          comment: typeof comment === 'string' && comment.trim() ? comment.trim() : null,
        },
      });
      res.status(201).json(successResponse(review));
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw new AppError('This visit has already been reviewed', 409, 'REVIEW_CONFLICT');
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * #20 Reviews: GET /providers/:id/reviews — public paginated review list
 * for a provider (accepts User.id or ProviderProfile.id).
 */
export const getProviderReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    let providerId = rawId;
    const profileMatch = await prisma.providerProfile.findFirst({
      where: { OR: [{ id: rawId }, { userId: rawId }] },
      select: { userId: true },
    });
    if (profileMatch) {
      providerId = profileMatch.userId;
    }

    const [reviews, total] = await Promise.all([
      (prisma as any).review.findMany({
        where: { providerId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).review.count({ where: { providerId } }),
    ]);

    res.status(200).json(successResponse({ reviews, total, limit, offset }));
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-close past visits (#15). CONFIRMED/IN_PROGRESS whose end
 * (scheduledAt + duration) is past `now` become NO_SHOW; PENDING past-end
 * become CANCELLED with reason 'Auto-closed: past scheduled time'.
 */
export async function sweepPastAppointments(now = new Date()) {
  const candidates = await prisma.appointment.findMany({
    where: {
      status: {
        in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      },
      scheduledAt: { lt: now },
    },
    select: { id: true, scheduledAt: true, durationMinutes: true, status: true, patientId: true },
  });
  const isPastEnd = (scheduledAt: Date, durationMinutes: number) =>
    new Date(scheduledAt).getTime() + durationMinutes * 60000 < now.getTime();
  const noShowIds = candidates
    .filter(
      (a) =>
        (a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.IN_PROGRESS) &&
        isPastEnd(a.scheduledAt, a.durationMinutes)
    )
    .map((a) => a.id);
  const pendingIds = candidates
    .filter(
      (a) => a.status === AppointmentStatus.PENDING && isPastEnd(a.scheduledAt, a.durationMinutes)
    )
    .map((a) => a.id);
  if (noShowIds.length > 0) {
    await prisma.appointment.updateMany({
      where: { id: { in: noShowIds } },
      data: { status: AppointmentStatus.NO_SHOW },
    });
    // #60 NO_SHOW notify: sweep was silent; inform the patient (best-effort).
    for (const a of candidates.filter((c) => noShowIds.includes(c.id))) {
      try {
        await createAppointmentNotification({
          userId: a.patientId,
          type: 'APPOINTMENT_NO_SHOW',
          title: 'Missed appointment',
          body: `You missed your visit on ${slotLabel(a.scheduledAt)}. Please rebook from your appointments list.`,
          metadata: { appointmentId: a.id } as never,
        });
      } catch (err) {
        console.warn(`[appointment] NO_SHOW notify failed for ${a.id}`, err);
      }
    }
  }
  if (pendingIds.length > 0) {
    await prisma.appointment.updateMany({
      where: { id: { in: pendingIds } },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: 'Auto-closed: past scheduled time',
      },
    });
  }
  return { noShow: noShowIds.length, autoCancelled: pendingIds.length };
}
