import { Request, Response, NextFunction } from 'express';
import {
  prisma,
  UserRole,
  TelemedicineRoomStatus,
  TelemedicineRoomType,
  ParticipantRole,
} from '@ricton/db';
import { JwtPayload } from '@ricton/auth-middleware';
import { successResponse, NotFoundError, ForbiddenError, AppError } from '@ricton/shared';
import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_API_KEY = process.env.TWILIO_API_KEY || 'SK_test_replace_me';
const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET || 'secret_replace_me';

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    if (userPayload.role !== UserRole.CONSULTANT && userPayload.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError(
        'Only medical consultants or admins can initialize telemedicine rooms'
      );
    }

    const { appointmentId, roomType = TelemedicineRoomType.ONE_ON_ONE } = req.body;

    let patientId: string | null = null;
    let hostProviderId: string = userPayload.userId;

    if (appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });

      if (!appt) throw new NotFoundError('Appointment not found');

      if (appt.providerId !== userPayload.userId && userPayload.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenError('You are not authorized to start a room for this appointment');
      }

      patientId = appt.patientId;
      hostProviderId = appt.providerId; // Always assign the Doctor as the Room host
    }

    const externalRoomId = `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const externalRoomUrl = `https://video.twilio.com/v1/Rooms/${externalRoomId}`;

    const room = await prisma.$transaction(async (tx) => {
      // Create the room
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

      // Register host participant (the assigned doctor)
      await tx.telemedicineParticipant.create({
        data: {
          roomId: r.id,
          userId: hostProviderId,
          role: ParticipantRole.HOST,
          joinedAt: new Date(),
        },
      });

      // Register patient participant if 1-on-1
      if (patientId && roomType === TelemedicineRoomType.ONE_ON_ONE) {
        await tx.telemedicineParticipant.create({
          data: {
            roomId: r.id,
            userId: patientId,
            role: ParticipantRole.PARTICIPANT,
          },
        });
      }

      // If the creator is an Admin, register them as a regular participant
      if (userPayload.role === UserRole.SUPER_ADMIN && hostProviderId !== userPayload.userId) {
        await tx.telemedicineParticipant.create({
          data: {
            roomId: r.id,
            userId: userPayload.userId,
            role: ParticipantRole.PARTICIPANT,
            joinedAt: new Date(),
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

    const room = await prisma.telemedicineRoom.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!room) throw new NotFoundError('Telemedicine room not found');

    if (room.status === TelemedicineRoomStatus.ENDED) {
      throw new ForbiddenError('This telemedicine session has ended');
    }

    // Secure boundary check: verify user is in participant list or is the assigned doctor/patient
    const isParticipant = room.participants.some((p) => p.userId === userPayload.userId);
    const isOwner = room.providerId === userPayload.userId;

    let isAuthorized = isParticipant || isOwner;

    // Check if appointment patient
    if (!isAuthorized && room.appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: room.appointmentId },
      });
      if (appt && appt.patientId === userPayload.userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && userPayload.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError('You are not authorized to join this telemedicine session');
    }

    // Generate Twilio Video Access Token
    if (!TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID === 'your_twilio_account_sid') {
      throw new AppError(
        'Twilio Video service is not configured on the server',
        500,
        'TWILIO_CONFIGURATION_ERROR'
      );
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = AccessToken.VideoGrant;

    const twilioToken = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, {
      identity: userPayload.userId,
      ttl: 3600,
    });

    const grant = new VideoGrant({ room: room.externalRoomId });
    twilioToken.addGrant(grant);
    const tokenStr = twilioToken.toJwt();

    // Set Room status to ACTIVE upon first token fetch (starting)
    if (room.status === TelemedicineRoomStatus.CREATED) {
      await prisma.telemedicineRoom.update({
        where: { id },
        data: {
          status: TelemedicineRoomStatus.ACTIVE,
          startedAt: new Date(),
        },
      });
    }

    // Record or update join time on participant
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
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const room = await prisma.telemedicineRoom.findUnique({
      where: { id },
    });

    if (!room) throw new NotFoundError('Telemedicine room not found');

    if (room.providerId !== userPayload.userId && userPayload.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError(
        'Only the host doctor or an admin can end this consultation session'
      );
    }

    const updated = await prisma.telemedicineRoom.update({
      where: { id },
      data: {
        status: TelemedicineRoomStatus.ENDED,
        endedAt: new Date(),
      },
    });

    // Update all participants leftAt
    await prisma.telemedicineParticipant.updateMany({
      where: { roomId: id, leftAt: null },
      data: { leftAt: new Date() },
    });

    res.status(200).json(successResponse(updated));
  } catch (error) {
    next(error);
  }
};

export const getParticipants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = req.user as JwtPayload;
    const { id } = req.params;

    const room = await prisma.telemedicineRoom.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!room) throw new NotFoundError('Telemedicine room not found');

    // Secure boundary check: verify user is in participant list or is the assigned doctor/patient
    const isParticipant = room.participants.some((p) => p.userId === userPayload.userId);
    const isOwner = room.providerId === userPayload.userId;

    let isAuthorized = isParticipant || isOwner;

    // Check if appointment patient
    if (!isAuthorized && room.appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: room.appointmentId },
      });
      if (appt && appt.patientId === userPayload.userId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && userPayload.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenError(
        'You are not authorized to view participants in this telemedicine session'
      );
    }

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
