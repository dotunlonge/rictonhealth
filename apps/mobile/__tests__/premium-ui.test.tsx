/** B5 TDD RED: subscription plans/subscribe/cancel + rewards earn/redeem. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/features/subscription/subscription-service', () => ({
  subscriptionService: {
    listPlans: jest.fn(),
    refreshEntitlement: jest.fn(),
    subscribe: jest.fn(),
    cancel: jest.fn(),
  },
}));

jest.mock('@/features/rewards/rewards-service', () => ({
  rewardsService: { balance: jest.fn(), catalog: jest.fn(), redeem: jest.fn() },
}));

jest.mock('expo-linking', () => ({ openURL: jest.fn().mockResolvedValue(undefined) }));

import { openURL } from 'expo-linking';
import { subscriptionService } from '@/features/subscription/subscription-service';
import { rewardsService } from '@/features/rewards/rewards-service';
import PremiumScreen from '../app/(app)/premium/index';
import RewardsScreen from '../app/(app)/premium/rewards';

const sub = subscriptionService as unknown as Record<string, jest.Mock>;
const rew = rewardsService as unknown as Record<string, jest.Mock>;

const PLANS = {
  plans: [
    {
      id: 'free',
      name: 'Free',
      code: 'FREE',
      price: 0,
      currency: 'NGN',
      features: ['Basic booking'],
    },
    {
      id: 'premium',
      name: 'Premium',
      code: 'PREMIUM',
      price: 5000,
      currency: 'NGN',
      features: ['Specialists', '10% pharmacy off'],
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('premium subscription', () => {
  it('shows plans with the server entitlement and opens checkout on subscribe', async () => {
    sub.listPlans.mockResolvedValue(PLANS);
    sub.refreshEntitlement.mockResolvedValue({ plan: 'FREE', status: 'ACTIVE' });
    sub.subscribe.mockResolvedValue({ paymentUrl: 'https://paystack/premium', reference: 'SUB_1' });
    await render(<PremiumScreen />);
    expect(await screen.findByTestId('premium.plan-premium')).toBeTruthy();
    expect(await screen.findByTestId('premium.current-free')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('premium.subscribe'));
    await waitFor(() =>
      expect(sub.subscribe).toHaveBeenCalledWith(
        { plan: 'PREMIUM' },
        expect.objectContaining({ idempotencyKey: expect.any(String) })
      )
    );
    expect(openURL).toHaveBeenCalledWith('https://paystack/premium');
  });

  it('offers cancel when premium is active', async () => {
    sub.listPlans.mockResolvedValue(PLANS);
    sub.refreshEntitlement.mockResolvedValue({ plan: 'PREMIUM', status: 'ACTIVE' });
    sub.cancel.mockResolvedValue({ ok: true });
    await render(<PremiumScreen />);
    expect(await screen.findByTestId('premium.current-premium')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('premium.cancel'));
    await waitFor(() => expect(sub.cancel).toHaveBeenCalled());
  });
});

describe('rewards', () => {
  it('shows balance, tier and catalog', async () => {
    rew.balance.mockResolvedValue({ balance: 1200, tier: 'Silver' });
    rew.catalog.mockResolvedValue({
      items: [{ id: 'rw-1', name: 'Vitamin C', pointsCost: 800, stock: 3 }],
    });
    await render(<RewardsScreen />);
    expect(await screen.findByText(/1,200/)).toBeTruthy();
    expect(await screen.findByText(/Vitamin C/)).toBeTruthy();
  });

  it('redeems and surfaces conflicts without crashing', async () => {
    rew.balance.mockResolvedValue({ balance: 1200, tier: 'Silver' });
    rew.catalog.mockResolvedValue({
      items: [{ id: 'rw-1', name: 'Vitamin C', pointsCost: 800, stock: 3 }],
    });
    const conflict = Object.assign(new Error('Already redeemed'), {
      code: 'REWARD_CONFLICT',
      status: 409,
    });
    rew.redeem.mockRejectedValueOnce(conflict).mockResolvedValueOnce({ ok: true });
    await render(<RewardsScreen />);
    await screen.findByText(/Vitamin C/);
    await fireEvent.press(screen.getByTestId('rewards.redeem-rw-1'));
    expect(await screen.findByTestId('rewards.conflict')).toBeTruthy();
    expect(rew.redeem).toHaveBeenCalledWith(
      { rewardId: 'rw-1' },
      expect.objectContaining({ idempotencyKey: expect.any(String) })
    );
  });
});
