import { GATEWAY_PATHS } from '@ricton/api-contract';
import { apiClient, ApiClient, ApiClientError } from '@/lib/api/client';

function rel(c: string): string {
  return c.replace(/^\/api/, '');
}

export class RewardsService {
  constructor(private readonly api: ApiClient = apiClient) {}
  balance(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.rewardsBalance));
  }
  catalog(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.rewardsCatalog));
  }
  async redeem(input: { rewardId: string }, options: { idempotencyKey: string }): Promise<unknown> {
    try {
      return await this.api.post(
        rel(GATEWAY_PATHS.rewardsRedeem),
        { rewardId: input.rewardId },
        { headers: { 'Idempotency-Key': options.idempotencyKey } }
      );
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        (caught.status === 409 || caught.code === 'REWARD_CONFLICT')
      ) {
        throw new ApiClientError(caught.message, 'REWARD_CONFLICT', 409, caught.details);
      }
      throw caught;
    }
  }
}
export const rewardsService = new RewardsService();
