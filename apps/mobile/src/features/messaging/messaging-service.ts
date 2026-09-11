import { GATEWAY_PATHS } from '@ricton/api-contract';
import { apiClient, ApiClient } from '@/lib/api/client';

function rel(c: string): string {
  return c.replace(/^\/api/, '');
}

export class MessagingService {
  constructor(private readonly api: ApiClient = apiClient) {}
  conversations(): Promise<unknown> {
    return this.api.get(`${rel(GATEWAY_PATHS.messages)}/conversations`);
  }
  thread(id: string): Promise<unknown> {
    return this.api.get(`${rel(GATEWAY_PATHS.messages)}/conversations/${id}`);
  }
  sendMessage(
    input: { conversationId: string; body: string },
    options: { idempotencyKey: string }
  ): Promise<unknown> {
    return this.api.post(
      `${rel(GATEWAY_PATHS.messages)}/conversations/${input.conversationId}/messages`,
      { body: input.body },
      { headers: { 'Idempotency-Key': options.idempotencyKey } }
    );
  }
  markRead(input: { conversationId: string }): Promise<unknown> {
    return this.api.patch(
      `${rel(GATEWAY_PATHS.messages)}/conversations/${input.conversationId}/read`,
      {}
    );
  }
}
export const messagingService = new MessagingService();
