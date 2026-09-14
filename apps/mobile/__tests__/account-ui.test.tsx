/** B7 TDD RED: profile edit, medical history, addresses, password, 2FA. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({}),
  };
});

jest.mock('@/features/account/account-service', () => ({
  accountService: {
    updateProfile: jest.fn(),
    listAddresses: jest.fn(),
    createAddress: jest.fn(),
    deleteAddress: jest.fn(),
    setDefaultAddress: jest.fn(),
    updateMedicalHistory: jest.fn(),
    changePassword: jest.fn(),
    twoFactorStatus: jest.fn(),
    twoFactorSetup: jest.fn(),
    twoFactorVerify: jest.fn(),
    twoFactorDisable: jest.fn(),
  },
}));

jest.mock('@/features/auth/session-provider', () => ({
  useSession: () => ({
    user: { email: 'patient@example.com', firstName: 'Ada', status: 'ACTIVE' },
    signOut: jest.fn(),
  }),
}));

import { accountService } from '@/features/account/account-service';
import ProfileScreen from '../app/(app)/account/profile';
import MedicalHistoryScreen from '../app/(app)/account/medical-history';
import AddressesScreen from '../app/(app)/account/addresses';
import SecurityScreen from '../app/(app)/account/security';

const acct = accountService as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('profile', () => {
  it('saves first name and shows confirmation', async () => {
    acct.updateProfile.mockResolvedValue({ ok: true });
    await render(<ProfileScreen />);
    await fireEvent.changeText(screen.getByTestId('account.first-name'), 'Adaeze');
    await fireEvent.changeText(screen.getByTestId('account.last-name'), 'E2E');
    await fireEvent.press(screen.getByTestId('account.save'));
    await waitFor(() =>
      expect(acct.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Adaeze' })
      )
    );
    expect(await screen.findByTestId('account.saved')).toBeTruthy();
  });

  it('rejects invalid input without calling the backend', async () => {
    await render(<ProfileScreen />);
    await fireEvent.changeText(screen.getByTestId('account.first-name'), '');
    await fireEvent.press(screen.getByTestId('account.save'));
    expect(await screen.findByTestId('account.invalid')).toBeTruthy();
    expect(acct.updateProfile).not.toHaveBeenCalled();
  });
});

describe('medical history', () => {
  it('saves conditions list', async () => {
    acct.updateMedicalHistory.mockResolvedValue({ ok: true });
    await render(<MedicalHistoryScreen />);
    await fireEvent.changeText(screen.getByTestId('account.conditions'), 'Hypertension');
    await fireEvent.press(screen.getByTestId('account.save-history'));
    await waitFor(() =>
      expect(acct.updateMedicalHistory).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ condition: 'Hypertension' })])
      )
    );
    expect(await screen.findByTestId('account.history-saved')).toBeTruthy();
  });
});

describe('addresses', () => {
  it('lists, adds and deletes addresses', async () => {
    acct.listAddresses.mockResolvedValue([
      { id: 'a-1', label: 'Home', city: 'Lagos', isDefault: true },
    ]);
    acct.createAddress.mockResolvedValue({ id: 'a-2' });
    acct.deleteAddress.mockResolvedValue({ ok: true });
    await render(<AddressesScreen />);
    expect(await screen.findByText(/Lagos/)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('account.addr-label'), 'Work');
    await fireEvent.changeText(screen.getByTestId('account.addr-city'), 'Abuja');
    await fireEvent.press(screen.getByTestId('account.addr-add'));
    await waitFor(() =>
      expect(acct.createAddress).toHaveBeenCalledWith(expect.objectContaining({ city: 'Abuja' }))
    );
    await fireEvent.press(screen.getByTestId('account.addr-delete-a-1'));
    await waitFor(() => expect(acct.deleteAddress).toHaveBeenCalledWith('a-1'));
  });
});

describe('security', () => {
  it('changes password with matching confirmation', async () => {
    acct.twoFactorStatus.mockResolvedValue({ twoFactorEnabled: false });
    acct.changePassword.mockResolvedValue({ ok: true });
    await render(<SecurityScreen />);
    await fireEvent.changeText(screen.getByTestId('account.current-password'), 'old12345');
    await fireEvent.changeText(screen.getByTestId('account.new-password'), 'new12345');
    await fireEvent.changeText(screen.getByTestId('account.confirm-password'), 'new12345');
    await fireEvent.press(screen.getByTestId('account.change-password'));
    await waitFor(() =>
      expect(acct.changePassword).toHaveBeenCalledWith({
        currentPassword: 'old12345',
        newPassword: 'new12345',
      })
    );
    expect(await screen.findByTestId('account.password-changed')).toBeTruthy();
  });

  it('enables 2FA after verifying a code', async () => {
    acct.twoFactorStatus.mockResolvedValue({ twoFactorEnabled: false });
    acct.twoFactorSetup.mockResolvedValue({ secret: 'ABC123' });
    acct.twoFactorVerify.mockResolvedValue({ ok: true });
    await render(<SecurityScreen />);
    await fireEvent.press(screen.getByTestId('account.2fa-enable'));
    expect(await screen.findByTestId('account.2fa-secret')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('account.2fa-code'), '123456');
    await fireEvent.press(screen.getByTestId('account.2fa-verify'));
    await waitFor(() => expect(acct.twoFactorVerify).toHaveBeenCalledWith('123456'));
    expect(await screen.findByTestId('account.2fa-on')).toBeTruthy();
  });
});
