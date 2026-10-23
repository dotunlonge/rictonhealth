/** B1 TDD RED: booking discover/detail/confirm screens (component, mocked service). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockRouterPush = jest.fn();

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: mockRouterPush, back: jest.fn() }),
  useLocalSearchParams: jest.fn(() => ({ providerId: 'prov-1' })),
}));

jest.mock('@/features/booking/booking-service', () => ({
  bookingService: {
    listProviders: jest.fn(),
    getSlots: jest.fn(),
    createAppointment: jest.fn(),
    rescheduleAppointment: jest.fn(),
  },
}));

import { bookingService } from '@/features/booking/booking-service';
import { useLocalSearchParams } from 'expo-router';
import DiscoverScreen from '../app/(app)/booking/index';
import ProviderDetailScreen from '../app/(app)/booking/[providerId]';

const mockedParams = useLocalSearchParams as jest.Mock;

const mockedList = bookingService.listProviders as jest.Mock;
const mockedSlots = bookingService.getSlots as jest.Mock;
const mockedCreate = bookingService.createAppointment as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  // Persistent default (renders re-read params after each state update, so
  // one-shot values would only survive the first render).
  mockedParams.mockReturnValue({ providerId: 'prov-1' });
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

  it('uses location to search nearby and renders the map', async () => {
    mockedList.mockResolvedValue({
      providers: [
        {
          id: 'prov-1',
          userId: 'prov-1',
          email: 'doc@example.com',
          providerProfile: {
            firstName: 'Emeka',
            lastName: 'E2E',
            specialty: 'Cardiology',
            practiceLatitude: 6.45,
            practiceLongitude: 3.4,
          },
          distanceKm: 12.3,
        },
      ],
    });
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('booking.use-location'));
    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 6.5244, longitude: 3.3792, radiusKm: 25 })
      )
    );
    expect(await screen.findByTestId('booking.nearby-map')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('booking.map-toggle'));
    expect(await screen.findByText('12.3 km away')).toBeTruthy();
  });

  it('routes from a map pin selection back into booking', async () => {
    mockedList.mockResolvedValue({
      providers: [
        {
          id: 'prov-1',
          userId: 'prov-1',
          providerProfile: {
            firstName: 'Emeka',
            lastName: 'E2E',
            specialty: 'Cardiology',
            practiceLatitude: 6.45,
            practiceLongitude: 3.4,
          },
        },
      ],
    });
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('booking.use-location'));
    const webView = await screen.findByTestId('booking.nearby-map');
    fireEvent(webView, 'onMessage', {
      nativeEvent: { data: JSON.stringify({ type: 'select', id: 'prov-1' }) },
    });
    expect(mockRouterPush).toHaveBeenCalledWith('./prov-1');
  });

  it('re-queries with the selected search radius', async () => {
    mockedList.mockResolvedValue({ providers: [] });
    await render(<DiscoverScreen />);
    await fireEvent.press(screen.getByTestId('booking.use-location'));
    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ radiusKm: 25 }))
    );
    await fireEvent.press(screen.getByTestId('booking.radius-50'));
    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(expect.objectContaining({ radiusKm: 50 }))
    );
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

  it('offers a 7-day picker and reloads slots for the chosen day', async () => {
    mockedSlots.mockResolvedValue({ slots: [] });
    await render(<ProviderDetailScreen />);
    expect(await screen.findByTestId('booking.day-strip')).toBeTruthy();
    expect(screen.getByTestId('booking.day-0')).toBeTruthy();
    expect(screen.getByTestId('booking.day-6')).toBeTruthy();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const key = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(
      tomorrow.getDate()
    ).padStart(2, '0')}`;
    await fireEvent.press(screen.getByTestId('booking.day-1'));
    await waitFor(() => expect(mockedSlots).toHaveBeenCalledWith('prov-1', key));
  });

  it('lets the patient book an in-person visit', async () => {
    mockedSlots.mockResolvedValue({ slots: ['2026-09-10T09:00:00Z'] });
    mockedCreate.mockResolvedValue({ id: 'appt-1', status: 'PENDING' });
    await render(<ProviderDetailScreen />);
    expect(await screen.findByTestId('booking.slots')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('booking.slot-0'));
    await fireEvent.press(screen.getByTestId('booking.type-inperson'));
    await fireEvent.press(screen.getByTestId('booking.confirm'));
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'prov-1', type: 'IN_PERSON' }),
        expect.objectContaining({ idempotencyKey: expect.any(String) })
      )
    );
    expect(await screen.findByTestId('booking.confirmed')).toBeTruthy();
  });

  it('reschedules an existing visit through the same slot grid', async () => {
    mockedParams.mockReturnValue({ providerId: 'prov-1', rescheduleId: 'appt-9' });
    mockedSlots.mockResolvedValue({ slots: ['2026-09-10T09:00:00Z', '2026-09-10T09:30:00Z'] });
    (bookingService.rescheduleAppointment as jest.Mock).mockResolvedValue({
      id: 'appt-9',
      scheduledAt: '2026-09-10T09:30:00Z',
    });
    await render(<ProviderDetailScreen />);
    expect(await screen.findByTestId('booking.slots')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('booking.slot-1'));
    await fireEvent.press(screen.getByTestId('booking.confirm'));
    await waitFor(() =>
      expect(bookingService.rescheduleAppointment).toHaveBeenCalledWith(
        'appt-9',
        '2026-09-10T09:30:00Z'
      )
    );
    expect(mockedCreate).not.toHaveBeenCalled();
    expect(await screen.findByTestId('booking.rescheduled')).toBeTruthy();
  });
});
