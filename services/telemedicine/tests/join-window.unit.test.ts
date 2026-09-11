process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OTP_SECRET = 'test-otp-secret';

import { AppointmentStatus } from '@ricton/db';
import { assertAppointmentJoinWindow } from '../src/controllers/telemedicine.controller';

describe('assertAppointmentJoinWindow (unit, fake timers)', () => {
  const NOW = new Date('2026-09-10T10:00:00.000Z').getTime();
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  const apptAt = (iso: string) => ({
    scheduledAt: new Date(iso),
    durationMinutes: 30,
    status: AppointmentStatus.CONFIRMED,
  });

  it('allows joining inside the window (15 min early … duration + 30 min late)', () => {
    expect(() => assertAppointmentJoinWindow(apptAt('2026-09-10T10:10:00.000Z'))).not.toThrow();
    expect(() => assertAppointmentJoinWindow(apptAt('2026-09-10T10:00:00.000Z'))).not.toThrow();
    expect(() => assertAppointmentJoinWindow(apptAt('2026-09-10T09:30:00.000Z'))).not.toThrow();
  });

  it('rejects too-early joins', () => {
    expect(() => assertAppointmentJoinWindow(apptAt('2026-09-10T10:16:00.000Z'))).toThrow(
      /outside its appointment join window/
    );
  });

  it('rejects joins after duration + late window', () => {
    // 08:59 + 30 min duration + 30 min late = closes 09:59 < now (10:00).
    expect(() => assertAppointmentJoinWindow(apptAt('2026-09-10T08:59:00.000Z'))).toThrow(
      /outside its appointment join window/
    );
  });

  it('rejects cancelled/completed appointments regardless of time', () => {
    for (const status of [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED]) {
      expect(() =>
        assertAppointmentJoinWindow({
          scheduledAt: new Date('2026-09-10T10:00:00.000Z'),
          durationMinutes: 30,
          status,
        })
      ).toThrow(/no longer eligible/);
    }
  });
});
