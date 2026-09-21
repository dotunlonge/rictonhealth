/** B2: LiveKit adapter unit tests (mocked livekit-client Room). */
import { parseCredentials, VideoClient } from '@/features/telemedicine/video-client';
import { Room, RoomEvent } from 'livekit-client';

jest.mock('livekit-client', () => {
  const actual = jest.requireActual('livekit-client');
  return { ...actual, Room: jest.fn() };
});

const MockedRoom = Room as unknown as jest.Mock;

function roomDouble() {
  const handlers = new Map<string, Array<(...args: never[]) => void>>();
  return {
    handlers,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn((event: string, handler: (...args: never[]) => void) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    }),
    off: jest.fn(),
    remoteParticipants: new Map(),
    localParticipant: {
      setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
      setCameraEnabled: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('parseCredentials', () => {
  it('accepts backend-issued token + serverUrl', () => {
    expect(parseCredentials({ token: 't', serverUrl: 'https://livekit.example' })).toEqual({
      token: 't',
      serverUrl: 'https://livekit.example',
    });
  });
  it('rejects missing/empty fields (never invents identity)', () => {
    expect(parseCredentials(null)).toBeNull();
    expect(parseCredentials({ token: '', serverUrl: 'x' })).toBeNull();
    expect(parseCredentials({ token: 't' })).toBeNull();
  });
});

describe('VideoClient', () => {
  it('connects and publishes mic + camera', async () => {
    const room = roomDouble();
    MockedRoom.mockImplementation(() => room);
    const client = new VideoClient();
    await client.connect({ token: 't', serverUrl: 'https://livekit.example' });
    expect(room.connect).toHaveBeenCalledWith('https://livekit.example', 't', {
      autoSubscribe: true,
    });
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(true);
    expect(client.getSnapshot().state).toBe('connected');
    await client.disconnect();
    expect(room.disconnect).toHaveBeenCalled();
    expect(client.getSnapshot().state).toBe('idle');
  });

  it('retries a failed connect once before throwing', async () => {
    const failing = roomDouble();
    failing.connect.mockRejectedValueOnce(new Error('network down'));
    const good = roomDouble();
    MockedRoom.mockImplementationOnce(() => failing).mockImplementationOnce(() => good);
    const client = new VideoClient();
    await client.connect({ token: 't', serverUrl: 'https://livekit.example' }, 2);
    expect(good.connect).toHaveBeenCalled();
    expect(client.getSnapshot().state).toBe('connected');
  });

  it('surfaces reconnecting state and participant counts', async () => {
    const room = roomDouble();
    MockedRoom.mockImplementation(() => room);
    const client = new VideoClient();
    const seen: string[] = [];
    client.subscribe((snap) => seen.push(snap.state));
    await client.connect({ token: 't', serverUrl: 'https://livekit.example' });
    const reconnecting = room.handlers.get(RoomEvent.Reconnecting) ?? [];
    reconnecting.forEach((h) => h());
    expect(client.getSnapshot().state).toBe('reconnecting');
    const reconnected = room.handlers.get(RoomEvent.Reconnected) ?? [];
    reconnected.forEach((h) => h());
    expect(client.getSnapshot().state).toBe('connected');
    expect(seen).toContain('reconnecting');
  });

  it('toggles mic and camera server-side', async () => {
    const room = roomDouble();
    MockedRoom.mockImplementation(() => room);
    const client = new VideoClient();
    await client.connect({ token: 't', serverUrl: 'https://livekit.example' });
    await client.toggleMic();
    expect(room.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
    expect(client.getSnapshot().micEnabled).toBe(false);
    await client.toggleCamera();
    expect(room.localParticipant.setCameraEnabled).toHaveBeenCalledWith(false);
    expect(client.getSnapshot().cameraEnabled).toBe(false);
  });
});
