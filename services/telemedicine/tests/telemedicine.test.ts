(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
// Dummy provider config: isLiveKitConfigured() passes; the SDK itself is
// mocked below so no network is touched.
process.env.LIVEKIT_URL = 'https://test.livekit.local';
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-32-chars-minimum-xxxx';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  prisma,
  UserRole,
  UserStatus,
  AppointmentType,
  TelemedicineRoomStatus,
  ParticipantRole,
} from '@ricton/db';
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

// LiveKit is an external provider: stub the room lifecycle + AccessToken
// minting so tests exercise OUR membership/lifecycle logic, not the network.
jest.mock('livekit-server-sdk', () => {
  const roomsStore: Array<{ name: string }> = [];
  return {
    __esModule: true,
    AccessToken: jest
      .fn()
      .mockImplementation((apiKey?: string, apiSecret?: string, opts?: any) => ({
        identity: opts?.identity ?? 'test-identity',
        grants: [] as unknown[],
        addGrant(grant: unknown) {
          (this as any).grants.push(grant);
        },
        toJwt: async () => `mock-livekit-jwt-for-${opts?.identity ?? 'test-identity'}`,
      })),
    RoomServiceClient: jest.fn().mockImplementation(() => ({
      listRooms: jest.fn(async (names?: string[]) =>
        names && names.length > 0
          ? roomsStore.filter((r) => names.includes(r.name))
          : [...roomsStore]
      ),
      createRoom: jest.fn(async (opts: { name: string }) => {
        const room = { name: opts.name };
        roomsStore.push(room);
        return room;
      }),
      deleteRoom: jest.fn(async () => undefined),
    })),
  };
});

describe('Telemedicine Video Rooms & RTC Sessions (TDD)', () => {
  let app: Express;
  let doctor: any;
  let patient: any;
  let doctorToken: string;
  let patientToken: string;
  let appointmentId: string;
  let roomId: string;

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

    // 1. Doctor (verified — #23 gate: appointment rooms require verified provider)
    doctor = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Dr. Video',
      lastName: 'Consultant',
    });
    await prisma.providerProfile.update({
      where: { userId: doctor.id },
      data: { isVerified: true },
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

    // 2. Patient
    patient = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Patient',
      lastName: 'Call',
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

    // 3. Appointment
    const appt = await prisma.appointment.create({
      data: {
        providerId: doctor.id,
        patientId: patient.id,
        scheduledAt: new Date(Date.now() + 5 * 60_000),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Video Consultation Test',
      },
    });
    appointmentId = appt.id;
  });

  afterAll(async () => {
    await prisma.telemedicineParticipant.deleteMany({
      where: { room: { providerId: doctor.id } },
    });
    await prisma.telemedicineRoom.deleteMany({ where: { providerId: doctor.id } });
    await prisma.appointment.deleteMany({ where: { providerId: doctor.id } });
    await prisma.providerProfile.deleteMany({ where: { userId: doctor.id } });
    await prisma.patientProfile.deleteMany({ where: { userId: patient.id } });
    await prisma.user.deleteMany({ where: { id: { in: [doctor.id, patient.id] } } });
  });

  it('1. should create a telemedicine room for an appointment with host and participant', async () => {
    const res = await request(app)
      .post('/api/telemedicine/rooms')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        appointmentId,
        roomType: 'ONE_ON_ONE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.providerId).toBe(doctor.id);
    expect(res.body.data.status).toBe(TelemedicineRoomStatus.CREATED);

    roomId = res.body.data.id;

    // Verify participants created
    const participants = await prisma.telemedicineParticipant.findMany({
      where: { roomId },
    });
    expect(participants).toHaveLength(2);
    expect(
      participants.some((p) => p.userId === doctor.id && p.role === ParticipantRole.HOST)
    ).toBe(true);
    expect(
      participants.some((p) => p.userId === patient.id && p.role === ParticipantRole.PARTICIPANT)
    ).toBe(true);
  });
  it('6. should admit a code-holder to an ad-hoc instant room (join-by-code)', async () => {
    const createRes = await request(app)
      .post('/api/telemedicine/rooms')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ roomType: 'ONE_ON_ONE' });
    expect(createRes.status).toBe(201);
    const adhocRoomId: string = createRes.body.data.id;

    // A patient who was never added requests a token with the room code.
    const tokenRes = await request(app)
      .post(`/api/telemedicine/rooms/${adhocRoomId}/token`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.data.token).toBeDefined();

    const admit = await prisma.telemedicineParticipant.findFirst({
      where: { roomId: adhocRoomId, userId: patient.id },
    });
    expect(admit).toBeDefined();
    expect(admit?.role).toBe(ParticipantRole.PARTICIPANT);
    // The host row is never overwritten by admission.
    const host = await prisma.telemedicineParticipant.findFirst({
      where: { roomId: adhocRoomId, userId: doctor.id },
    });
    expect(host?.role).toBe(ParticipantRole.HOST);

    const joinRes = await request(app)
      .post(`/api/telemedicine/rooms/${adhocRoomId}/join`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.data.joined).toBe(true);
  });

  it('7. should still refuse strangers on appointment-linked rooms (strict path)', async () => {
    const outsider = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Outsider',
      lastName: 'Stranger',
    });
    const outsiderToken = jwt.sign(
      {
        userId: outsider.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );
    // A fresh appointment room (open, not ended) so the only possible
    // refusal reason is membership — admit-by-code must not apply here.
    const freshAppt = await prisma.appointment.create({
      data: {
        providerId: doctor.id,
        patientId: patient.id,
        scheduledAt: new Date(Date.now() + 2 * 60 * 60_000),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Strict membership probe',
      },
    });
    const freshRoom = await request(app)
      .post('/api/telemedicine/rooms')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ appointmentId: freshAppt.id, roomType: 'ONE_ON_ONE' });
    expect(freshRoom.status).toBe(201);
    try {
      const res = await request(app)
        .post(`/api/telemedicine/rooms/${freshRoom.body.data.id}/token`)
        .set('Authorization', `Bearer ${outsiderToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    } finally {
      await prisma.telemedicineParticipant.deleteMany({
        where: { roomId: freshRoom.body.data.id },
      });
      await prisma.telemedicineRoom.deleteMany({ where: { id: freshRoom.body.data.id } });
      await prisma.appointment.deleteMany({ where: { id: freshAppt.id } });
      await prisma.patientProfile.deleteMany({ where: { userId: outsider.id } });
      await prisma.user.deleteMany({ where: { id: outsider.id } });
    }
  });

  it('2. should list accessible telemedicine rooms for the patient', async () => {
    const res = await request(app)
      .get('/api/telemedicine/rooms')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.some((r: any) => r.id === roomId)).toBe(true);
  });

  it('3. should generate a room RTC access token for the participant', async () => {
    const res = await request(app)
      .post(`/api/telemedicine/rooms/${roomId}/token`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.room.id).toBe(roomId);
    // LiveKit rooms are named after our session id (explicit identity).
    expect(res.body.data.room.externalRoomId).toBe(roomId);
    expect(res.body.data.serverUrl).toBeDefined();

    const joined = await request(app)
      .post(`/api/telemedicine/rooms/${roomId}/join`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(joined.status).toBe(200);
    expect(joined.body.data.joined).toBe(true);

    const activeRoom = await prisma.telemedicineRoom.findUniqueOrThrow({ where: { id: roomId } });
    expect(activeRoom.status).toBe(TelemedicineRoomStatus.ACTIVE);
  });

  it('4. should retrieve active room participants with profile details', async () => {
    const res = await request(app)
      .get(`/api/telemedicine/rooms/${roomId}/participants`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.participants).toHaveLength(2);
    expect(res.body.data.room.id).toBe(roomId);
  });

  it('4b. should forbid a non-host participant from ending the room (negative)', async () => {
    const res = await request(app)
      .post(`/api/telemedicine/rooms/${roomId}/end`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });

  it('4c. should let a member leave without ending the room for everyone (negative)', async () => {
    const res = await request(app)
      .post(`/api/telemedicine/rooms/${roomId}/leave`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    const room = await prisma.telemedicineRoom.findUnique({ where: { id: roomId } });
    expect(room?.status).not.toBe(TelemedicineRoomStatus.ENDED);
  });

  it('5. should end a room session and record endedAt timestamp with departure timestamps', async () => {
    const res = await request(app)
      .post(`/api/telemedicine/rooms/${roomId}/end`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(TelemedicineRoomStatus.ENDED);
    expect(res.body.data.endedAt).toBeDefined();

    // Verify participants leftAt set
    const leftParticipants = await prisma.telemedicineParticipant.findMany({
      where: { roomId, leftAt: { not: null } },
    });
    expect(leftParticipants.length).toBeGreaterThanOrEqual(1);
  });
});
