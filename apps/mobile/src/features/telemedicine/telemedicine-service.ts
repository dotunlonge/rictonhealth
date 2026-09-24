import { teleRoomJoinPath, teleRoomLeavePath, teleRoomTokenPath } from '@ricton/api-contract';

import { apiClient, ApiClient } from '@/lib/api/client';

function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

/**
 * Join-window defaults mirror the backend
 * (TELEMEDICINE_JOIN_EARLY/LATE_MINUTES, 15/30). The server is authoritative
 * (403 outside the window); these only drive the lobby pre-gate copy.
 */
export const JOIN_WINDOW_DEFAULTS = { earlyMinutes: 15, lateMinutes: 30 } as const;

/** Mirrors the backend window: early minutes before start through late minutes after scheduled end. */
export function canJoinNow(
  scheduledAt: string,
  durationMinutes: number,
  nowMs = Date.now(),
  window: { earlyMinutes?: number; lateMinutes?: number } = {}
): boolean {
  const start = new Date(scheduledAt).getTime();
  if (!Number.isFinite(start)) return false;
  const early = window.earlyMinutes ?? JOIN_WINDOW_DEFAULTS.earlyMinutes;
  const late = window.lateMinutes ?? JOIN_WINDOW_DEFAULTS.lateMinutes;
  const end = start + Math.max(0, durationMinutes) * 60_000;
  return nowMs >= start - early * 60_000 && nowMs <= end + late * 60_000;
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
    return this.api.post(rel(teleRoomTokenPath(roomId)), {});
  }

  join(roomId: string): Promise<unknown> {
    return this.api.post(rel(teleRoomJoinPath(roomId)), {});
  }

  leave(roomId: string): Promise<unknown> {
    return this.api.post(rel(teleRoomLeavePath(roomId)), {});
  }
}

export const telemedicineService = new TelemedicineService();
