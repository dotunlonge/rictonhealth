/** B8 TDD RED: OTP verify + resend screen. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
    useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({ email: 'n@example.com' }),
  };
});

const mockedVerify = jest.fn();

jest.mock('@/features/auth/session-provider', () => ({
  useSession: () => ({ verifyOtp: mockedVerify }),
}));

jest.mock('@/features/auth/auth-service', () => ({
  authService: { resendOtp: jest.fn() },
}));

import { authService } from '@/features/auth/auth-service';
import VerifyScreen from '../app/(auth)/verify';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OTP verification', () => {
  it('rejects short codes without calling the backend', async () => {
    await render(<VerifyScreen />);
    await fireEvent.changeText(screen.getByTestId('auth.verify.code'), '123');
    await fireEvent.press(screen.getByTestId('auth.verify.submit'));
    expect(await screen.findByTestId('auth.verify.error')).toBeTruthy();
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it('verifies a 6-digit code', async () => {
    mockedVerify.mockResolvedValue({ kind: 'authenticated', user: { id: 'p1' } });
    await render(<VerifyScreen />);
    await fireEvent.changeText(screen.getByTestId('auth.verify.code'), '123456');
    await fireEvent.press(screen.getByTestId('auth.verify.submit'));
    await waitFor(() =>
      expect(mockedVerify).toHaveBeenCalledWith({ email: 'n@example.com', code: '123456' })
    );
  });

  it('resends the code on request', async () => {
    (authService.resendOtp as jest.Mock).mockResolvedValue(undefined);
    await render(<VerifyScreen />);
    await fireEvent.press(screen.getByTestId('auth.verify.resend'));
    await waitFor(() => expect(authService.resendOtp).toHaveBeenCalledWith('n@example.com'));
    expect(await screen.findByTestId('auth.verify.resent')).toBeTruthy();
  });
});
