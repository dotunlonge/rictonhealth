/** Support filing parity (web S9 → mobile): patient files + lists own tickets. */
import { GATEWAY_PATHS } from '@ricton/api-contract';
import { SupportService } from '@/features/support/support-service';
import type { ApiClient } from '@/lib/api/client';

function api() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  } as unknown as ApiClient;
}

describe('SupportService (patient)', () => {
  it('pins the user-facing ticket path in the gateway contract', () => {
    expect(GATEWAY_PATHS.supportTickets).toBe('/api/admin/support/tickets');
  });

  it('files a ticket with subject + body', async () => {
    const a = api();
    (a.post as jest.Mock).mockResolvedValue({ id: 't-1' });
    const s = new SupportService(a);
    await s.file({ subject: 'Wallet top-up missing', body: 'Paid 5k, no credit after 1h.' });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/support/tickets'),
      expect.objectContaining({ subject: 'Wallet top-up missing' })
    );
  });

  it('lists the caller’s own tickets', async () => {
    const a = api();
    (a.get as jest.Mock).mockResolvedValue({ tickets: [] });
    const s = new SupportService(a);
    await s.listMine();
    expect(a.get).toHaveBeenCalledWith(expect.stringContaining('/support/tickets'));
  });
});
