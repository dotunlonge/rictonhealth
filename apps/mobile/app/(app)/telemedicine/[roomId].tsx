import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import {
  canJoinNow,
  lobbyBlockedReason,
  telemedicineService,
} from '@/features/telemedicine/telemedicine-service';
import { useCallPermissions } from '@/features/telemedicine/use-permissions';
import { parseCredentials, videoClient } from '@/features/telemedicine/video-client';
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
  const [error, setError] = useState<string | null>(null);

  const inWindow = scheduledAt ? canJoinNow(scheduledAt, Number(durationMinutes ?? 30)) : true;
  const blocked = lobbyBlockedReason(permissions.camera, permissions.mic);

  const ensurePermissions = async (): Promise<boolean> => {
    if (permissions.camera === 'granted' && permissions.mic === 'granted') return true;
    setRequesting(true);
    try {
      const next = await permissions.request();
      return next.camera === 'granted' && next.mic === 'granted';
    } finally {
      setRequesting(false);
    }
  };

  const join = async () => {
    setJoining(true);
    setError(null);
    try {
      if (!(await ensurePermissions())) return;
      const credentials = parseCredentials(await telemedicineService.lobbyToken(String(roomId)));
      if (!credentials) {
        setError('Video session is unavailable. Contact support if this persists.');
        return;
      }
      await videoClient.connect(credentials);
      try {
        await telemedicineService.join(String(roomId));
      } catch {
        // Non-blocking for client RTC session: server participant status sync
      }
      setPhase('active');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join the visit.');
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      await videoClient.disconnect();
      await telemedicineService.leave(String(roomId));
    } finally {
      setLeaving(false);
      setPhase('summary');
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
            <StateNotice title="Not time yet" message="Join opens 10 minutes before your visit." />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
          <StateNotice
            title="You are connected"
            message="Your clinician will join shortly. Stay on this screen."
          />
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
        <View testID="tele.summary">
          <StateNotice
            title="Visit ended"
            message="A summary will appear here when your clinician submits visit notes."
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
  error: { ...typography.caption, color: '#BE123C' },
});
