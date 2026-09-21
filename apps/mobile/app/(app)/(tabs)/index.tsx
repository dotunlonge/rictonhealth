import { Link } from 'expo-router';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  WalletCards,
} from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import type { AppointmentListResponse } from '@/features/appointments/types';
import { useSession } from '@/features/auth/session-provider';
import { apiClient } from '@/lib/api/client';
import { GATEWAY_PATHS } from '@ricton/api-contract';
import { useRemoteResource } from '@/lib/use-remote-resource';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface HomeData {
  appointments?: AppointmentListResponse;
  wallet?: { balance: number; currency: string };
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export default function PatientHomeScreen() {
  const { user } = useSession();
  const load = useCallback(async () => {
    const [apptRes, walletRes] = await Promise.allSettled([
      apiClient.get<AppointmentListResponse>(
        `${GATEWAY_PATHS.appointments.replace(/^\/api/, '')}?limit=3&offset=0`
      ),
      apiClient.get<{ balance: number; currency: string }>(
        GATEWAY_PATHS.walletMe.replace(/^\/api/, '')
      ),
    ]);

    const appointments =
      apptRes.status === 'fulfilled'
        ? apptRes.value
        : { appointments: [], meta: { total: 0, limit: 3, offset: 0, hasMore: false } };
    const wallet =
      walletRes.status === 'fulfilled' ? walletRes.value : { balance: 0, currency: 'NGN' };

    // If both fail, throw so the user gets an explicit retry notice
    if (apptRes.status === 'rejected' && walletRes.status === 'rejected') {
      throw new Error('Care summary could not be loaded. Please try again.');
    }

    return { appointments, wallet };
  }, []);
  const resource = useRemoteResource(load);
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there';
  const nextAppointment = resource.data?.appointments?.appointments?.find(
    (appointment) => new Date(appointment.scheduledAt).getTime() >= Date.now()
  );

  return (
    <Screen testID="patient.home.screen" style={styles.content}>
      <PatientHeader
        eyebrow="YOUR CARE"
        title={`Good day, ${firstName}`}
        subtitle="Here is what needs your attention."
      />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <ShieldCheck color={colors.white} size={23} />
        </View>
        <Text style={styles.heroEyebrow}>CARE, WITHOUT THE CLUTTER</Text>
        <Text style={styles.heroTitle}>Your next health step, clearly in view.</Text>
        <Text style={styles.heroBody}>
          Review appointments and prescriptions from one secure patient workspace.
        </Text>
        <Link href="/(app)/(tabs)/appointments" asChild>
          <Pressable accessibilityRole="button" style={styles.heroAction}>
            <Text style={styles.heroActionText}>View appointments</Text>
            <ArrowRight color={colors.navy900} size={19} />
          </Pressable>
        </Link>
        <Link href="../booking" asChild>
          <Pressable
            accessibilityRole="button"
            style={styles.heroActionSecondary}
            testID="patient.home.findDoctor"
          >
            <Text style={styles.heroActionSecondaryText}>Find a doctor</Text>
            <ArrowRight color={colors.white} size={19} />
          </Pressable>
        </Link>
      </View>

      {resource.loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading your care summary…</Text>
        </View>
      ) : resource.error ? (
        <StateNotice
          title="Your summary is temporarily unavailable"
          message={resource.error}
          actionLabel="Try again"
          onAction={resource.reload}
        />
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>At a glance</Text>
            <Text style={styles.sectionCaption}>Live from your Ricton account</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.metricCard}>
              <View style={styles.metricIcon}>
                <CalendarDays color={colors.blue700} size={21} />
              </View>
              <Text style={styles.metricLabel}>Appointments</Text>
              <Text style={styles.metricValue}>{resource.data?.appointments.meta.total ?? 0}</Text>
            </View>
            <Link href="../wallet" asChild>
              <Pressable
                accessibilityRole="button"
                style={styles.metricCard}
                testID="patient.home.wallet"
              >
                <View style={styles.metricIcon}>
                  <WalletCards color={colors.blue700} size={21} />
                </View>
                <Text style={styles.metricLabel}>Wallet balance</Text>
                <Text style={styles.metricMoney}>
                  {money(
                    resource.data?.wallet.balance ?? 0,
                    resource.data?.wallet.currency ?? 'NGN'
                  )}
                </Text>
              </Pressable>
            </Link>
          </View>

          <Text style={styles.sectionTitle}>Next appointment</Text>
          {nextAppointment ? (
            <View style={styles.appointmentCard}>
              <CalendarDays color={colors.blue700} size={24} />
              <View style={styles.appointmentCopy}>
                <Text style={styles.appointmentDate}>
                  {new Intl.DateTimeFormat('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(nextAppointment.scheduledAt))}
                </Text>
                <Text style={styles.appointmentMeta}>
                  {nextAppointment.type.replaceAll('_', ' ')} · {nextAppointment.status}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <ClipboardList color={colors.slate400} size={24} />
              <Text style={styles.emptyTitle}>No upcoming appointment</Text>
              <Text style={styles.emptyText}>Any confirmed booking will appear here.</Text>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[6] },
  hero: {
    borderRadius: radii.xl,
    backgroundColor: colors.navy900,
    padding: spacing[6],
    gap: spacing[3],
    overflow: 'hidden',
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    ...typography.caption,
    color: colors.blue100,
    letterSpacing: 1.2,
    marginTop: spacing[2],
  },
  heroTitle: { ...typography.title, color: colors.white },
  heroBody: { ...typography.body, color: colors.slate300 },
  heroAction: {
    minHeight: 48,
    marginTop: spacing[2],
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroActionText: { ...typography.bodyStrong, color: colors.navy900 },
  heroActionSecondary: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing[4],
    backgroundColor: colors.blue600,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroActionSecondaryText: { ...typography.bodyStrong, color: colors.white },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  sectionHeader: { gap: 2 },
  sectionTitle: { ...typography.heading, color: colors.navy900 },
  sectionCaption: { ...typography.caption, color: colors.slate600 },
  grid: { flexDirection: 'row', gap: spacing[3] },
  metricCard: {
    ...cardShadow,
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[2],
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: { ...typography.caption, color: colors.slate600, marginTop: spacing[1] },
  metricValue: { ...typography.title, color: colors.navy950 },
  metricMoney: { ...typography.bodyStrong, color: colors.navy950 },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    borderWidth: 1,
    borderColor: colors.blue100,
    borderRadius: radii.lg,
    backgroundColor: colors.blue50,
    padding: spacing[5],
  },
  appointmentCopy: { flex: 1, gap: spacing[1] },
  appointmentDate: { ...typography.bodyStrong, color: colors.navy900 },
  appointmentMeta: { ...typography.caption, color: colors.slate600, textTransform: 'capitalize' },
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[6],
    gap: spacing[2],
  },
  emptyTitle: { ...typography.bodyStrong, color: colors.navy900 },
  emptyText: { ...typography.caption, color: colors.slate600 },
});
