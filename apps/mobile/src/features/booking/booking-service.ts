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
      if (
        caught instanceof ApiClientError &&
        (caught.status === 409 || caught.code === 'SLOT_TAKEN')
      ) {
        throw new SlotTakenError(caught.message);
      }
      throw caught;
    }
  }
}

export const bookingService = new BookingService();
