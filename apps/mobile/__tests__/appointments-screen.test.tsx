/** Appointment payment badges + pay/verify (component, mocked service). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { openURL } from 'expo-linking';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/auth/session-provider', () => ({
  useSession: () => ({ user: { id: 'patient-1', email: 'patient@example.com' } }),
}));

jest.mock('@/lib/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

jest.mock('@/features/booking/booking-service', () => ({
  bookingService: {
    cancelAppointment: jest.fn(),
    initiateAppointmentPayment: jest.fn(),
    verifyAppointmentPayment: jest.fn(),
  },
}));

import { apiClient } from '@/lib/api/client';
import { bookingService } from '@/features/booking/booking-service';
import { useRouter } from 'expo-router';
import AppointmentsScreen from '../app/(app)/(tabs)/appointments';

const mockedPush = jest.fn();
(useRouter as jest.Mock).mockReturnValue({ push: mockedPush, back: jest.fn() });

const mockedGet = apiClient.get as jest.Mock;
const mockedPay = bookingService.initiateAppointmentPayment as jest.Mock;
const mockedVerify = bookingService.verifyAppointmentPayment as jest.Mock;
const mockedOpenURL = openURL as jest.Mock;

function appointment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appt-1',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    durationMinutes: 30,
    type: 'VIDEO',
    status: 'CONFIRMED',
    provider: {
      email: 'doc@example.com',
      providerProfile: {
        firstName: 'Emeka',
        lastName: 'E2E',
        specialty: 'Cardiology',
        consultationFee: 15000,
      },
    },
    telemedicineRoom: null,
    payment: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const reset = (global as Record<string, unknown>).__resetAsyncStorageMock as
    | (() => void)
    | undefined;
  reset?.();
});

describe('appointments payment', () => {
  it('shows a paid badge when the visit is paid', async () => {
    mockedGet.mockResolvedValue({
      appointments: [appointment({ payment: { id: 'pay-1', status: 'SUCCESS', amount: 15000 } })],
      meta: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    await render(<AppointmentsScreen />);
    expect(await screen.findByTestId('patient.appointments.paid')).toBeTruthy();
    expect(screen.queryByTestId('patient.appointments.pay')).toBeNull();
  });

  it('launches provider-hosted checkout for an unpaid visit', async () => {
    mockedGet.mockResolvedValue({
      appointments: [appointment()],
      meta: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    mockedPay.mockResolvedValue({
      authorization_url: 'https://checkout.paystack.com/x',
      reference: 'ref-1',
      paymentId: 'pay-1',
    });
    await render(<AppointmentsScreen />);
    await fireEvent.press(await screen.findByTestId('patient.appointments.pay'));
    await waitFor(() =>
      expect(mockedPay).toHaveBeenCalledWith({
        appointmentId: 'appt-1',
        email: 'patient@example.com',
      })
    );
    expect(mockedOpenURL).toHaveBeenCalledWith('https://checkout.paystack.com/x');
    expect(await screen.findByTestId('patient.appointments.verify')).toBeTruthy();
  });

  it('verifies the payment and reloads on success', async () => {
    mockedGet.mockResolvedValue({
      appointments: [appointment()],
      meta: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    mockedPay.mockResolvedValue({
      authorization_url: 'https://checkout.paystack.com/x',
      reference: 'ref-1',
      paymentId: 'pay-1',
    });
    mockedVerify.mockResolvedValue({ status: 'SUCCESS' });
    await render(<AppointmentsScreen />);
    await fireEvent.press(await screen.findByTestId('patient.appointments.pay'));
    await fireEvent.press(await screen.findByTestId('patient.appointments.verify'));
    await waitFor(() => expect(mockedVerify).toHaveBeenCalledWith('ref-1'));
    await waitFor(() => expect(mockedGet).toHaveBeenCalledTimes(2));
  });

  it('opens the slot grid in reschedule mode for upcoming visits', async () => {
    mockedGet.mockResolvedValue({
      appointments: [appointment({ id: 'appt-9', provider: { id: 'prov-1' } })],
      meta: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    await render(<AppointmentsScreen />);
    await fireEvent.press(await screen.findByTestId('patient.appointments.reschedule'));
    expect(mockedPush).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ providerId: 'prov-1', rescheduleId: 'appt-9' }),
      })
    );
  });

  it('shows where to go for in-person visits', async () => {
    mockedGet.mockResolvedValue({
      appointments: [
        appointment({
          type: 'IN_PERSON',
          hospital: {
            id: 'hosp-1',
            name: 'Lagos General',
            address: { line1: '12 Clinic Road', city: 'Ikeja', state: 'Lagos', country: 'NG' },
          },
        }),
      ],
      meta: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    await render(<AppointmentsScreen />);
    expect(await screen.findByTestId('patient.appointments.location')).toBeTruthy();
    expect(await screen.findByText(/Lagos General/)).toBeTruthy();
    expect(await screen.findByText(/Ikeja/)).toBeTruthy();
  });

  it('says to confirm the venue when no hospital is linked', async () => {
    mockedGet.mockResolvedValue({
      appointments: [appointment({ type: 'IN_PERSON', hospital: null })],
      meta: { total: 1, limit: 50, offset: 0, hasMore: false },
    });
    await render(<AppointmentsScreen />);
    expect(await screen.findByTestId('patient.appointments.location')).toBeTruthy();
    expect(await screen.findByText(/Confirm the venue/i)).toBeTruthy();
  });
});
