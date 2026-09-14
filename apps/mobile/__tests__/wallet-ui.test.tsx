/** B4 TDD RED: wallet overview + top-up + verify (component, mocked service). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@/features/wallet/wallet-service', () => ({
  walletService: {
    balance: jest.fn(),
    transactions: jest.fn(),
    launchTopUp: jest.fn(),
    verifyTopUp: jest.fn(),
    virtualAccount: jest.fn(),
  },
  MIN_TOPUP_NGN: 100,
}));

jest.mock('expo-linking', () => ({ openURL: jest.fn().mockResolvedValue(undefined) }));

import { openURL } from 'expo-linking';
import { walletService } from '@/features/wallet/wallet-service';
import WalletScreen from '../app/(app)/wallet/index';
import TopUpScreen from '../app/(app)/wallet/topup';

const svc = walletService as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('wallet overview', () => {
  it('shows balance, virtual account and transactions', async () => {
    svc.balance.mockResolvedValue({
      balance: 15000,
      currency: 'NGN',
      virtualAccountNumber: '9876543210',
      virtualBankName: 'Wema',
    });
    svc.transactions.mockResolvedValue({
      transactions: [{ id: 't1', type: 'CREDIT', amount: 5000, description: 'Top-up' }],
      total: 1,
    });
    await render(<WalletScreen />);
    expect(await screen.findByText(/15,000/)).toBeTruthy();
    expect(await screen.findByText(/9876543210/)).toBeTruthy();
    expect(await screen.findByText(/Top-up/)).toBeTruthy();
  });

  it('shows an empty state with no transactions', async () => {
    svc.balance.mockResolvedValue({ balance: 0, currency: 'NGN' });
    svc.transactions.mockResolvedValue({ transactions: [], total: 0 });
    await render(<WalletScreen />);
    expect(await screen.findByTestId('wallet.empty')).toBeTruthy();
  });
});

describe('top-up', () => {
  it('rejects amounts below 100 NGN without calling the backend', async () => {
    svc.launchTopUp.mockRejectedValue(new Error('Amount must be at least 100 NGN.'));
    await render(<TopUpScreen />);
    await fireEvent.changeText(screen.getByTestId('wallet.amount'), '50');
    await fireEvent.press(screen.getByTestId('wallet.launch'));
    expect(await screen.findByTestId('wallet.amount-error')).toBeTruthy();
  });

  it('launches provider checkout in the external browser', async () => {
    svc.launchTopUp.mockResolvedValue({
      authorizationUrl: 'https://paystack/checkout',
      reference: 'ref-1',
      amount: 5000,
    });
    await render(<TopUpScreen />);
    await fireEvent.changeText(screen.getByTestId('wallet.amount'), '5000');
    await fireEvent.press(screen.getByTestId('wallet.launch'));
    await waitFor(() => expect(svc.launchTopUp).toHaveBeenCalledWith({ amount: 5000 }));
    expect(await screen.findByTestId('wallet.checkout-opened')).toBeTruthy();
    expect(openURL).toHaveBeenCalledWith('https://paystack/checkout');
  });

  it('verifies the return and refreshes the balance', async () => {
    svc.launchTopUp.mockResolvedValue({
      authorizationUrl: 'https://paystack/checkout',
      reference: 'ref-1',
      amount: 5000,
    });
    svc.verifyTopUp.mockResolvedValue({ id: 'pay-1', status: 'SUCCESS' });
    await render(<TopUpScreen />);
    await fireEvent.changeText(screen.getByTestId('wallet.amount'), '5000');
    await fireEvent.press(screen.getByTestId('wallet.launch'));
    await screen.findByTestId('wallet.checkout-opened');
    await fireEvent.press(screen.getByTestId('wallet.verify'));
    await waitFor(() => expect(svc.verifyTopUp).toHaveBeenCalledWith({ reference: 'ref-1' }));
    expect(await screen.findByTestId('wallet.verified')).toBeTruthy();
  });
});
