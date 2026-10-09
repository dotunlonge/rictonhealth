import { GATEWAY_PATHS } from '@ricton/api-contract';
import { apiClient, ApiClient } from '@/lib/api/client';

function rel(c: string): string {
  return c.replace(/^\/api/, '');
}

export type SupportTicketInput = {
  subject: string;
  body: string;
};

export class SupportService {
  constructor(private readonly api: ApiClient = apiClient) {}
  file(input: SupportTicketInput): Promise<unknown> {
    return this.api.post(rel(GATEWAY_PATHS.supportTickets), {
      subject: input.subject.trim(),
      body: input.body.trim(),
    });
  }
  listMine(): Promise<unknown> {
    return this.api.get(rel(GATEWAY_PATHS.supportTickets));
  }
}
export const supportService = new SupportService();
