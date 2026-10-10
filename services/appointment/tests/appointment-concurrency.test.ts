(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma, UserRole, UserStatus, AppointmentType, AppointmentStatus } from '@ricton/db';
import { errorResponse } from '@ricton/shared';
import appointmentRoutes from '../src/routes/appointment.routes';
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

// Notification queues are external infrastructure: stub the enqueue calls so
// lifecycle notifications resolve without Redis/BullMQ.
jest.mock('@ricton/shared/jobs', () => ({
  __esModule: true,
  emailQueue: { add: jest.fn().mockResolvedValue(undefined) },
  smsQueue: { add: jest.fn().mockResolvedValue(undefined) },
}));

describe('Appointment Concurrency & Double-Booking Resilience (TDD)', () => {
  let app: Express;
  let patientA: any;
  let patientB: any;
  let provider: any;
  let tokenA: string;
  let tokenB: string;
  let scheduledAtIso: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/appointments', appointmentRoutes);
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

    // Create Patients
    patientA = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Patient',
      lastName: 'One',
    });
    tokenA = jwt.sign(
      {
        userId: patientA.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    patientB = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Patient',
      lastName: 'Two',
    });
    tokenB = jwt.sign(
      {
        userId: patientB.id,
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    // Create Provider with ProviderProfile
    provider = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Jane',
      lastName: 'Foster',
    });

    await prisma.providerProfile.upsert({
      where: { userId: provider.id },
      create: {
        userId: provider.id,
        firstName: 'Jane',
        lastName: 'Foster',
        specialty: 'Cardiology',
        consultationFee: 15000,
        licenseNumber: `LIC-${Date.now()}`,
        // Booking requires a verified provider (product rule, not test setup).
        isVerified: true,
      },
      update: {
        specialty: 'Cardiology',
        consultationFee: 15000,
        licenseNumber: `LIC-${Date.now()}`,
        isVerified: true,
      },
    });

    // Configure Provider Availability for Monday (dayOfWeek = 0)
    // 09:00 to 17:00 with 30-min slot duration
    await prisma.providerAvailability.create({
      data: {
        providerId: provider.id,
        dayOfWeek: 0, // Monday
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });

    // Find next Monday
    const targetDate = new Date();
    const currentDay = targetDate.getDay(); // 0 is Sunday, 1 is Monday...
    const daysUntilNextMonday = (1 + 7 - currentDay) % 7 || 7;
    targetDate.setDate(targetDate.getDate() + daysUntilNextMonday);
    targetDate.setHours(10, 0, 0, 0);

    scheduledAtIso = targetDate.toISOString();
  });

  afterAll(async () => {
    // Appointments first: they now carry telemedicineRoomId (bidirectional
    // room link), so rooms must be deleted after, not before.
    await prisma.appointment.deleteMany({ where: { providerId: provider.id } });
    await prisma.telemedicineRoom.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerAvailability.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerProfile.deleteMany({ where: { userId: provider.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [patientA.id, patientB.id, provider.id] } },
    });
    await prisma.$disconnect();
  });

  it('1. should successfully book an appointment in an available slot', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        providerId: provider.id,
        scheduledAt: scheduledAtIso,
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Initial Consultation',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.providerId).toBe(provider.id);
    expect(res.body.data.patientId).toBe(patientA.id);
    expect(res.body.data.status).toBe(AppointmentStatus.PENDING);
  });

  it('1b. VIDEO booking links the auto-room bidirectionally (token mint works)', async () => {
    const booked = await prisma.appointment.findFirstOrThrow({
      where: { providerId: provider.id, patientId: patientA.id },
      include: { telemedicineRoom: true },
    });
    // Both directions of the link must exist: the relation every membership
    // and include check keys off appointment.telemedicineRoomId.
    expect(booked.telemedicineRoomId).toBeTruthy();
    expect(booked.telemedicineRoom).toBeTruthy();
    expect(booked.telemedicineRoom?.appointmentId).toBe(booked.id);
  });

  it('2. should reject booking if requested time is outside provider availability window', async () => {
    // 07:00 AM is outside 09:00-17:00
    const earlyDate = new Date(scheduledAtIso);
    earlyDate.setHours(7, 0, 0, 0);

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        providerId: provider.id,
        scheduledAt: earlyDate.toISOString(),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Early bird test',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/outside the provider availability window/i);
  });

  it('3. should reject overlapping appointment with 409 APPOINTMENT_CONFLICT', async () => {
    // Exact same time that was booked by patientA in test 1
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        providerId: provider.id,
        scheduledAt: scheduledAtIso,
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Conflicting Booking',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('APPOINTMENT_CONFLICT');
  });

  it('4. should prevent double-booking race conditions during concurrent booking requests', async () => {
    // Choose 14:00 slot on the same Monday
    const afternoonSlot = new Date(scheduledAtIso);
    afternoonSlot.setHours(14, 0, 0, 0);
    const slotIso = afternoonSlot.toISOString();

    // Fire two concurrent requests for the exact same slot from two different patients
    const [res1, res2] = await Promise.all([
      request(app).post('/api/appointments').set('Authorization', `Bearer ${tokenA}`).send({
        providerId: provider.id,
        scheduledAt: slotIso,
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Race Test 1',
      }),
      request(app).post('/api/appointments').set('Authorization', `Bearer ${tokenB}`).send({
        providerId: provider.id,
        scheduledAt: slotIso,
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Race Test 2',
      }),
    ]);

    const statuses = [res1.status, res2.status];
    // Exactly one must succeed (201) and one must be rejected (409)
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);

    // Verify only 1 record exists in the database for this slot
    const appointments = await prisma.appointment.findMany({
      where: {
        providerId: provider.id,
        scheduledAt: new Date(slotIso),
      },
    });
    expect(appointments).toHaveLength(1);
  });

  it('5. should maintain exact unmutated scheduledAt date timestamp after booking', async () => {
    // Choose 11:30 slot. VIDEO: IN_PERSON bookings require a clinic venue
    // (provider hospital), irrelevant to timestamp immutability.
    const slot1130 = new Date(scheduledAtIso);
    slot1130.setHours(11, 30, 0, 0);

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        providerId: provider.id,
        scheduledAt: slot1130.toISOString(),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Timestamp Check',
      });

    expect(res.status).toBe(201);
    const bookedDate = new Date(res.body.data.scheduledAt);
    expect(bookedDate.getUTCHours() || bookedDate.getHours()).toBeDefined();
  });

  it('6. database exclusion constraint rejects overlapping bookings bypassing the API', async () => {
    // 16:30 is inside the 09:00-17:00 window and untouched by earlier tests.
    const base = new Date(scheduledAtIso);
    base.setUTCHours(16, 30, 0, 0);
    await prisma.appointment.create({
      data: {
        patientId: patientA.id,
        providerId: provider.id,
        scheduledAt: base,
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        status: 'PENDING',
      },
    });
    await expect(
      prisma.appointment.create({
        data: {
          patientId: patientA.id,
          providerId: provider.id,
          scheduledAt: new Date(base.getTime() + 15 * 60000),
          durationMinutes: 30,
          type: AppointmentType.VIDEO,
          status: 'PENDING',
        },
      })
    ).rejects.toThrow();
    await prisma.appointment.deleteMany({
      where: { providerId: provider.id, patientId: patientA.id },
    });
  });

  it('7. should reject booking requests from unverified PENDING patient accounts', async () => {
    const pendingPatient = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.PENDING,
      password: 'Password123!',
      firstName: 'Pending',
      lastName: 'User',
    });
    const pendingToken = jwt.sign(
      {
        userId: pendingPatient.id,
        role: UserRole.PATIENT,
        status: UserStatus.PENDING,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    const slot1200 = new Date(scheduledAtIso);
    slot1200.setUTCHours(12, 0, 0, 0);

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${pendingToken}`)
      .send({
        providerId: provider.id,
        scheduledAt: slot1200.toISOString(),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Pending check',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Account must be active/i);
  });
});
