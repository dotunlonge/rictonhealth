/** Phase 4 TDD RED: prescription orderability + pharmacy handoff + telemedicine join window. */
import { PrescriptionService, isOrderable } from '@/features/prescriptions/prescription-service';
import { canJoinNow } from '@/features/telemedicine/telemedicine-service';
import type { ApiClient } from '@/lib/api/client';

function api() {
  return { get: jest.fn(), post: jest.fn(), patch: jest.fn() } as unknown as ApiClient;
}

describe('prescription orderability', () => {
  it('unsigned prescriptions are not orderable', () => {
    expect(isOrderable({ id: 'rx1', status: 'DRAFT', signedAt: null } as never)).toBe(false);
  });
  it('signed prescriptions are orderable', () => {
    expect(
      isOrderable({ id: 'rx1', status: 'SIGNED', signedAt: '2026-09-01T10:00:00Z' } as never)
    ).toBe(true);
  });
  it('dispensed prescriptions are history-only', () => {
    expect(
      isOrderable({ id: 'rx1', status: 'DISPENSED', signedAt: '2026-09-01T10:00:00Z' } as never)
    ).toBe(false);
  });
  it('hands off signed prescriptions through the assignment endpoint', async () => {
    const a = api();
    (a.patch as jest.Mock).mockResolvedValue({ id: 'rx1', status: 'SENT_TO_PHARMACY' });
    const s = new PrescriptionService(a);
    await s.sendToPharmacy({ prescriptionId: 'rx1', pharmacyId: 'pharmacy-1' });
    expect(a.patch).toHaveBeenCalledWith('/prescriptions/rx1/send-to-pharmacy', {
      pharmacyId: 'pharmacy-1',
    });
  });
});

describe('telemedicine join window', () => {
  const now = new Date('2026-09-05T10:00:00Z').getTime();
  it('disables join well before the window', () => {
    expect(canJoinNow('2026-09-05T12:00:00Z', 30, now)).toBe(false);
  });
  it('enables join inside the window', () => {
    expect(canJoinNow('2026-09-05T10:15:00Z', 30, now)).toBe(true);
  });
  it('allows the same 30-minute post-appointment grace period as the backend', () => {
    expect(canJoinNow('2026-09-05T09:00:00Z', 30, new Date('2026-09-05T09:59:59Z').getTime())).toBe(
      true
    );
    expect(canJoinNow('2026-09-05T09:00:00Z', 30, new Date('2026-09-05T10:00:01Z').getTime())).toBe(
      false
    );
  });
  it('accepts tuned windows without changing the 15/30 defaults', () => {
    // A deployment that widens the backend window must not desync the lobby.
    expect(
      canJoinNow('2026-09-05T12:00:00Z', 30, now, { earlyMinutes: 180, lateMinutes: 60 })
    ).toBe(true);
    expect(canJoinNow('2026-09-05T12:00:00Z', 30, now)).toBe(false);
  });
});
