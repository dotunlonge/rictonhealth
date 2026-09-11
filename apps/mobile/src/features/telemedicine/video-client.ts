import { Room, type Room as LiveKitRoom } from 'livekit-client';

export interface RoomCredentials {
  token: string;
  serverUrl: string;
}

export function parseCredentials(input: unknown): RoomCredentials | null {
  if (typeof input !== 'object' || input === null) return null;
  const { token, serverUrl } = input as Record<string, unknown>;
  if (typeof token !== 'string' || token.length === 0) return null;
  if (typeof serverUrl !== 'string' || serverUrl.length === 0) return null;
  return { token, serverUrl };
}

/**
 * Thin LiveKit adapter (same rooms/tokens as web + backend).
 * UI owns lifecycle: connect → publish → disconnect. Never invents identity:
 * credentials come only from POST /telemedicine/rooms/:id/token.
 */
export class VideoClient {
  private room: LiveKitRoom | null = null;

  async connect(credentials: RoomCredentials): Promise<LiveKitRoom> {
    const room = new Room();
    await room.connect(credentials.serverUrl, credentials.token, { autoSubscribe: true });
    await room.localParticipant.setMicrophoneEnabled(true);
    await room.localParticipant.setCameraEnabled(true);
    this.room = room;
    return room;
  }

  async disconnect(): Promise<void> {
    await this.room?.disconnect();
    this.room = null;
  }
}

export const videoClient = new VideoClient();
