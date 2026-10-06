import { GATEWAY_PATHS } from '@ricton/api-contract';
import { apiClient, ApiClient } from '@/lib/api/client';

function rel(c: string): string {
  return c.replace(/^\/api/, '');
}

export class SubscriptionService {
  constructor(private readonly api: ApiClient = apiClient) {}
  listPlans(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.subscriptionPlans));
  }
  /** Server-authoritative entitlement; client never grants premium locally. */
  refreshEntitlement(): Promise<{ status: string; plan: 'FREE' | 'PREMIUM' }> {
    return this.api.get(rel(GATEWAY_PATHS.subscriptionMy));
  }
  subscribe(input: { plan: 'PREMIUM' }, options: { idempotencyKey: string }): Promise<unknown> {
    return this.api.post(
      rel(GATEWAY_PATHS.subscriptionUpgrade),
      { plan: input.plan },
      { headers: { 'Idempotency-Key': options.idempotencyKey } }
    );
  }
  cancel(): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.subscriptionCancel), {});
  }
  history(query: { limit?: number; offset?: number } = {}): Promise<unknown> {
    const params = new URLSearchParams({
      limit: String(query.limit ?? 10),
      offset: String(query.offset ?? 0),
    });
    return this.api.get(`${rel('/api/subscriptions/history')}?${params.toString()}`);
  }
}
export const subscriptionService = new SubscriptionService();
