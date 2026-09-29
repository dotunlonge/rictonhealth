import { GATEWAY_PATHS } from '@ricton/api-contract';

import { apiClient, ApiClient, ApiClientError } from '@/lib/api/client';

function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

export interface ProviderQuery {
  search?: string;
  specialty?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAppointmentInput {
  providerId: string;
  scheduledAt: string;
  type: string;
  reason?: string;
}

function unwrapData<T>(value: unknown): T {
  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    (value as { data?: unknown }).data !== undefined
  ) {
    return (value as { data: T }).data;
  }
  return value as T;
}

export class SlotTakenError extends ApiClientError {
  constructor(message = 'That slot was just taken. Choose another time.') {
    super(message, 'SLOT_TAKEN', 409);
    this.name = 'SlotTakenError';
  }
}

export class BookingService {
  constructor(private readonly api: ApiClient = apiClient) {}

  async listProviders(query: ProviderQuery = {}): Promise<unknown> {
    const params = new URLSearchParams();
    if (query.search) params.set('name', query.search);
    if (query.specialty) params.set('specialty', query.specialty);
    params.set('limit', String(query.limit ?? 20));
    params.set('offset', String(query.offset ?? 0));
    return unwrapData(await this.api.get(`${rel(GATEWAY_PATHS.providers)}?${params.toString()}`));
  }

  async getSlots(providerId: string, date: string): Promise<unknown> {
    const params = new URLSearchParams({ providerId, date });
    const data = unwrapData<string[] | { slots?: string[] }>(
      await this.api.get(`${rel(GATEWAY_PATHS.providerSlots)}?${params.toString()}`)
    );
    return Array.isArray(data) ? { slots: data } : data;
  }

  async cancelAppointment(id: string, reason?: string): Promise<unknown> {
    return unwrapData(
      await this.api.patch(`${rel(GATEWAY_PATHS.appointments)}/${id}/cancel`, {
        ...(reason ? { reason } : {}),
      })
    );
  }

  async rescheduleAppointment(id: string, scheduledAt: string): Promise<unknown> {
    try {
      return unwrapData(
        await this.api.patch(`${rel(GATEWAY_PATHS.appointments)}/${id}/reschedule`, {
          scheduledAt,
        })
      );
    } catch (caught) {
      const status =
        caught instanceof ApiClientError ? caught.status : (caught as { status?: unknown }).status;
      if (status === 409) {
        throw new SlotTakenError(caught instanceof Error ? caught.message : undefined);
      }
      throw caught;
    }
  }

  /**
   * Provider-hosted consultation-fee checkout. The amount is server-priced
   * from the provider's consultationFee; the client never sends an amount.
   * Payment stays advisory (cash/offline flows exist) — confirmation never
   * blocks on it.
   */
  async initiateAppointmentPayment(input: {
    appointmentId: string;
    email: string;
  }): Promise<{ authorization_url: string; reference: string; paymentId: string }> {
    return unwrapData(
      await this.api.post(`${rel(GATEWAY_PATHS.paymentInitialize)}`, {
        email: input.email,
        type: 'APPOINTMENT',
        referenceId: input.appointmentId,
      })
    );
  }

  /** Reconcile a provider return against server state. */
  async verifyAppointmentPayment(reference: string): Promise<{ status: string }> {
    return unwrapData(await this.api.get(`${rel(GATEWAY_PATHS.paymentVerify)}/${reference}`));
  }

  async createAppointment(
    input: CreateAppointmentInput,
    options: { idempotencyKey: string }
  ): Promise<unknown> {
    try {
      return await this.api.post(
        rel(GATEWAY_PATHS.appointments),
        {
          providerId: input.providerId,
          scheduledAt: input.scheduledAt,
          type: input.type,
          ...(input.reason ? { reason: input.reason } : {}),
        },
        { headers: { 'Idempotency-Key': options.idempotencyKey } }
      );
    } catch (caught) {
      // Server reality: 409 + code APPOINTMENT_CONFLICT (in-flight
      // idempotency replays also surface here). Map every 409 to the typed
      // slot-taken error while preserving the server message. Duck-type the
      // status so the mapping survives cross-module class duplicates.
      const status =
        caught instanceof ApiClientError ? caught.status : (caught as { status?: unknown }).status;
      if (status === 409) {
        throw new SlotTakenError(caught instanceof Error ? caught.message : undefined);
      }
      throw caught;
    }
  }
}

export const bookingService = new BookingService();
