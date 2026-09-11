import { GATEWAY_PATHS } from '@ricton/api-contract';
import { apiClient, ApiClient } from '@/lib/api/client';

function rel(c: string): string {
  return c.replace(/^\/api/, '');
}

export class NotificationService {
  constructor(private readonly api: ApiClient = apiClient) {}
  list(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.notifications));
  }
  updatePreferences(input: Record<string, unknown>): Promise<unknown> {
    return this.api.put(rel(GATEWAY_PATHS.notificationPreferences), input);
  }
  registerPushToken(input: { token: string; platform: string }): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.notificationPushToken), input);
  }
  revokePushToken(input: { token: string }): Promise<unknown> {
    return this.api.delete(`${rel(GATEWAY_PATHS.notificationPushToken)}/${input.token}`);
  }
}
export const notificationService = new NotificationService();
