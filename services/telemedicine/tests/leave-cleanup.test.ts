(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.LIVEKIT_URL = 'https://test.livekit.local';
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-32-chars-minimum-xxxx';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus, TelemedicineRoomStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import telemedicineRoutes from '../src/routes/telemedicine.routes';
import { createUser } from '../../../packages/shared/src/__tests__/factories';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('../../../packages/shared/src/index');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return {
    __esModule: true,
    ...actual,
    redis: createRedisMock(),
  };
});

const removeParticipantMock = jest.fn(async (_room: string, _identity: string) => undefined);

jest.mock('livekit-server-sdk', () => ({
  __esModule: true,
  AccessToken: jest.fn().mockImplementation((apiKey?: string, apiSecret?: string, opts?: any) => ({
    addGrant: jest.fn(),
    toJwt: async () => `mock-livekit-jwt-for-${opts?.identity ?? 'test-identity'}`,
  })),
  RoomServiceClient: jest.fn().mockImplementation(() => ({
    listRooms: jest.fn(async () => []),
    createRoom: jest.fn(async (opts: { name: string }) => ({ name: opts.name })),
    deleteRoom: jest.fn(async () => undefined),
    removeParticipant: (room: string, identity: string) => removeParticipantMock(room, identity),
  })),
}));

describe('leaveRoom provider cleanup (TDD RED)', () => {
  let app: Express;
  let doctor: any;
  let patient: any;
  let doctorToken: string;
  let patientToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/telemedicine', telemedicineRoutes);
    app.use(
      (
        err: Error & { statusCode?: number; code?: string },
        _req: Request,
        res: Response,
        _next: NextFunction
      ) => {
        res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
      }
    );

    doctor = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Leave',
      lastName: 'Doctor',
    });
    doctorToken = jwt.sign(
      {
        userId: doctor.id,
        role: UserRole.CONSULTANT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );
    patient = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Leave',
      lastName: 'Patient',
    });
    patientToken = jwt.sign(
      {
        userId: patient.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );
  });

  afterAll(async () => {
    await prisma.telemedicineParticipant.deleteMany({ where: { room: { providerId: doctor.id } } });
    await prisma.telemedicineRoom.deleteMany({ where: { providerId: doctor.id } });
    await prisma.providerProfile.deleteMany({ where: { userId: doctor.id } });
    await prisma.patientProfile.deleteMany({ where: { userId: patient.id } });
    await prisma.user.deleteMany({ where: { id: { in: [doctor.id, patient.id] } } });
  });

  beforeEach(() => {
    removeParticipantMock.mockClear();
  });

  async function createProvisionedRoom() {
    const room = await prisma.telemedicineRoom.create({
      data: {
        providerId: doctor.id,
        roomType: 'ONE_ON_ONE',
        externalRoomId: 'livekit-leave-room',
        status: TelemedicineRoomStatus.ACTIVE,
      },
    });
    await prisma.telemedicineParticipant.createMany({
      data: [
        { roomId: room.id, userId: doctor.id, role: 'HOST' },
        { roomId: room.id, userId: patient.id, role: 'PARTICIPANT' },
      ],
    });
    return room;
  }

  it('removes the leaver from the provider room and marks them departed', async () => {
    const room = await createProvisionedRoom();
    const res = await request(app)
      .post(`/api/telemedicine/rooms/${room.id}/leave`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(removeParticipantMock).toHaveBeenCalledWith('livekit-leave-room', patient.id);
    const participant = await prisma.telemedicineParticipant.findFirstOrThrow({
      where: { roomId: room.id, userId: patient.id },
    });
    expect(participant.leftAt).not.toBeNull();
    // The room continues for everyone else.
    const stored = await prisma.telemedicineRoom.findUniqueOrThrow({ where: { id: room.id } });
    expect(stored.status).toBe(TelemedicineRoomStatus.ACTIVE);
  });

  it('still leaves locally when the provider removal fails', async () => {
    const room = await createProvisionedRoom();
    removeParticipantMock.mockRejectedValueOnce(new Error('provider down'));
    const res = await request(app)
      .post(`/api/telemedicine/rooms/${room.id}/leave`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
    const participant = await prisma.telemedicineParticipant.findFirstOrThrow({
      where: { roomId: room.id, userId: doctor.id },
    });
    expect(participant.leftAt).not.toBeNull();
  });
});
