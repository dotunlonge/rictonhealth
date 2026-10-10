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

const mockEmailAdd = jest.fn().mockResolvedValue(undefined);
const mockSmsAdd = jest.fn().mockResolvedValue(undefined);
jest.mock('@ricton/shared/jobs', () => ({
  __esModule: true,
  emailQueue: { add: (...args: unknown[]) => mockEmailAdd(...args) },
  smsQueue: { add: (...args: unknown[]) => mockSmsAdd(...args) },
}));

/** Nudges enqueue after the HTTP response: poll until visible or time out. */
async function waitForExpect(check: () => void | Promise<void>, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  for (;;) {
    try {
      await check();
      return;
    } catch (err) {
      if (Date.now() - start > timeoutMs) throw err;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

describe('Appointment lifecycle notifications (TDD RED)', () => {
  let app: Express;
  let patient: any;
  let provider: any;
  let patientToken: string;
  let consultantToken: string;

  function nextMondayAt(hour: number, minute = 0): Date {
    const d = new Date();
    const daysUntilNextMonday = (1 + 7 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilNextMonday);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
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

    patient = await createUser({
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Notify',
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
    provider = await createUser({
      role: UserRole.CONSULTANT,
      status: UserStatus.ACTIVE,
      password: 'Password123!',
      firstName: 'Notify',
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
        firstName: 'Notify',
        lastName: 'Doctor',
        specialty: 'Cardiology',
        consultationFee: 15000,
        licenseNumber: `LIC-NT-${Date.now()}`,
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
    await prisma.notification.deleteMany({
      where: { userId: { in: [patient.id, provider.id] } },
    });
    await prisma.appointment.deleteMany({ where: { providerId: provider.id } });
    await prisma.telemedicineRoom.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerAvailability.deleteMany({ where: { providerId: provider.id } });
    await prisma.providerProfile.deleteMany({ where: { userId: provider.id } });
    await prisma.user.deleteMany({ where: { id: { in: [patient.id, provider.id] } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    mockEmailAdd.mockClear();
    mockSmsAdd.mockClear();
    await prisma.notification.deleteMany({
      where: { userId: { in: [patient.id, provider.id] } },
    });
  });

  it('notifies patient + provider when a booking is created', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerId: provider.id,
        scheduledAt: nextMondayAt(10).toISOString(),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        reason: 'Notify booking',
      });
    expect(res.status).toBe(201);

    const patientNotes = await prisma.notification.findMany({ where: { userId: patient.id } });
    expect(patientNotes.map((n) => n.type)).toContain('APPOINTMENT_BOOKED');
    const providerNotes = await prisma.notification.findMany({ where: { userId: provider.id } });
    expect(providerNotes.map((n) => n.type)).toContain('APPOINTMENT_BOOKED');
  });

  it('notifies the patient when the visit is confirmed', async () => {
    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        scheduledAt: nextMondayAt(11),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        status: AppointmentStatus.PENDING,
      },
    });
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/status`)
      .set('Authorization', `Bearer ${consultantToken}`)
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(200);

    const notes = await prisma.notification.findMany({ where: { userId: patient.id } });
    expect(notes.map((n) => n.type)).toContain('APPOINTMENT_CONFIRMED');
  });

  it('notifies the other party on cancel', async () => {
    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        scheduledAt: nextMondayAt(12),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        status: AppointmentStatus.CONFIRMED,
      },
    });
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'feeling better' });
    expect(res.status).toBe(200);

    const notes = await prisma.notification.findMany({ where: { userId: provider.id } });
    expect(notes.map((n) => n.type)).toContain('APPOINTMENT_CANCELLED');
  });

  it('notifies the other party on reschedule', async () => {
    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        scheduledAt: nextMondayAt(13),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        status: AppointmentStatus.PENDING,
      },
    });
    const res = await request(app)
      .patch(`/api/appointments/${appt.id}/reschedule`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ scheduledAt: nextMondayAt(14).toISOString() });
    expect(res.status).toBe(200);

    const notes = await prisma.notification.findMany({ where: { userId: provider.id } });
    expect(notes.map((n) => n.type)).toContain('APPOINTMENT_RESCHEDULED');
  });

  it('queues email for parties with an email address', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerId: provider.id,
        scheduledAt: nextMondayAt(15).toISOString(),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
      });
    expect(res.status).toBe(201);
    // Nudges enqueue after the response (queue-backed): poll, don't assume.
    await waitForExpect(async () => {
      expect(mockEmailAdd).toHaveBeenCalled();
    });
    const recipients = mockEmailAdd.mock.calls.map((c) => (c[1] as { to?: string }).to);
    expect(recipients).toContain(patient.email);
    expect(recipients).toContain(provider.email);
  });

  it('still books when the email queue is down', async () => {
    mockEmailAdd.mockRejectedValueOnce(new Error('redis down'));
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        providerId: provider.id,
        scheduledAt: nextMondayAt(16).toISOString(),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
      });
    expect(res.status).toBe(201);
  });
});
