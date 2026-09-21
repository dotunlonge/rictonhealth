import { useRouter } from 'expo-router';
import { CalendarDays, Clock3, Stethoscope, Video } from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import type { Appointment, AppointmentListResponse } from '@/features/appointments/types';
import { apiClient } from '@/lib/api/client';
import { GATEWAY_PATHS } from '@ricton/api-contract';
import { useRemoteResource } from '@/lib/use-remote-resource';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

function providerName(appointment: Appointment): string {
  const profile = appointment.provider?.providerProfile;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  return fullName || appointment.provider?.email || 'Ricton clinician';
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const load = useCallback(
    () =>
      apiClient.get<AppointmentListResponse>(
        `${GATEWAY_PATHS.appointments.replace(/^\/api/, '')}?limit=50&offset=0`
      ),
    []
  );
  const resource = useRemoteResource(load);

  return (
    <Screen testID="patient.appointments.screen" style={styles.content}>
      <PatientHeader
        eyebrow="CARE SCHEDULE"
        title="Appointments"
        subtitle="Your upcoming and previous consultations."
      />
      {resource.loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading appointments…</Text>
        </View>
      ) : resource.error ? (
        <StateNotice
          title="Appointments could not be loaded"
          message={resource.error}
          actionLabel="Try again"
          onAction={resource.reload}
        />
      ) : resource.data?.appointments.length ? (
        <View style={styles.list}>
          {resource.data.appointments.map((appointment) => (
            <View key={appointment.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Stethoscope color={colors.blue700} size={22} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.provider}>{providerName(appointment)}</Text>
                  <Text style={styles.specialty}>
                    {appointment.provider?.providerProfile?.specialty ||
                      appointment.type.replaceAll('_', ' ')}
                  </Text>
                </View>
                <View style={styles.status}>
                  <Text style={styles.statusText}>{appointment.status.replaceAll('_', ' ')}</Text>
                </View>
              </View>
              <View style={styles.rule} />
              <View style={styles.detailRow}>
                <CalendarDays color={colors.slate600} size={17} />
                <Text style={styles.detailText}>
                  {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(
                    new Date(appointment.scheduledAt)
                  )}
                </Text>
                <Clock3 color={colors.slate600} size={17} />
                <Text style={styles.detailText}>
                  {new Intl.DateTimeFormat('en-NG', { timeStyle: 'short' }).format(
                    new Date(appointment.scheduledAt)
                  )}
                </Text>
              </View>
              {appointment.reason ? (
                <Text style={styles.reason} numberOfLines={2}>
                  {appointment.reason}
                </Text>
              ) : null}
              {appointment.type === 'VIDEO' && appointment.status !== 'CANCELLED' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Join video consultation"
                  testID="patient.appointments.joinVideo"
                  onPress={() => {
                    const roomId = appointment.telemedicineRoom?.id || appointment.id;
                    router.push({
                      pathname: '/telemedicine/[roomId]' as any,
                      params: {
                        roomId,
                        scheduledAt: appointment.scheduledAt,
                        durationMinutes: String(appointment.durationMinutes || 30),
                      },
                    });
                  }}
                  style={styles.joinButton}
                >
                  <Video color={colors.white} size={16} />
                  <Text style={styles.joinButtonText}>Join Video Visit</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <StateNotice
          title="No appointments yet"
          message="When you book a consultation, it will appear here with its live status."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[6] },
  loading: { paddingVertical: spacing[12], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  list: { gap: spacing[4] },
  card: {
    ...cardShadow,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[3],
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1, minWidth: 0 },
  provider: { ...typography.bodyStrong, color: colors.navy900 },
  specialty: { ...typography.caption, color: colors.slate600, textTransform: 'capitalize' },
  status: {
    borderRadius: radii.round,
    backgroundColor: colors.blue50,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  statusText: {
    ...typography.caption,
    color: colors.blue700,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  rule: { height: 1, backgroundColor: colors.slate100 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  detailText: { ...typography.caption, color: colors.slate700, marginRight: spacing[2] },
  reason: { ...typography.caption, color: colors.slate600 },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.blue600,
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  joinButtonText: {
    ...typography.bodyStrong,
    color: colors.white,
    fontSize: 13,
  },
});
