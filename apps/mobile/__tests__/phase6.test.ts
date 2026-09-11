/** Phase 6 TDD RED: premium entitlements, messaging, notifications, account. */
import { SubscriptionService } from '@/features/subscription/subscription-service';
import { RewardsService } from '@/features/rewards/rewards-service';
import { MessagingService } from '@/features/messaging/messaging-service';
import { NotificationService } from '@/features/notifications/notification-service';
import { AccountService } from '@/features/account/account-service';
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

describe('Phase 6 services', () => {
  it('loads plans + refreshes server-authoritative entitlement', async () => {
    const a = api();
    (a.get as jest.Mock)
      .mockResolvedValueOnce({ plans: [] })
      .mockResolvedValueOnce({ status: 'ACTIVE', plan: 'PREMIUM' });
    const s = new SubscriptionService(a);
    await s.listPlans();
    await expect(s.refreshEntitlement()).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(a.get).toHaveBeenCalledWith(expect.stringContaining('/plans'));
    expect(a.get).toHaveBeenCalledWith(expect.stringContaining('/my'));
  });

  it('subscribes with the backend plan enum contract, not a UI plan id', async () => {
    const a = api();
    (a.post as jest.Mock).mockResolvedValue({ reference: 'SUB_1' });
    const s = new SubscriptionService(a);
    await s.subscribe({ plan: 'PREMIUM' }, { idempotencyKey: 'subscription-key' });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/upgrade'),
      { plan: 'PREMIUM' },
      { headers: { 'Idempotency-Key': 'subscription-key' } }
    );
  });

  it('redeems rewards with rewardId and maps conflicts', async () => {
    const a = api();
    const conflict = Object.assign(new Error('Already redeemed'), {
      status: 409,
      code: 'REWARD_CONFLICT',
    });
    (a.post as jest.Mock).mockRejectedValue(conflict);
    const s = new RewardsService(a);
    await expect(
      s.redeem({ rewardId: 'rw-1' }, { idempotencyKey: 'redeem-key' })
    ).rejects.toMatchObject({ code: 'REWARD_CONFLICT' });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/redeem'),
      expect.objectContaining({ rewardId: 'rw-1' }),
      { headers: { 'Idempotency-Key': 'redeem-key' } }
    );
  });

  it('sends messages with idempotency and marks read', async () => {
    const a = api();
    (a.post as jest.Mock).mockResolvedValue({ id: 'm-1' });
    (a.patch as jest.Mock).mockResolvedValue({ ok: true });
    const s = new MessagingService(a);
    await s.sendMessage({ conversationId: 'c-1', body: 'Hello' }, { idempotencyKey: 'm-key' });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/messages'),
      expect.objectContaining({ body: 'Hello' }),
      expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': 'm-key' }) })
    );
    await s.markRead({ conversationId: 'c-1' });
    expect(a.patch).toHaveBeenCalledWith(expect.stringContaining('/read'), expect.anything());
  });

  it('updates notification preferences + registers push token', async () => {
    const a = api();
    (a.put as jest.Mock).mockResolvedValue({ ok: true });
    (a.post as jest.Mock).mockResolvedValue({ ok: true });
    const s = new NotificationService(a);
    await s.updatePreferences({ push: true });
    await s.registerPushToken({ token: 'expo-push', platform: 'ios' });
    expect(a.put).toHaveBeenCalledWith(expect.stringContaining('/preferences'), expect.anything());
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/push-token'),
      expect.objectContaining({ token: 'expo-push' })
    );
  });

  it('edits profile + manages addresses + changes password', async () => {
    const a = api();
    (a.put as jest.Mock).mockResolvedValue({ ok: true });
    (a.post as jest.Mock).mockResolvedValue({ ok: true });
    const s = new AccountService(a);
    await s.updateProfile({ firstName: 'Ada' });
    expect(a.put).toHaveBeenCalledWith(
      expect.stringContaining('/users/me'),
      expect.objectContaining({ firstName: 'Ada' })
    );
    await s.createAddress({ label: 'Home', city: 'Lagos' });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/addresses'),
      expect.objectContaining({ city: 'Lagos' })
    );
    await s.changePassword({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });
    expect(a.post).toHaveBeenCalledWith(
      expect.stringContaining('/password/change'),
      expect.objectContaining({ newPassword: 'NewPassword123!' })
    );
  });
});
