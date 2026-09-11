import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useCallback } from 'react';

import type { CameraPermission, MicPermission } from './telemedicine-service';

export interface CallPermissions {
  camera: CameraPermission;
  mic: MicPermission;
  /** Request OS permissions via expo-camera; resolves to the new states. */
  request(): Promise<{ camera: CameraPermission; mic: MicPermission }>;
}

function toState(response: { granted: boolean; canAskAgain: boolean } | null): CameraPermission {
  if (!response) return 'undetermined';
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * OS camera/microphone permissions (expo-camera, dev builds).
 * Undetermined until requested; denied (cannot-ask-again) drives the
 * settings-redirect messaging in the lobby.
 */
export function useCallPermissions(): CallPermissions {
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();

  const request = useCallback(async () => {
    const [cam, audio] = await Promise.all([requestCam(), requestMic()]);
    return { camera: toState(cam), mic: toState(audio) };
  }, [requestCam, requestMic]);

  return { camera: toState(camPerm), mic: toState(micPerm), request };
}
