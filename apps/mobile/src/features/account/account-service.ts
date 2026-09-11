import { GATEWAY_PATHS } from '@ricton/api-contract';
import { apiClient, ApiClient } from '@/lib/api/client';

function rel(c: string): string {
  return c.replace(/^\/api/, '');
}

export class AccountService {
  constructor(private readonly api: ApiClient = apiClient) {}
  updateProfile(patch: Record<string, unknown>): Promise<unknown> {
    return this.api.put(rel(GATEWAY_PATHS.usersMe), patch);
  }
  createAddress(input: Record<string, unknown>): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.addresses), input);
  }
  changePassword(input: { currentPassword: string; newPassword: string }): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.authPasswordChange), input);
  }
}
export const accountService = new AccountService();
