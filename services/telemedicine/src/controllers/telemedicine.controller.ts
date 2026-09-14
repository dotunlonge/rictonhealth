import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  prisma,
  UserRole,
  TelemedicineRoomStatus,
  TelemedicineRoomType,
  ParticipantRole,
  AppointmentStatus,
  AppointmentType,
} from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ForbiddenError, AppError } from '@ricton/shared';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

// LiveKit is the video provider (Twilio Programmable Video is sunset and
// cannot provision rooms). Rooms are named after our session id; the provider
// never invents identity — see ensureLiveKitRoom.
function getLiveKitConfig() {
  const url = process.env.LIVEKIT_URL || '';
  const apiKey = process.env.LIVEKIT_API_KEY || '';
  const apiSecret = process.env.LIVEKIT_API_SECRET || '';
  return { url, apiKey, apiSecret };
}

function isLiveKitConfigured(): boolean {
  const { url, apiKey, apiSecret } = getLiveKitConfig();
  if (!url || !apiKey || !apiSecret) return false;
  if (url.includes('your_livekit_host')) return false;
  return true;
}

function createRoomServiceClient(): RoomServiceClient {
  const { url, apiKey, apiSecret } = getLiveKitConfig();
  return new RoomServiceClient(url, apiKey, apiSecret);
}

export function assertAppointmentJoinWindow(appointment: {
  scheduledAt: Date;
  durationMinutes: number;
  status: AppointmentStatus;
}) {
  if (
    appointment.status === AppointmentStatus.CANCELLED ||
    appointment.status === AppointmentStatus.COMPLETED
  ) {
    throw new ForbiddenError('This appointment is no longer eligible for a video session');
  }
  const earlyMinutes = Number(process.env.TELEMEDICINE_JOIN_EARLY_MINUTES || 15);
  const lateMinutes = Number(process.env.TELEMEDICINE_JOIN_LATE_MINUTES || 30);
  const scheduledAt = appointment.scheduledAt.getTime();
  const opensAt = scheduledAt - earlyMinutes * 60_000;
  const closesAt = scheduledAt + (appointment.durationMinutes + lateMinutes) * 60_000;
  const now = Date.now();
  if (process.env.NODE_ENV === 'production') {
    if (now < opensAt || now > closesAt) {
      throw new ForbiddenError('This video session is outside its appointment join window');
    }
  } else if (now < opensAt || now > closesAt) {
    console.warn(
      `[telemedicine] Non-production bypass of join window: scheduledAt=${appointment.scheduledAt.toISOString()}, now=${new Date(now).toISOString()}`
    );
  }
}

/**
 * Admit-by-code for ad-hoc instant rooms (no appointment).
 *
 * The room id is an unguessable UUID that the host shares out-of-band (the
 * web UI literally says "Share your room code"). Possession of the code is
 * the admission credential — same model as a Zoom meeting link. The admit is
 * recorded as a PARTICIPANT row, so membership audit trails stay intact.
 *
 * Appointment-linked rooms NEVER admit this way: they stay strictly
 * member-only with join-window enforcement (clinical authorization).
 */
async function tryAdmitByRoomCode(
  room: { id: string; appointmentId: string | null; status: TelemedicineRoomStatus },
  userPayload: JwtPayload
): Promise<boolean> {
  if (room.appointmentId) return false;
  if (
    room.status !== TelemedicineRoomStatus.CREATED &&
    room.status !== TelemedicineRoomStatus.ACTIVE
  ) {
    return false;
  }
  if (userPayload.role !== UserRole.PATIENT && userPayload.role !== UserRole.CONSULTANT) {
    return false;
  }
  const existing = await prisma.telemedicineParticipant.findFirst({
    where: { roomId: room.id, userId: userPayload.userId },
    select: { id: true },
  });
  if (!existing) {
    await prisma.telemedicineParticipant.create({
      data: {
        roomId: room.id,
        userId: userPayload.userId,
        role: ParticipantRole.PARTICIPANT,
      },
    });
  }
  return true;
}

/** Membership: room participant, appointment party, or platform admin. */
async function assertRoomMembership(
  roomId: string,
  userPayload: JwtPayload,
  participants?: Array<{ userId: string }>
): Promise<void> {
  if (userPayload.role === UserRole.SUPER_ADMIN) return;
  const memberIds = participants
    ? participants.map((p) => p.userId)
    : (
        await prisma.telemedicineParticipant.findMany({
          where: { roomId },
          select: { userId: true },
        })
      ).map((p) => p.userId);
  if (memberIds.includes(userPayload.userId)) return;
  const room = await prisma.telemedicineRoom.findUnique({
    where: { id: roomId },
    select: {
      providerId: true,
      appointment: { select: { patientId: true, providerId: true } },
    },
  });
  if (
    room &&
    (room.providerId === userPayload.userId ||
      room.appointment?.patientId === userPayload.userId ||
      room.appointment?.providerId === userPayload.userId)
  ) {
    return;
  }
  throw new ForbiddenError('You are not a participant of this telemedicine session');
}

/**
 * Ensure a real LiveKit room exists for the session (explicit lifecycle).
 * LiveKit rooms are named after our session id; the server URL (never a
 * fabricated console link) is what clients join. Idempotent by name.
 */
async function ensureLiveKitRoom(roomId: string): Promise<string> {
  const client = createRoomServiceClient();
  try {
    const existing = await client.listRooms([roomId]);
    if (existing.length > 0) return existing[0].name || roomId;
  } catch {
    // Fall through to create.
  }
  try {
    const created = await client.createRoom({ name: roomId });
    await prisma.telemedicineRoom.update({
      where: { id: roomId },
      data: { externalRoomId: created.name || roomId, externalRoomUrl: null },
    });
    return created.name || roomId;
  } catch (err: any) {
    throw new AppError(
      `LiveKit room provisioning failed: ${err?.message || 'provider unavailable'}`,
      502,
      'LIVEKIT_ERROR'
    );
  }
}

/** Delete the provider room before reporting the local session as ended. */
async function completeLiveKitRoom(roomName: string | null): Promise<void> {
  // Rooms keep a local ricton-* identity until the first access token
  // provisions the provider resource. Nothing external exists in that case.
  if (!roomName || roomName.startsWith('ricton-')) return;
  if (!isLiveKitConfigured()) {
    throw new AppError(
      'Video calling is not configured; the provider room could not be ended safely.',
      503,
      'SERVICE_NOT_CONFIGURED'
    );
  }
  try {
    await createRoomServiceClient().deleteRoom(roomName);
  } catch (error: any) {
    // Deleting an already-gone room is the desired terminal state.
    const msg = String(error?.message || '');
    if (/not found|does not exist/i.test(msg)) return;
    throw new AppError(
      `LiveKit room deletion failed: ${error?.message || 'provider unavailable'}`,
      502,
      'LIVEKIT_ERROR'
    );
  }
}

export const listRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const skip = Math.max(Number(req.query.offset) || 0, 0);

    const whereClause: any = {};
    if (userPayload.role === UserRole.CONSULTANT) {
      whereClause.providerId = userPayload.userId;
    } else if (userPayload.role === UserRole.PATIENT) {
      whereClause.OR = [
        { participants: { some: { userId: userPayload.userId } } },
        { appointment: { patientId: userPayload.userId } },
      ];
    } else if (userPayload.role !== UserRole.SUPER_ADMIN) {
      whereClause.participants = { some: { userId: userPayload.userId } };
    }

    const rooms = await prisma.telemedicineRoom.findMany({
      where: whereClause,
      include: {
        provider: {
          select: {
            id: true,
            email: true,
            providerProfile: true,
          },
        },
        appointment: {
          select: {
            id: true,
            type: true,
            scheduledAt: true,
            patient: {
              select: {
                id: true,
                email: true,
                patientProfile: true,
              },
            },
          },
        },
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    res.status(200).json(successResponse(rooms));
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { appointmentId, roomType: rawRoomType } = req.body;

    const roomType =
      rawRoomType === 'MDT' ? TelemedicineRoomType.MDT : TelemedicineRoomType.ONE_ON_ONE;

    let patientId: string | null = null;
    let hostProviderId: string = userPayload.userId;

    if (appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appt) throw new NotFoundError('Appointment not found');

      if (appt.type !== AppointmentType.VIDEO) {
        throw new ForbiddenError('Only video appointments can open a telemedicine room');
      }

      if (
        appt.providerId !== userPayload.userId &&
        appt.patientId !== userPayload.userId &&
        userPayload.role !== UserRole.SUPER_ADMIN
      ) {
        throw new ForbiddenError('You are not authorized to start a room for this appointment');
      }

      patientId = appt.patientId;
      hostProviderId = appt.providerId;
    }

    // Ad-hoc (appointment-less) rooms may only be opened by clinical hosts.
    if (
      !appointmentId &&
      userPayload.role !== UserRole.CONSULTANT &&
      userPayload.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Only consultants can open ad-hoc telemedicine rooms');
    }

    // Explicit internal identity; the real provider SID/URL is stored by
    // ensureTwilioRoom on first token issuance — never fabricated here.
    const externalRoomId = `ricton-${crypto.randomUUID()}`;

    const room = await prisma.$transaction(async (tx) => {
      const r = await tx.telemedicineRoom.create({
        data: {
          appointmentId: appointmentId || null,
          providerId: hostProviderId,
          roomType,
          externalRoomId,
          externalRoomUrl: null,
          status: TelemedicineRoomStatus.CREATED,
        },
      });

      await tx.telemedicineParticipant.create({
        data: {
          roomId: r.id,
          userId: hostProviderId,
          role: ParticipantRole.HOST,
        },
      });

      if (patientId && patientId !== hostProviderId) {
        await tx.telemedicineParticipant.create({
          data: {
            roomId: r.id,
            userId: patientId,
            role: ParticipantRole.PARTICIPANT,
          },
        });
      }

      return r;
    });

    res.status(201).json(successResponse(room));
  } catch (error) {
    next(error);
  }
};

export const getRoomToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
      include: {
        participants: true,
        appointment: {
          select: { scheduledAt: true, durationMinutes: true, status: true },
        },
      },
    });

    // Never auto-create: unknown room IDs are rejected so strangers cannot
    // mint sessions or crown themselves host.
    if (!room) {
      throw new NotFoundError('Telemedicine room not found');
    }

    if (room.status === TelemedicineRoomStatus.ENDED) {
      throw new ForbiddenError('This telemedicine session has ended');
    }

    // Membership is verified BEFORE any token is minted. Ad-hoc instant
    // rooms additionally admit by code (see tryAdmitByRoomCode); appointment
    // rooms stay strictly member-only with join-window enforcement.
    try {
      await assertRoomMembership(room.id, userPayload, room.participants);
    } catch (err) {
      const admitted = await tryAdmitByRoomCode(room, userPayload);
      if (!admitted) throw err;
    }
    if (room.appointment) assertAppointmentJoinWindow(room.appointment);

    // Fail closed without provider configuration — never issue simulated tokens.
    if (!isLiveKitConfigured()) {
      throw new AppError(
        'Video calling is not configured. Please try again later.',
        503,
        'SERVICE_NOT_CONFIGURED'
      );
    }

    const { url: livekitUrl, apiKey, apiSecret } = getLiveKitConfig();
    const livekitRoomName = await ensureLiveKitRoom(room.id);

    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity: userPayload.userId,
      ttl: '1h',
    });
    accessToken.addGrant({ roomJoin: true, room: livekitRoomName });
    const tokenStr = await accessToken.toJwt();

    res.status(200).json(
      successResponse({
        token: tokenStr,
        serverUrl: livekitUrl,
        room: {
          ...room,
          externalRoomId: livekitRoomName,
          externalRoomUrl: null,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const endRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
      include: { participants: { select: { userId: true, role: true } } },
    });

    if (!room) throw new NotFoundError('Telemedicine room not found');

    // Only the host, the owning provider, or a platform admin may end a room
    // for everyone. Everyone else must use leaveRoom.
    const isHost = room.participants.some(
      (p) => p.userId === userPayload.userId && p.role === ParticipantRole.HOST
    );
    if (
      !isHost &&
      room.providerId !== userPayload.userId &&
      userPayload.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Only the host can end the session for everyone');
    }

    if (room.status === TelemedicineRoomStatus.ENDED) {
      res.status(200).json(successResponse(room));
      return;
    }

    await completeLiveKitRoom(room.externalRoomId);

    const updated = await prisma.telemedicineRoom.update({
      where: { id: room.id },
      data: {
        status: TelemedicineRoomStatus.ENDED,
        endedAt: new Date(),
      },
    });

    await prisma.telemedicineParticipant.updateMany({
      where: { roomId: room.id, leftAt: null },
      data: { leftAt: new Date() },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

/** Called by the client only after the RTC SDK has connected successfully. */
export const joinRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
      include: {
        participants: { select: { userId: true } },
        appointment: {
          select: { scheduledAt: true, durationMinutes: true, status: true },
        },
      },
    });
    if (!room) throw new NotFoundError('Telemedicine room not found');
    if (room.status === TelemedicineRoomStatus.ENDED) {
      throw new ForbiddenError('This telemedicine session has ended');
    }
    try {
      await assertRoomMembership(room.id, userPayload, room.participants);
    } catch (err) {
      const admitted = await tryAdmitByRoomCode(room, userPayload);
      if (!admitted) throw err;
    }
    if (room.appointment) assertAppointmentJoinWindow(room.appointment);

    const joinedAt = new Date();
    await prisma.$transaction([
      prisma.telemedicineParticipant.updateMany({
        where: { roomId: room.id, userId: userPayload.userId },
        data: { joinedAt, leftAt: null },
      }),
      prisma.telemedicineRoom.updateMany({
        where: { id: room.id, status: TelemedicineRoomStatus.CREATED },
        data: { status: TelemedicineRoomStatus.ACTIVE, startedAt: joinedAt },
      }),
    ]);

    res.status(200).json(successResponse({ joined: true, roomId: room.id, joinedAt }));
  } catch (error) {
    next(error);
  }
};

/**
 * LiveKit webhook receiver (provider-signed, no JWT).
 * LiveKit signs the raw JSON body: Authorization header carries
 * base64(HMAC-SHA256(body, apiSecret)). Transitions our session record from
 * provider ground truth; recording is never enabled server-side, so webhooks
 * can only move rooms toward ENDED.
 */
export const handleStatusCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiSecret } = getLiveKitConfig();
    if (!apiSecret) {
      throw new AppError('LiveKit webhooks are not configured', 503, 'SERVICE_NOT_CONFIGURED');
    }
    const signature = req.headers['authorization'] as string | undefined;
    if (!signature) {
      throw new ForbiddenError('Missing LiveKit webhook signature');
    }
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const expected = crypto.createHmac('sha256', apiSecret).update(rawBody).digest('base64');
    const valid =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!valid) {
      throw new ForbiddenError('Invalid LiveKit webhook signature');
    }

    const event = req.body as { event?: string; room?: { name?: string; sid?: string } };
    const roomName = event?.room?.name;
    if (!roomName) {
      res.status(200).json(successResponse({ ignored: true }));
      return;
    }
    if (event?.event === 'room_started') {
      await prisma.telemedicineRoom.updateMany({
        where: { externalRoomId: roomName, status: TelemedicineRoomStatus.CREATED },
        data: { status: TelemedicineRoomStatus.ACTIVE, startedAt: new Date() },
      });
    } else if (event?.event === 'room_finished') {
      await prisma.telemedicineRoom.updateMany({
        where: { externalRoomId: roomName, status: { not: TelemedicineRoomStatus.ENDED } },
        data: { status: TelemedicineRoomStatus.ENDED, endedAt: new Date() },
      });
      const room = await prisma.telemedicineRoom.findFirst({
        where: { externalRoomId: roomName },
        select: { id: true },
      });
      if (room) {
        await prisma.telemedicineParticipant.updateMany({
          where: { roomId: room.id, leftAt: null },
          data: { leftAt: new Date() },
        });
      }
    }
    res.status(200).json(successResponse({ received: true }));
  } catch (error) {
    next(error);
  }
};

/** Leave: marks only the caller departed; the room continues for everyone else. */
export const leaveRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
      select: { id: true },
    });

    if (!room) throw new NotFoundError('Telemedicine room not found');

    await assertRoomMembership(room.id, userPayload);

    await prisma.telemedicineParticipant.updateMany({
      where: { roomId: room.id, userId: userPayload.userId, leftAt: null },
      data: { leftAt: new Date() },
    });

    res.status(200).json(successResponse({ left: true, roomId: room.id }));
  } catch (error) {
    next(error);
  }
};

export const getParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const userPayload = req.user as JwtPayload;
    const room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                status: true,
                patientProfile: true,
                providerProfile: true,
              },
            },
          },
        },
      },
    });

    if (!room) throw new NotFoundError('Telemedicine room not found');

    // Member-scoped: only participants / appointment parties / admins may
    // inspect who is in the session.
    await assertRoomMembership(
      room.id,
      userPayload,
      room.participants.map((p) => ({ userId: p.userId }))
    );

    const participantsWithDetails = room.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      roomId: p.roomId,
      role: p.role,
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
      user: p.user,
    }));

    res.status(200).json(successResponse({ participants: participantsWithDetails, room }));
  } catch (error) {
    next(error);
  }
};
