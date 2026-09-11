/** B2: LiveKit adapter unit tests (mocked livekit-client Room). */
import { parseCredentials, VideoClient } from '@/features/telemedicine/video-client';
import { Room } from 'livekit-client';

jest.mock('livekit-client', () => ({
  Room: jest.fn(),
}));

const MockedRoom = Room as unknown as jest.Mock;

function roomDouble() {
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
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
    await client.disconnect();
    expect(room.disconnect).toHaveBeenCalled();
  });
});
