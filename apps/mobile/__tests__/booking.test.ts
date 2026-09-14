/** Phase 3 TDD RED: provider discovery + slot-aware booking with idempotency. */
import { BookingService } from '@/features/booking/booking-service';
import type { ApiClient } from '@/lib/api/client';

function deps() {
  return {
    api: { get: jest.fn(), post: jest.fn() } as unknown as ApiClient,
  };
}

describe('BookingService (Phase 3)', () => {
  it('lists providers with search + specialty + pagination', async () => {
    const d = deps();
    (d.api.get as jest.Mock).mockResolvedValue({ providers: [], meta: { total: 0 } });
    const s = new BookingService(d.api);
    await s.listProviders({ search: 'derma', specialty: 'DERMATOLOGY', limit: 20, offset: 0 });
    expect(d.api.get).toHaveBeenCalledWith(expect.stringContaining('/providers'));
    expect(d.api.get).toHaveBeenCalledWith(expect.stringContaining('name=derma'));
  });

  it('unwraps API envelopes for slots into a stable screen shape', async () => {
    const d = deps();
    (d.api.get as jest.Mock).mockResolvedValue({ data: ['2026-09-10T09:00:00Z'] });
    const s = new BookingService(d.api);
    await expect(s.getSlots('prov-1', '2026-09-10')).resolves.toEqual({
      slots: ['2026-09-10T09:00:00Z'],
    });
  });

  it('sends idempotency key when creating an appointment', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({ id: 'appt-1', status: 'PENDING' });
    const s = new BookingService(d.api);
    await s.createAppointment(
      {
        providerId: 'prov-1',
        scheduledAt: new Date().toISOString(),
        type: 'VIDEO',
        reason: 'Follow-up',
      },
      { idempotencyKey: 'key-123' }
    );
    expect(d.api.post).toHaveBeenCalledWith(
      expect.stringContaining('/appointments'),
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Idempotency-Key': 'key-123' }),
      })
    );
  });

  it('maps slot conflicts to a typed error', async () => {
    const d = deps();
    const conflict = Object.assign(new Error('Slot taken'), { status: 409, code: 'SLOT_TAKEN' });
    (d.api.post as jest.Mock).mockRejectedValue(conflict);
    const s = new BookingService(d.api);
    await expect(
      s.createAppointment(
        { providerId: 'p', scheduledAt: new Date().toISOString(), type: 'VIDEO' },
        { idempotencyKey: 'k' }
      )
    ).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
  });
});
