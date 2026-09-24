process.env.JWT_SECRET = 'test-jwt-secret';

import { prisma, UserRole, UserStatus, AppointmentType, AppointmentStatus } from '@ricton/db';
import { runAppointmentReminders } from '../reminders';
import { createUser, cleanDatabase } from '../../__tests__/factories';

const mockEmailAdd = jest.fn().mockResolvedValue(undefined);
jest.mock('../index', () => ({
  __esModule: true,
  emailQueue: { add: (...args: unknown[]) => mockEmailAdd(...args) },
  smsQueue: { add: jest.fn().mockResolvedValue(undefined) },
}));

const hoursAhead = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000);

describe('Appointment reminder sweep (TDD RED)', () => {
  let patient: any;
  let provider: any;

  beforeAll(async () => {
    patient = await createUser({ role: UserRole.PATIENT, status: UserStatus.ACTIVE });
    provider = await createUser({ role: UserRole.CONSULTANT, status: UserStatus.ACTIVE });
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    mockEmailAdd.mockClear();
    await prisma.notification.deleteMany({});
    await prisma.appointment.deleteMany({});
  });

  function makeAppointment(overrides: { scheduledAt?: Date; status?: AppointmentStatus } = {}) {
    return prisma.appointment.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        scheduledAt: overrides.scheduledAt ?? hoursAhead(23),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        status: overrides.status ?? AppointmentStatus.CONFIRMED,
      },
    });
  }

  it('reminds a confirmed visit starting within 24h and stamps reminderSentAt', async () => {
    await makeAppointment({ scheduledAt: hoursAhead(23) });
    const result = await runAppointmentReminders();
    expect(result.reminded).toBe(1);
    const notes = await prisma.notification.findMany({ where: { userId: patient.id } });
    expect(notes.map((n) => n.type)).toContain('APPOINTMENT_REMINDER');
    const appt = await prisma.appointment.findFirstOrThrow();
    expect(appt.reminderSentAt).not.toBeNull();
  });

  it('reminds pending visits too (the booking promises reminders)', async () => {
    await makeAppointment({ scheduledAt: hoursAhead(5), status: AppointmentStatus.PENDING });
    const result = await runAppointmentReminders();
    expect(result.reminded).toBe(1);
  });

  it('skips far-future visits and ignores cancelled, past, and already-reminded ones', async () => {
    await makeAppointment({ scheduledAt: hoursAhead(48) });
    await makeAppointment({ scheduledAt: hoursAhead(2), status: AppointmentStatus.CANCELLED });
    await makeAppointment({
      scheduledAt: hoursAhead(-2),
      status: AppointmentStatus.CONFIRMED,
    });
    const reminded = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        providerId: provider.id,
        scheduledAt: hoursAhead(3),
        durationMinutes: 30,
        type: AppointmentType.VIDEO,
        status: AppointmentStatus.CONFIRMED,
        reminderSentAt: new Date(),
      },
    });
    expect(reminded.reminderSentAt).not.toBeNull();
    const result = await runAppointmentReminders();
    // Only the far-future visit is a counted skip; the rest are not
    // candidates at all and must receive nothing.
    expect(result.reminded).toBe(0);
    expect(result.skipped).toBe(1);
    const notes = await prisma.notification.findMany({ where: { userId: patient.id } });
    expect(notes).toHaveLength(0);
  });

  it('never double-reminds across sweeps', async () => {
    await makeAppointment({ scheduledAt: hoursAhead(20) });
    expect((await runAppointmentReminders()).reminded).toBe(1);
    const second = await runAppointmentReminders();
    expect(second.reminded).toBe(0);
    const notes = await prisma.notification.findMany({ where: { userId: patient.id } });
    expect(notes.filter((n) => n.type === 'APPOINTMENT_REMINDER')).toHaveLength(1);
  });

  it('queues an email nudge when the patient has an email address', async () => {
    await makeAppointment({ scheduledAt: hoursAhead(10) });
    await runAppointmentReminders();
    expect(mockEmailAdd).toHaveBeenCalled();
    const recipients = mockEmailAdd.mock.calls.map((c) => (c[1] as { to?: string }).to);
    expect(recipients).toContain(patient.email);
  });
});
