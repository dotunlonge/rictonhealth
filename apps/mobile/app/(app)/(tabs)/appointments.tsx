import { openURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { CalendarDays, Clock3, Stethoscope, Video } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import type { Appointment, AppointmentListResponse } from '@/features/appointments/types';
import { useSession } from '@/features/auth/session-provider';
import { bookingService } from '@/features/booking/booking-service';
import { apiClient } from '@/lib/api/client';
import { GATEWAY_PATHS } from '@ricton/api-contract';
import { useRemoteResource } from '@/lib/use-remote-resource';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

function providerName(appointment: Appointment): string {
  const profile = appointment.provider?.providerProfile;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  return fullName || appointment.provider?.email || 'Ricton clinician';
}

function consultationFee(appointment: Appointment): number {
  const raw = appointment.provider?.providerProfile?.consultationFee;
  const value = typeof raw === 'string' ? Number(raw) : (raw ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function isPaid(appointment: Appointment): boolean {
  return appointment.payment?.status === 'SUCCESS';
}

/** Where an in-person visit happens: hospital name + address, or a fallback. */
export function visitLocation(appointment: Appointment): string | null {
  if (appointment.type !== 'IN_PERSON') return null;
  const hospital = appointment.hospital;
  if (!hospital) return 'Confirm the venue with your clinic before your visit.';
  const parts = [
    hospital.name,
    hospital.address?.line1,
    hospital.address?.city,
    hospital.address?.state,
    hospital.address?.country,
  ].filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
  return parts.length > 0
    ? parts.join(', ')
    : 'Confirm the venue with your clinic before your visit.';
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
  const { user } = useSession();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payBusyId, setPayBusyId] = useState<string | null>(null);
  const [payRefs, setPayRefs] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const cancel = async (id: string) => {
    setCancellingId(id);
    setActionError(null);
    try {
      await bookingService.cancelAppointment(id);
      resource.reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not cancel.');
    } finally {
      setCancellingId(null);
    }
  };

  // Consultation-fee checkout is provider-hosted (Paystack) and advisory:
  // cash/offline flows exist, so payment never blocks care — it only marks
  // the visit PAID for the consultant's queue.
  const pay = async (appointment: Appointment) => {
    const email = user?.email;
    if (!email) {
      setActionError('Your account has no email for the Paystack receipt.');
      return;
    }
    setPayBusyId(appointment.id);
    setActionError(null);
    try {
      const launched = await bookingService.initiateAppointmentPayment({
        appointmentId: appointment.id,
        email,
      });
      setPayRefs((prev) => ({ ...prev, [appointment.id]: launched.reference }));
      await openURL(launched.authorization_url);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Payment could not start.');
    } finally {
      setPayBusyId(null);
    }
  };

  const verifyPay = async (appointment: Appointment) => {
    const reference = payRefs[appointment.id];
    if (!reference) return;
    setPayBusyId(appointment.id);
    setActionError(null);
    try {
      const result = await bookingService.verifyAppointmentPayment(reference);
      if (result.status === 'SUCCESS') {
        setPayRefs((prev) => {
          const next = { ...prev };
          delete next[appointment.id];
          return next;
        });
        resource.reload();
      } else {
        setActionError(`Payment is ${result.status.toLowerCase()}. It lands once it succeeds.`);
      }
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Verification failed.');
    } finally {
      setPayBusyId(null);
    }
  };

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
              {visitLocation(appointment) ? (
                <Text testID="patient.appointments.location" style={styles.location}>
                  📍 {visitLocation(appointment)}
                </Text>
              ) : null}
              {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
              {isPaid(appointment) ? (
                <View testID="patient.appointments.paid" style={styles.paidRow}>
                  <Text style={styles.paidText}>Paid</Text>
                </View>
              ) : consultationFee(appointment) > 0 &&
                (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') ? (
                <View style={styles.payRow}>
                  <Text style={styles.feeText}>
                    Fee: ₦{consultationFee(appointment).toLocaleString('en-NG')}
                  </Text>
                  {payRefs[appointment.id] ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Verify appointment payment"
                      testID="patient.appointments.verify"
                      disabled={payBusyId === appointment.id}
                      onPress={() => void verifyPay(appointment)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.cancelButtonText}>
                        {payBusyId === appointment.id ? 'Verifying…' : 'I have paid — verify'}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Pay consultation fee"
                      testID="patient.appointments.pay"
                      disabled={payBusyId === appointment.id}
                      onPress={() => void pay(appointment)}
                      style={styles.joinButton}
                    >
                      <Text style={styles.joinButtonText}>
                        {payBusyId === appointment.id ? 'Opening…' : 'Pay fee'}
                      </Text>
                    </Pressable>
                  )}
                </View>
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
              {appointment.status === 'PENDING' || appointment.status === 'CONFIRMED' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel appointment"
                  testID="patient.appointments.cancel"
                  disabled={cancellingId === appointment.id}
                  onPress={() => void cancel(appointment.id)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>
                    {cancellingId === appointment.id ? 'Cancelling…' : 'Cancel'}
                  </Text>
                </Pressable>
              ) : null}
              {(appointment.status === 'PENDING' || appointment.status === 'CONFIRMED') &&
              appointment.provider?.id ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reschedule appointment"
                  testID="patient.appointments.reschedule"
                  onPress={() => {
                    router.push({
                      pathname: '/booking/[providerId]' as any,
                      params: {
                        providerId: appointment.provider!.id!,
                        rescheduleId: appointment.id,
                      },
                    });
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Reschedule</Text>
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
  location: { ...typography.caption, color: colors.slate700 },
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
  paidRow: {
    borderRadius: radii.round,
    backgroundColor: colors.emerald100,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  paidText: {
    ...typography.caption,
    color: colors.emerald700,
    fontSize: 11,
  },
  payRow: { gap: spacing[2], marginTop: spacing[2] },
  feeText: { ...typography.caption, color: colors.slate700 },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  cancelButtonText: {
    ...typography.bodyStrong,
    color: colors.slate600,
    fontSize: 13,
  },
  actionError: { ...typography.caption, color: colors.rose700 },
});
