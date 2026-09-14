/** B1 TDD RED: booking discover/detail/confirm screens (component, mocked service). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ providerId: 'prov-1' }),
}));

jest.mock('@/features/booking/booking-service', () => ({
  bookingService: {
    listProviders: jest.fn(),
    getSlots: jest.fn(),
    createAppointment: jest.fn(),
  },
}));

import { bookingService } from '@/features/booking/booking-service';
import DiscoverScreen from '../app/(app)/booking/index';
import ProviderDetailScreen from '../app/(app)/booking/[providerId]';

const mockedList = bookingService.listProviders as jest.Mock;
const mockedSlots = bookingService.getSlots as jest.Mock;
const mockedCreate = bookingService.createAppointment as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('booking discover', () => {
  it('searches providers and renders results', async () => {
    mockedList.mockResolvedValue({
      providers: [
        {
          id: 'prov-1',
          email: 'doc@example.com',
          providerProfile: { firstName: 'Emeka', lastName: 'E2E', specialty: 'Cardiology' },
        },
      ],
      meta: { total: 1 },
    });
    await render(<DiscoverScreen />);
    await fireEvent.changeText(screen.getByTestId('booking.search'), 'cardio');
    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ search: 'cardio' }))
    );
    expect(await screen.findByText(/Emeka/)).toBeTruthy();
  });

  it('shows an empty state when no providers match', async () => {
    mockedList.mockResolvedValue({ providers: [], meta: { total: 0 } });
    await render(<DiscoverScreen />);
    expect(await screen.findByTestId('booking.empty')).toBeTruthy();
  });
});

describe('booking detail', () => {
  it('lists slots and confirms a booking with idempotency', async () => {
    mockedSlots.mockResolvedValue({ slots: ['2026-09-10T09:00:00Z', '2026-09-10T09:30:00Z'] });
    mockedCreate.mockResolvedValue({ id: 'appt-1', status: 'PENDING' });
    await render(<ProviderDetailScreen />);
    expect(await screen.findByTestId('booking.slots')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('booking.slot-0'));
    await fireEvent.press(screen.getByTestId('booking.confirm'));
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'prov-1' }),
        expect.objectContaining({ idempotencyKey: expect.any(String) })
      )
    );
    expect(await screen.findByTestId('booking.confirmed')).toBeTruthy();
  });
});
