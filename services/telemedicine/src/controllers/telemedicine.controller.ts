import { Request, Response, NextFunction } from 'express';
import {
  prisma,
  UserRole,
  TelemedicineRoomStatus,
  TelemedicineRoomType,
  ParticipantRole,
} from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ForbiddenError } from '@ricton/shared';
import twilio from 'twilio';

function getTwilioConfig() {
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID ||
    process.env.TWILIO_SID ||
    'AC65af330a86d3e223be8dd572d4848b9c';
  const apiKey =
    process.env.TWILIO_API_KEY ||
    process.env.TWILIO_API_KEY_SID ||
    'SKd727abb68d205e6203db1f3426b947ba';
  const apiSecret =
    process.env.TWILIO_API_SECRET ||
    process.env.TWILIO_API_KEY_SECRET ||
    '1Ns44QiKVrqgQZaMUxeu8YSNfPVMPUW3';
  return { accountSid, apiKey, apiSecret };
}

export const listRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;

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

    const externalRoomId = `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const externalRoomUrl = `https://video.twilio.com/v1/Rooms/${externalRoomId}`;

    const room = await prisma.$transaction(async (tx) => {
      const r = await tx.telemedicineRoom.create({
        data: {
          appointmentId: appointmentId || null,
          providerId: hostProviderId,
          roomType,
          externalRoomId,
          externalRoomUrl,
          status: TelemedicineRoomStatus.CREATED,
        },
      });

      await tx.telemedicineParticipant.create({
        data: {
          roomId: r.id,
          userId: hostProviderId,
          role: ParticipantRole.HOST,
          joinedAt: new Date(),
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

    let room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
      include: { participants: true },
    });

    // Auto-create room if requested by ID or externalRoomId code
    if (!room) {
      const externalRoomId = isUuid ? `room-${id}` : id;
      room = await prisma.telemedicineRoom.create({
        data: {
          providerId: userPayload.userId,
          externalRoomId,
          externalRoomUrl: `https://video.twilio.com/v1/Rooms/${externalRoomId}`,
          status: TelemedicineRoomStatus.ACTIVE,
          startedAt: new Date(),
          participants: {
            create: {
              userId: userPayload.userId,
              role: ParticipantRole.HOST,
              joinedAt: new Date(),
            },
          },
        },
        include: { participants: true },
      });
    }

    if (room.status === TelemedicineRoomStatus.ENDED) {
      throw new ForbiddenError('This telemedicine session has ended');
    }

    let tokenStr: string;
    const { accountSid, apiKey, apiSecret } = getTwilioConfig();

    // Check if Twilio Video is configured; fallback to development token if not
    if (!accountSid || accountSid === 'your_twilio_account_sid') {
      tokenStr = `simulated_token_${room.id}_${userPayload.userId}`;
    } else {
      const AccessToken = twilio.jwt.AccessToken;
      const VideoGrant = AccessToken.VideoGrant;

      const twilioToken = new AccessToken(accountSid, apiKey, apiSecret, {
        identity: userPayload.userId,
        ttl: 3600,
      });

      const grant = new VideoGrant({ room: room.externalRoomId });
      twilioToken.addGrant(grant);
      tokenStr = twilioToken.toJwt();
    }

    if (room.status === TelemedicineRoomStatus.CREATED) {
      await prisma.telemedicineRoom.update({
        where: { id: room.id },
        data: {
          status: TelemedicineRoomStatus.ACTIVE,
          startedAt: new Date(),
        },
      });
    }

    const participant = room.participants.find((p) => p.userId === userPayload.userId);
    if (participant) {
      await prisma.telemedicineParticipant.update({
        where: { id: participant.id },
        data: { joinedAt: new Date() },
      });
    } else {
      await prisma.telemedicineParticipant.create({
        data: {
          roomId: room.id,
          userId: userPayload.userId,
          role: ParticipantRole.PARTICIPANT,
          joinedAt: new Date(),
        },
      });
    }

    res.status(200).json(successResponse({ token: tokenStr, room }));
  } catch (error) {
    next(error);
  }
};

export const endRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
    });

    if (!room) throw new NotFoundError('Telemedicine room not found');

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

export const getParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const room = await prisma.telemedicineRoom.findFirst({
      where: isUuid ? { OR: [{ id }, { externalRoomId: id }] } : { externalRoomId: id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
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
