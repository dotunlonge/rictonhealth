import { GATEWAY_PATHS } from '@ricton/api-contract';

import { apiClient, ApiClient } from '@/lib/api/client';

function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

export interface TopUpLaunch {
  checkoutUrl: string;
  reference: string;
}

export interface TopUpVerification {
  status: string;
  balance?: number;
}

export class WalletService {
  constructor(private readonly api: ApiClient = apiClient) {}

  balance(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.walletMe));
  }

  transactions(query: { limit?: number; offset?: number } = {}): Promise<unknown> {
    const params = new URLSearchParams({
      limit: String(query.limit ?? 20),
      offset: String(query.offset ?? 0),
    });
    return this.api.get(`${rel(GATEWAY_PATHS.walletTransactions)}?${params.toString()}`);
  }

  /** Provider-hosted checkout: returns URL + reference; never credits locally.
   * Idempotency is enforced via the provider reference on verify/webhook (duplicate-callback safe). */
  launchTopUp(input: { amount: number }): Promise<TopUpLaunch> {
    return this.api.post<TopUpLaunch>(rel(GATEWAY_PATHS.walletTopup), { amount: input.amount });
  }

  /** Reconcile provider returns against server state. */
  verifyTopUp(input: { reference: string }): Promise<TopUpVerification> {
    return this.api.get<TopUpVerification>(
      `${rel(GATEWAY_PATHS.paymentVerify)}/${input.reference}`
    );
  }

  virtualAccount(): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.walletVirtualAccount), {});
  }
}

export const walletService = new WalletService();
