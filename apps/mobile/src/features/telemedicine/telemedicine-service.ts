import { GATEWAY_PATHS } from '@ricton/api-contract';

import { apiClient, ApiClient } from '@/lib/api/client';

function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

/** Mirrors the backend defaults: 15 min early through 30 min after scheduled end. */
export function canJoinNow(
  scheduledAt: string,
  durationMinutes: number,
  nowMs = Date.now()
): boolean {
  const start = new Date(scheduledAt).getTime();
  if (!Number.isFinite(start)) return false;
  const end = start + Math.max(0, durationMinutes) * 60_000;
  return nowMs >= start - 15 * 60_000 && nowMs <= end + 30 * 60_000;
}

export type CameraPermission = 'granted' | 'denied' | 'undetermined';
export type MicPermission = 'granted' | 'denied' | 'undetermined';

export function lobbyBlockedReason(camera: CameraPermission, mic: MicPermission): string | null {
  if (camera === 'denied' && mic === 'denied')
    return 'Camera and microphone are blocked. Enable them in system settings to join.';
  if (camera === 'denied')
    return 'Camera is blocked. Enable it in system settings or continue audio-only if your clinician allows.';
  if (mic === 'denied') return 'Microphone is blocked. Enable it in system settings to be heard.';
  return null;
}

export class TelemedicineService {
  constructor(private readonly api: ApiClient = apiClient) {}

  lobbyToken(roomId: string): Promise<unknown> {
    return this.api.post(`${rel(GATEWAY_PATHS.teleRooms)}/${roomId}/token`, {});
  }

  join(roomId: string): Promise<unknown> {
    return this.api.post(`${rel(GATEWAY_PATHS.teleRooms)}/${roomId}/join`, {});
  }

  leave(roomId: string): Promise<unknown> {
    return this.api.post(`${rel(GATEWAY_PATHS.teleRooms)}/${roomId}/leave`, {});
  }
}

export const telemedicineService = new TelemedicineService();
