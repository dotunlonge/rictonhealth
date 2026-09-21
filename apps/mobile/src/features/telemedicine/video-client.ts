import { Room, RoomEvent, type Room as LiveKitRoom } from 'livekit-client';

export interface RoomCredentials {
  token: string;
  serverUrl: string;
}

export type VideoConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting';

export interface VideoSnapshot {
  state: VideoConnectionState;
  remoteParticipants: number;
  micEnabled: boolean;
  cameraEnabled: boolean;
}

type Listener = (snapshot: VideoSnapshot) => void;

export function parseCredentials(input: unknown): RoomCredentials | null {
  if (typeof input !== 'object' || input === null) return null;
  const { token, serverUrl } = input as Record<string, unknown>;
  if (typeof token !== 'string' || token.length === 0) return null;
  if (typeof serverUrl !== 'string' || serverUrl.length === 0) return null;
  return { token, serverUrl };
}

/** True when the optional native renderer is linked (dev/prod device builds). */
export function hasNativeVideoView(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@livekit/react-native');
    return true;
  } catch {
    return false;
  }
}

/**
 * Thin LiveKit adapter (same rooms/tokens as web + backend).
 * UI owns lifecycle: connect → publish → disconnect. Never invents identity:
 * credentials come only from POST /telemedicine/rooms/:id/token.
 *
 * Surfaces reconnect + participant + mute state so the lobby never stares at
 * a frozen frame. Remote video rendering itself needs the optional
 * `@livekit/react-native` VideoView in device builds; without it the lobby
 * stays audio + controls live and says so truthfully (see hasNativeVideoView).
 */
export class VideoClient {
  private room: LiveKitRoom | null = null;
  private listeners = new Set<Listener>();
  private snapshot: VideoSnapshot = {
    state: 'idle',
    remoteParticipants: 0,
    micEnabled: true,
    cameraEnabled: true,
  };
  private boundHandlers: Array<{ event: string; handler: (...args: never[]) => void }> = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): VideoSnapshot {
    return this.snapshot;
  }

  private emit(patch: Partial<VideoSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener(this.snapshot);
  }

  private onRoom(event: string, handler: (...args: never[]) => void): void {
    const room = this.room as unknown as {
      on?: (event: string, handler: (...args: never[]) => void) => void;
    } | null;
    room?.on?.(event, handler);
    this.boundHandlers.push({ event, handler });
  }

  private offRoom(): void {
    const room = this.room as unknown as {
      off?: (event: string, handler: (...args: never[]) => void) => void;
    } | null;
    for (const { event, handler } of this.boundHandlers) room?.off?.(event, handler);
    this.boundHandlers = [];
  }

  private syncParticipants(): void {
    const remotes = (this.room as unknown as { remoteParticipants?: Map<string, unknown> })
      ?.remoteParticipants;
    this.emit({ remoteParticipants: remotes instanceof Map ? remotes.size : 0 });
  }

  async connect(credentials: RoomCredentials, attempts = 2): Promise<LiveKitRoom> {
    this.emit({ state: 'connecting' });
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
      const room = new Room();
      try {
        await room.connect(credentials.serverUrl, credentials.token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
        this.room = room;
        this.emit({ state: 'connected', micEnabled: true, cameraEnabled: true });
        this.syncParticipants();
        this.onRoom(RoomEvent.Reconnecting, () => this.emit({ state: 'reconnecting' }));
        this.onRoom(RoomEvent.Reconnected, () => {
          this.emit({ state: 'connected' });
          this.syncParticipants();
        });
        this.onRoom(RoomEvent.ParticipantConnected, () => this.syncParticipants());
        this.onRoom(RoomEvent.ParticipantDisconnected, () => this.syncParticipants());
        return room;
      } catch (caught) {
        lastError = caught;
        await room.disconnect().catch(() => undefined);
        if (attempt < attempts) await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    this.emit({ state: 'idle' });
    throw lastError instanceof Error ? lastError : new Error('Could not join the visit.');
  }

  async toggleMic(): Promise<boolean> {
    const next = !this.snapshot.micEnabled;
    await this.room?.localParticipant.setMicrophoneEnabled(next);
    this.emit({ micEnabled: next });
    return next;
  }

  async toggleCamera(): Promise<boolean> {
    const next = !this.snapshot.cameraEnabled;
    await this.room?.localParticipant.setCameraEnabled(next);
    this.emit({ cameraEnabled: next });
    return next;
  }

  async disconnect(): Promise<void> {
    this.offRoom();
    await this.room?.disconnect();
    this.room = null;
    this.emit({ state: 'idle', remoteParticipants: 0 });
  }
}

export const videoClient = new VideoClient();
