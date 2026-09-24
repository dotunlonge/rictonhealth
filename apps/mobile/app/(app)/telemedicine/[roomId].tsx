import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import {
  canJoinNow,
  JOIN_WINDOW_DEFAULTS,
  lobbyBlockedReason,
  telemedicineService,
} from '@/features/telemedicine/telemedicine-service';
import { useCallPermissions } from '@/features/telemedicine/use-permissions';
import {
  hasNativeVideoView,
  parseCredentials,
  TOKEN_REFRESH_MS,
  videoClient,
  type VideoSnapshot,
} from '@/features/telemedicine/video-client';
import { spacing, typography } from '@/theme/tokens';

type Phase = 'lobby' | 'active' | 'summary';

export default function TelemedicineLobbyScreen() {
  const { roomId, scheduledAt, durationMinutes } = useLocalSearchParams<{
    roomId: string;
    scheduledAt?: string;
    durationMinutes?: string;
  }>();
  const permissions = useCallPermissions();
  const [phase, setPhase] = useState<Phase>('lobby');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<VideoSnapshot>(() => videoClient.getSnapshot());

  useEffect(() => videoClient.subscribe(setVideo), []);

  // Session tokens live 1h (backend TTL). Refresh at 50 minutes so long
  // consults never drop; cleared on leave/unmount/remote-end.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRefreshTimer = () => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  };
  useEffect(() => clearRefreshTimer, []);

  const inWindow = scheduledAt ? canJoinNow(scheduledAt, Number(durationMinutes ?? 30)) : true;
  const blocked = lobbyBlockedReason(permissions.camera, permissions.mic);
  const nativeVideo = hasNativeVideoView();

  // Host end-for-all (or token expiry) closes the RTC session remotely: the
  // adapter surfaces it as `ended`, and the visit moves to its summary.
  useEffect(() => {
    if (phase === 'active' && video.state === 'ended') {
      clearRefreshTimer();
      setPhase('summary');
    }
  }, [phase, video.state]);

  // Microphone is required; the camera is optional (audio-only visit).
  // Never throws: falls back to last-known states when request() is stubbed.
  const ensurePermissions = async (): Promise<{ mic: boolean; camera: boolean }> => {
    if (permissions.camera === 'granted' && permissions.mic === 'granted') {
      return { mic: true, camera: true };
    }
    if (permissions.mic === 'denied') return { mic: false, camera: false };
    setRequesting(true);
    try {
      // Tolerates throwing or non-promise request() stubs: fall back to the
      // last-known states, so a mic-granted user is never blocked by glue.
      const next = await Promise.resolve()
        .then(() => permissions.request())
        .catch(() => null);
      const mic = (next?.mic ?? permissions.mic) === 'granted';
      const camera = (next?.camera ?? permissions.camera) === 'granted';
      return { mic, camera };
    } finally {
      setRequesting(false);
    }
  };

  const join = async () => {
    setJoining(true);
    setError(null);
    try {
      const media = await ensurePermissions();
      if (!media.mic) {
        setError('Microphone is blocked. Enable it in system settings to be heard.');
        return;
      }
      const credentials = parseCredentials(await telemedicineService.lobbyToken(String(roomId)));
      if (!credentials) {
        setError('Video session is unavailable. Contact support if this persists.');
        return;
      }
      await videoClient.connect(credentials, 2, { video: media.camera });
      try {
        await telemedicineService.join(String(roomId));
      } catch (joinError) {
        // The RTC session is up but the server refused the join (ended
        // room, lost membership, outside window). Showing "connected" here
        // would lie: disconnect and stay in the lobby with a retry.
        try {
          await videoClient.disconnect();
        } catch {
          // Best effort: the error below is what matters.
        }
        setError(joinError instanceof Error ? joinError.message : 'Could not join the visit.');
        return;
      }
      setPhase('active');
      clearRefreshTimer();
      refreshTimer.current = setTimeout(() => void refreshSession(), TOKEN_REFRESH_MS);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join the visit.');
    } finally {
      setJoining(false);
    }
  };

  const refreshSession = async () => {
    try {
      const credentials = parseCredentials(await telemedicineService.lobbyToken(String(roomId)));
      if (!credentials) return;
      await videoClient.refresh(credentials);
    } catch (caught) {
      // The live room is already torn down by refresh(): land on the summary
      // where Rejoin mints another fresh token instead of a dead room.
      clearRefreshTimer();
      setError(
        caught instanceof Error ? caught.message : 'Session refresh failed. Rejoin to continue.'
      );
      setPhase('summary');
    }
  };

  const toggleMic = async () => {
    setToggling(true);
    try {
      await videoClient.toggleMic();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not toggle microphone.');
    } finally {
      setToggling(false);
    }
  };

  const toggleCamera = async () => {
    setToggling(true);
    try {
      await videoClient.toggleCamera();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not toggle camera.');
    } finally {
      setToggling(false);
    }
  };

  const leave = async () => {
    setLeaving(true);
    setError(null);
    clearRefreshTimer();
    try {
      await videoClient.disconnect();
      await telemedicineService.leave(String(roomId));
      setPhase('summary');
    } catch (caught) {
      // The server still has us in the room: stay active with the error so
      // the user can retry instead of seeing a false "visit ended" summary.
      setError(caught instanceof Error ? caught.message : 'Could not leave the visit.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Screen testID="tele.lobby.screen" style={styles.content}>
      <PatientHeader
        eyebrow="VIDEO VISIT"
        title="Your consultation"
        subtitle="Camera and microphone stay on this device."
      />
      {phase === 'lobby' ? (
        <View testID="tele.lobby" style={styles.stack}>
          {blocked ? (
            <View testID="tele.blocked">
              <StateNotice title="Permission needed" message={blocked} />
            </View>
          ) : null}
          {!inWindow ? (
            <StateNotice
              title="Not time yet"
              message={`Join opens ${JOIN_WINDOW_DEFAULTS.earlyMinutes} minutes before your visit.`}
            />
          ) : null}
          {error ? (
            <View>
              <Text style={styles.error}>{error}</Text>
              <PrimaryButton
                accessibilityLabel="Retry joining"
                label="Retry joining"
                onPress={() => void join()}
                testID="tele.retry"
              />
            </View>
          ) : null}
          <PrimaryButton
            accessibilityLabel="Join video visit"
            disabled={!inWindow}
            label={requesting ? 'Requesting permissions…' : 'Join video visit'}
            loading={joining}
            onPress={() => void join()}
            testID="tele.join"
          />
        </View>
      ) : null}
      {phase === 'active' ? (
        <View testID="tele.active" style={styles.stack}>
          {video.state === 'reconnecting' ? (
            <View testID="tele.reconnecting">
              <StateNotice
                title="Reconnecting…"
                message="LiveKit is recovering media automatically. Stay on this screen."
              />
            </View>
          ) : (
            <StateNotice
              title="You are connected"
              message="Your clinician will join shortly. Stay on this screen."
            />
          )}
          <Text testID="tele.participants">
            {video.remoteParticipants === 0
              ? 'Waiting for your clinician…'
              : `${video.remoteParticipants} participant${video.remoteParticipants === 1 ? '' : 's'} with you`}
          </Text>
          {!nativeVideo ? (
            <View testID="tele.audio-only">
              <StateNotice
                title="Audio + controls live"
                message="Remote video preview needs the native video build. Your mic, camera, and leave controls below are fully live."
              />
            </View>
          ) : null}
          {!video.cameraEnabled ? (
            <View testID="tele.audio-only-mode">
              <StateNotice
                title="Audio-only"
                message="Your camera is off or blocked. Your clinician can still hear you."
              />
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.controls}>
            <PrimaryButton
              accessibilityLabel={video.micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              disabled={toggling}
              label={video.micEnabled ? 'Mute' : 'Unmute'}
              onPress={() => void toggleMic()}
              testID="tele.mic.toggle"
            />
            <PrimaryButton
              accessibilityLabel={video.cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              disabled={toggling}
              label={video.cameraEnabled ? 'Camera off' : 'Camera on'}
              onPress={() => void toggleCamera()}
              testID="tele.camera.toggle"
            />
          </View>
          <PrimaryButton
            accessibilityLabel="Leave visit"
            label="Leave visit"
            loading={leaving}
            onPress={() => void leave()}
            testID="tele.leave"
          />
        </View>
      ) : null}
      {phase === 'summary' ? (
        <View testID="tele.summary" style={styles.stack}>
          <StateNotice
            title="Visit ended"
            message="A summary will appear here when your clinician submits visit notes."
          />
          <PrimaryButton
            accessibilityLabel="Rejoin visit"
            label="Rejoin visit"
            onPress={() => {
              setError(null);
              setPhase('lobby');
            }}
            testID="tele.rejoin"
          />
        </View>
      ) : null}
      {joining && phase === 'lobby' ? <ActivityIndicator testID="tele.joining" /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  stack: { gap: spacing[4] },
  controls: { flexDirection: 'row', gap: spacing[3] },
  error: { ...typography.caption, color: '#BE123C' },
});
