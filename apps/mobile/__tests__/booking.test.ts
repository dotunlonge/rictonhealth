/** Phase 3 TDD RED: provider discovery + slot-aware booking with idempotency. */
import { BookingService, SlotTakenError } from '@/features/booking/booking-service';
import { ApiClientError } from '@/lib/api/client';
import type { ApiClient } from '@/lib/api/client';

function deps() {
  return {
    api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } as unknown as ApiClient,
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

  it('sends nearby coordinates and radius when locating', async () => {
    const d = deps();
    (d.api.get as jest.Mock).mockResolvedValue({ providers: [] });
    const s = new BookingService(d.api);
    await s.listProviders({
      latitude: 6.5244,
      longitude: 3.3792,
      radiusKm: 10,
      limit: 50,
    });
    const called = (d.api.get as jest.Mock).mock.calls[0][0] as string;
    expect(called).toContain('/providers');
    expect(called).toContain('latitude=6.5244');
    expect(called).toContain('longitude=3.3792');
    expect(called).toContain('radiusKm=10');
  });

  it('omits geo parameters when no location is shared', async () => {
    const d = deps();
    (d.api.get as jest.Mock).mockResolvedValue({ providers: [] });
    const s = new BookingService(d.api);
    await s.listProviders({ search: 'cardio' });
    const called = (d.api.get as jest.Mock).mock.calls[0][0] as string;
    expect(called).not.toContain('latitude=');
    expect(called).not.toContain('radiusKm=');
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
    // Server reality: 409 + code APPOINTMENT_CONFLICT (never SLOT_TAKEN).
    const conflict = new ApiClientError(
      'This time slot is already booked',
      'APPOINTMENT_CONFLICT',
      409
    );
    (d.api.post as jest.Mock).mockRejectedValue(conflict);
    const s = new BookingService(d.api);
    await expect(
      s.createAppointment(
        { providerId: 'p', scheduledAt: new Date().toISOString(), type: 'VIDEO' },
        { idempotencyKey: 'k' }
      )
    ).rejects.toThrow(SlotTakenError);
  });

  it('maps bare 409s to a typed error even without a code', async () => {
    const d = deps();
    const conflict = new ApiClientError('Conflict', 'CONFLICT', 409);
    (d.api.post as jest.Mock).mockRejectedValue(conflict);
    const s = new BookingService(d.api);
    await expect(
      s.createAppointment(
        { providerId: 'p', scheduledAt: new Date().toISOString(), type: 'VIDEO' },
        { idempotencyKey: 'k' }
      )
    ).rejects.toThrow(SlotTakenError);
  });

  it('cancels an appointment via the cancel endpoint', async () => {
    const d = deps();
    (d.api.patch as jest.Mock).mockResolvedValue({ id: 'appt-1', status: 'CANCELLED' });
    const s = new BookingService(d.api);
    await s.cancelAppointment('appt-1');
    expect(d.api.patch).toHaveBeenCalledWith(
      expect.stringContaining('/appointments/appt-1/cancel'),
      expect.anything()
    );
  });

  it('reschedules an appointment to a new slot', async () => {
    const d = deps();
    const target = new Date(Date.now() + 86400000).toISOString();
    (d.api.patch as jest.Mock).mockResolvedValue({ id: 'appt-1', scheduledAt: target });
    const s = new BookingService(d.api);
    await s.rescheduleAppointment('appt-1', target);
    expect(d.api.patch).toHaveBeenCalledWith(
      expect.stringContaining('/appointments/appt-1/reschedule'),
      expect.objectContaining({ scheduledAt: target })
    );
  });

  it('initiates an appointment payment via provider-hosted checkout', async () => {
    const d = deps();
    (d.api.post as jest.Mock).mockResolvedValue({
      data: {
        authorization_url: 'https://checkout.paystack.com/x',
        reference: 'ref-1',
        paymentId: 'pay-1',
      },
    });
    const s = new BookingService(d.api);
    const launched = await s.initiateAppointmentPayment({
      appointmentId: 'appt-1',
      email: 'patient@example.com',
    });
    expect(d.api.post).toHaveBeenCalledWith(
      expect.stringContaining('/payments/initialize'),
      expect.objectContaining({
        type: 'APPOINTMENT',
        referenceId: 'appt-1',
        email: 'patient@example.com',
      })
    );
    expect(launched.authorization_url).toBe('https://checkout.paystack.com/x');
  });

  it('verifies an appointment payment by reference', async () => {
    const d = deps();
    (d.api.get as jest.Mock).mockResolvedValue({ data: { status: 'SUCCESS' } });
    const s = new BookingService(d.api);
    const result = await s.verifyAppointmentPayment('ref-1');
    expect(d.api.get).toHaveBeenCalledWith(expect.stringContaining('/payments/verify/ref-1'));
    expect(result.status).toBe('SUCCESS');
  });
});
