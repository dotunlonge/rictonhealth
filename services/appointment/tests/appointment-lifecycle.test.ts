(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';

import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  prisma,
  UserRole,
  UserStatus,
  AppointmentType,
  AppointmentStatus,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
} from '@ricton/db';
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

describe('Appointment lifecycle: status guard + reschedule (TDD RED)', () => {
  let app: Express;
  let patientA: any;
  let patientB: any;
  let provider: any;
  let tokenA: string;
  let consultantToken: string;

  function nextMondayAt(hour: number, minute = 0): Date {
    const d = new Date();
    const daysUntilNextMonday = (1 + 7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilNextMonday);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
  }

  async function makeAppointment(
    patientId: string,
    at: Date,
    status: AppointmentStatus = AppointmentStatus.PENDING
  ) {
    return prisma.appointment.create({
      data: {
        patientId,
        providerId: provider.id,
        scheduledAt: at,
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        status,
      },
    });
  }

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

    patientA = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Life',
      lastName: 'CycleA',
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
      firstName: 'Life',
      lastName: 'CycleB',
    });
    provider = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Life',
      lastName: 'Doctor',
    });
    consultantToken = jwt.sign(
      {
        userId: provider.id,
        role: UserRole.CONSULTANT,
        status: UserStatus.ACTIVE,
        iss: 'ricton-issuer',
      },
      'test-jwt-secret'
    );

    await prisma.providerProfile.upsert({
      where: { userId: provider.id },
      create: {
        userId: provider.id,
        firstName: 'Life',
        lastName: 'Doctor',
        specialty: 'Cardiology',
        consultationFee: 15000,
        licenseNumber: `LIC-LC-${Date.now()}`,
        // Booking requires a verified provider (product rule, not test setup).
        isVerified: true,
      },
      update: { isVerified: true },
    });
    await prisma.providerAvailability.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerAvailability.create({
      data: {
        providerId: provider.id,
        dayOfWeek: 0,
        startTime: '09:00',
        endTime: '17:00',
        slotDurationMinutes: 30,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { providerId: provider.id } });
    await prisma.telemedicineRoom.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerAvailability.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerProfile.deleteMany({ where: { userId: provider.id } });
    await prisma.payment.deleteMany({
      where: { userId: { in: [patientA.id, patientB.id, provider.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [patientA.id, patientB.id, provider.id] } },
    });
    await prisma.$disconnect();
  });

  it('rejects skipping the clinical workflow (PENDING -> COMPLETED)', async () => {
    const appt = await makeAppointment(patientA.id, nextMondayAt(10));
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/status`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ status: 'COMPLETED' });
    expect([400, 422]).toContain(res.status);
  });

  it('allows the legal path PENDING -> CONFIRMED -> IN_PROGRESS -> COMPLETED', async () => {
    const appt = await makeAppointment(patientA.id, nextMondayAt(11));
    // Paid provider: CONFIRMED needs a staff waiver (no payment in fixture);
    // VIDEO visit: IN_PROGRESS needs telemedicine consent (product rules).
    const payloads: Record<string, object> = {
      CONFIRMED: { status: 'CONFIRMED', waivedReason: 'Test waiver — dev fixture' },
      IN_PROGRESS: { status: 'IN_PROGRESS', telemedicineConsent: true },
      COMPLETED: { status: 'COMPLETED' },
    };
    for (const status of ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED']) {
      const res = await request(app)
        .patch(`/api/appointments/${appt.id}/status`)
        .set('Authorization', `Bearer ${consultantToken}`)
        .send(payloads[status]);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
  });

  it('treats terminal states as immutable', async () => {
    const appt = await makeAppointment(patientA.id, nextMondayAt(12), AppointmentStatus.COMPLETED);
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/status`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ status: 'IN_PROGRESS' });
    expect([400, 422]).toContain(res.status);
  });

  it('lets the patient reschedule a PENDING appointment to a free slot', async () => {
    const appt = await makeAppointment(patientA.id, nextMondayAt(13));
    const target = nextMondayAt(14).toISOString();
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/reschedule`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scheduledAt: target });
    expect(res.status).toBe(200);
    expect(new Date(res.body.data.scheduledAt).toISOString()).toBe(target);
  });

  it('rejects rescheduling onto a taken slot with 409', async () => {
    await makeAppointment(patientB.id, nextMondayAt(15));
    const appt = await makeAppointment(patientA.id, nextMondayAt(16));
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/reschedule`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scheduledAt: nextMondayAt(15).toISOString() });
    expect(res.status).toBe(409);
  });

  it("forbids rescheduling someone else's appointment", async () => {
    const appt = await makeAppointment(patientB.id, nextMondayAt(9));
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/reschedule`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scheduledAt: nextMondayAt(10).toISOString() });
    expect([403, 404]).toContain(res.status);
  });

  it('rejects rescheduling a COMPLETED appointment', async () => {
    const appt = await makeAppointment(patientA.id, nextMondayAt(9), AppointmentStatus.COMPLETED);
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/reschedule`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ scheduledAt: nextMondayAt(10).toISOString() });
    expect([400, 422]).toContain(res.status);
  });

  it('exposes payment status on list and detail (paid badges)', async () => {
    const slot = nextMondayAt(9, 30);
    const appt = await makeAppointment(patientA.id, slot);
    const payment = await prisma.payment.create({
      data: {
        userId: patientA.id,
        amount: 15000,
        currency: 'NGN',
        type: PaymentType.APPOINTMENT,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.PAYSTACK,
        providerReference: `APPT_TEST_${appt.id}`,
      },
    });
    await prisma.appointment.update({ where: { id: appt.id }, data: { paymentId: payment.id } });

    const list = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(list.status).toBe(200);
    const listed = (list.body.data.appointments as Array<any>).find((a) => a.id === appt.id);
    expect(listed?.payment?.status).toBe('PENDING');

    const detail = await request(app)
      .get(`/api/appointments/${appt.id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.payment?.status).toBe('PENDING');
  });
});
