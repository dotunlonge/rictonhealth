/** B6 TDD RED: inbox/thread/compose + notifications list/preferences. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ conversationId: 'conv-1' }),
}));

jest.mock('@/features/messaging/messaging-service', () => ({
  messagingService: {
    conversations: jest.fn(),
    thread: jest.fn(),
    sendMessage: jest.fn(),
    markRead: jest.fn(),
  },
}));

jest.mock('@/features/notifications/notification-service', () => ({
  notificationService: {
    list: jest.fn(),
    markAllRead: jest.fn(),
    updatePreferences: jest.fn(),
    preferences: jest.fn(),
  },
}));

import { messagingService } from '@/features/messaging/messaging-service';
import { notificationService } from '@/features/notifications/notification-service';
import InboxScreen from '../app/(app)/messages/index';
import ThreadScreen from '../app/(app)/messages/[conversationId]';
import NotificationsScreen from '../app/(app)/notifications/index';

const msg = messagingService as unknown as Record<string, jest.Mock>;
const notif = notificationService as unknown as Record<string, jest.Mock>;

const CONV = {
  id: 'conv-1',
  title: 'Dr. Emeka',
  participants: [
    {
      user: { email: 'doc@example.com', providerProfile: { firstName: 'Emeka', lastName: 'E2E' } },
    },
  ],
  messages: [
    {
      id: 'm-0',
      body: 'Hello, how can I help?',
      senderId: 'doc-1',
      createdAt: '2026-09-01T10:00:00Z',
    },
  ],
  unreadCount: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('inbox', () => {
  it('lists conversations with unread state', async () => {
    msg.conversations.mockResolvedValue({ conversations: [CONV], meta: { total: 1 } });
    await render(<InboxScreen />);
    expect(await screen.findByText(/Emeka/)).toBeTruthy();
    expect(await screen.findByTestId('messages.unread-conv-1')).toBeTruthy();
  });

  it('shows an empty inbox', async () => {
    msg.conversations.mockResolvedValue({ conversations: [], meta: { total: 0 } });
    await render(<InboxScreen />);
    expect(await screen.findByTestId('messages.empty')).toBeTruthy();
  });
});

describe('thread', () => {
  it('sends with idempotency and retries after failure', async () => {
    msg.thread.mockResolvedValue({ messages: [{ id: 'm-0', body: 'Hello', senderId: 'doc-1' }] });
    msg.sendMessage
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({ id: 'm-1' });
    await render(<ThreadScreen />);
    expect(await screen.findByText('Hello')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('messages.composer'), 'Thank you');
    await fireEvent.press(screen.getByTestId('messages.send'));
    expect(await screen.findByTestId('messages.send-error')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('messages.retry'));
    await waitFor(() =>
      expect(msg.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-1', body: 'Thank you' }),
        expect.objectContaining({ idempotencyKey: expect.any(String) })
      )
    );
  });

  it('marks the thread read on open', async () => {
    msg.thread.mockResolvedValue({ messages: [] });
    msg.markRead.mockResolvedValue({ ok: true });
    await render(<ThreadScreen />);
    await waitFor(() => expect(msg.markRead).toHaveBeenCalledWith({ conversationId: 'conv-1' }));
  });
});

describe('notifications', () => {
  it('lists, marks all read, and toggles push preference', async () => {
    notif.list.mockResolvedValue({
      notifications: [
        { id: 'n-1', title: 'Appointment reminder', body: 'Tomorrow 9am', isRead: false },
      ],
      total: 1,
    });
    notif.preferences.mockResolvedValue({
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
    });
    notif.markAllRead.mockResolvedValue({ ok: true });
    notif.updatePreferences.mockResolvedValue({ ok: true });
    await render(<NotificationsScreen />);
    expect(await screen.findByText(/Appointment reminder/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('notifications.read-all'));
    await waitFor(() => expect(notif.markAllRead).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId('notifications.push-toggle'));
    await waitFor(() =>
      expect(notif.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ pushEnabled: false })
      )
    );
  });
});
