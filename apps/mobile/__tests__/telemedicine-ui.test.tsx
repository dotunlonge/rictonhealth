/** B2 TDD RED: telemedicine lobby/join/leave/summary (component, mocked service). */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({
    roomId: 'room-1',
    scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    durationMinutes: '30',
  }),
}));

jest.mock('@/features/telemedicine/telemedicine-service', () => {
  const actual = jest.requireActual('@/features/telemedicine/telemedicine-service');
  return {
    ...actual,
    telemedicineService: { lobbyToken: jest.fn(), leave: jest.fn() },
  };
});

jest.mock('@/features/telemedicine/use-permissions', () => ({
  useCallPermissions: jest.fn(),
}));

jest.mock('@/features/telemedicine/video-client', () => ({
  parseCredentials: jest.requireActual('@/features/telemedicine/video-client').parseCredentials,
  hasNativeVideoView: jest.fn(() => false),
  videoClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    toggleMic: jest.fn(),
    toggleCamera: jest.fn(),
    getSnapshot: jest.fn(() => ({
      state: 'connected',
      remoteParticipants: 0,
      micEnabled: true,
      cameraEnabled: true,
    })),
    subscribe: jest.fn(() => () => undefined),
  },
}));

import { telemedicineService } from '@/features/telemedicine/telemedicine-service';
import { useCallPermissions } from '@/features/telemedicine/use-permissions';
import { videoClient } from '@/features/telemedicine/video-client';
import LobbyScreen from '../app/(app)/telemedicine/[roomId]';

const mockedPerms = useCallPermissions as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedPerms.mockReturnValue({ camera: 'granted', mic: 'granted', request: jest.fn() });
});

describe('telemedicine lobby', () => {
  it('joins when inside the window and permissions are granted', async () => {
    (telemedicineService.lobbyToken as jest.Mock).mockResolvedValue({
      token: 'tok',
      serverUrl: 'https://livekit.example',
    });
    await render(<LobbyScreen />);
    expect(await screen.findByTestId('tele.lobby')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tele.join'));
    await waitFor(() => expect(telemedicineService.lobbyToken).toHaveBeenCalledWith('room-1'));
    expect(await screen.findByTestId('tele.active')).toBeTruthy();
  });

  it('explains blocked camera instead of joining', async () => {
    mockedPerms.mockReturnValue({ camera: 'denied', mic: 'granted', request: jest.fn() });
    await render(<LobbyScreen />);
    expect(await screen.findByTestId('tele.blocked')).toBeTruthy();
  });

  it('leaves and shows a visit summary', async () => {
    (telemedicineService.lobbyToken as jest.Mock).mockResolvedValue({
      token: 'tok',
      serverUrl: 'https://livekit.example',
    });
    (telemedicineService.leave as jest.Mock).mockResolvedValue({ ok: true });
    await render(<LobbyScreen />);
    await fireEvent.press(screen.getByTestId('tele.join'));
    expect(await screen.findByTestId('tele.active')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tele.leave'));
    await waitFor(() => expect(telemedicineService.leave).toHaveBeenCalledWith('room-1'));
    expect(await screen.findByTestId('tele.summary')).toBeTruthy();
  });

  it('shows participant status and mic/camera toggles when active', async () => {
    (telemedicineService.lobbyToken as jest.Mock).mockResolvedValue({
      token: 'tok',
      serverUrl: 'https://livekit.example',
    });
    await render(<LobbyScreen />);
    await fireEvent.press(screen.getByTestId('tele.join'));
    expect(await screen.findByTestId('tele.participants')).toBeTruthy();
    expect(await screen.findByTestId('tele.audio-only')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('tele.mic.toggle'));
    await waitFor(() => expect(videoClient.toggleMic).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId('tele.camera.toggle'));
    await waitFor(() => expect(videoClient.toggleCamera).toHaveBeenCalled());
  });

  it('offers retry when join fails', async () => {
    (telemedicineService.lobbyToken as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await render(<LobbyScreen />);
    await fireEvent.press(screen.getByTestId('tele.join'));
    expect(await screen.findByTestId('tele.retry')).toBeTruthy();
  });
});
