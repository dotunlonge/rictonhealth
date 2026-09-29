import { openURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { CalendarDays, Clock3, Stethoscope, Video } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Paystack references survive restarts: RAM for the session, AsyncStorage
// across reloads so "I have paid — verify" never strands a payer.
const payRefKey = (appointmentId: string) => `ricton:payref:${appointmentId}`;

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
  const PAGE_LIMIT = 50;
  const load = useCallback(
    () =>
      apiClient.get<AppointmentListResponse>(
        `${GATEWAY_PATHS.appointments.replace(/^\/api/, '')}?limit=${PAGE_LIMIT}&offset=0`
      ),
    []
  );
  const resource = useRemoteResource(load);
  const { user } = useSession();
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'CONFIRMED' | 'PENDING' | 'COMPLETED' | 'CANCELLED'
  >('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payBusyId, setPayBusyId] = useState<string | null>(null);
  const [payRefs, setPayRefs] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  // Minimal pagination: first page via useRemoteResource, further pages
  // appended with a "Load more" button when meta.hasMore is true.
  const [appended, setAppended] = useState<Appointment[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setAppended([]);
    const data = resource.data;
    if (data?.meta?.hasMore) {
      setNextOffset(data.appointments.length);
    } else {
      setNextOffset(null);
    }
  }, [resource.data]);

  const allAppointments = [...(resource.data?.appointments ?? []), ...appended];

  const loadMore = async () => {
    if (nextOffset === null || loadingMore) return;
    setLoadingMore(true);
    setActionError(null);
    try {
      const res = await apiClient.get<AppointmentListResponse>(
        `${GATEWAY_PATHS.appointments.replace(/^\/api/, '')}?limit=${PAGE_LIMIT}&offset=${nextOffset}`
      );
      setAppended((prev) => [...prev, ...res.appointments]);
      setNextOffset(res.meta?.hasMore ? nextOffset + res.appointments.length : null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not load more.');
    } finally {
      setLoadingMore(false);
    }
  };

  // Hydrate persisted pay refs once the appointment list loads.
  useEffect(() => {
    const list = resource.data?.appointments;
    if (!list?.length) return;
    let cancelled = false;
    (async () => {
      try {
        const pairs = await Promise.all(
          list.map(async (a) => [a.id, await AsyncStorage.getItem(payRefKey(a.id))] as const)
        );
        if (cancelled) return;
        const found: Record<string, string> = {};
        for (const [id, ref] of pairs) {
          if (ref) found[id] = ref;
        }
        if (Object.keys(found).length > 0) {
          setPayRefs((prev) => ({ ...found, ...prev }));
        }
      } catch {
        // RAM-only fallback: pay flow still works for this session.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resource.data]);

  const cancel = async (id: string, reason?: string) => {
    setCancellingId(id);
    setActionError(null);
    try {
      await bookingService.cancelAppointment(id, reason || 'Patient cancelled via mobile');
      resource.reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Could not cancel.');
    } finally {
      setCancellingId(null);
    }
  };

  // Cancel always records a reason: iOS gets a prompt with a text field,
  // other platforms get a confirm sheet with a default reason attached.
  const askCancelReasonAndCancel = (id: string) => {
    const submit = (text?: string) =>
      void cancel(id, (text || '').trim() || 'Patient cancelled via mobile');
    const prompt = (Alert as unknown as { prompt?: unknown }).prompt;
    if (Platform.OS === 'ios' && typeof prompt === 'function') {
      (Alert as unknown as {
        prompt: (
          title: string,
          message: string,
          buttons: Array<{ text: string; style?: string; onPress?: (t?: string) => void }>,
          type?: string
        ) => void;
      }).prompt(
        'Cancel appointment',
        'Tell the clinic why (optional)',
        [
          { text: 'Keep appointment', style: 'cancel' },
          { text: 'Cancel visit', style: 'destructive', onPress: submit },
        ],
        'plain-text'
      );
    } else {
      Alert.alert(
        'Cancel appointment',
        'Cancel this visit? The clinic will be told you cancelled via mobile.',
        [
          { text: 'Keep appointment', style: 'cancel' },
          { text: 'Cancel visit', style: 'destructive', onPress: () => submit() },
        ]
      );
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
      try {
        await AsyncStorage.setItem(payRefKey(appointment.id), launched.reference);
      } catch {
        // RAM-only fallback: verify still works for this session.
      }
      // expo-web-browser is not installed: keep openURL handoff; the
      // foreground listener above auto-verifies on return.
      await openURL(launched.authorization_url);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Payment could not start.');
    } finally {
      setPayBusyId(null);
    }
  };

  const verifyPay = async (appointment: Appointment) => {
    const reference = payRefs[appointment.id];
    if (!reference) return;    setPayBusyId(appointment.id);
    setActionError(null);
    try {
      const result = await bookingService.verifyAppointmentPayment(reference);
      if (result.status === 'SUCCESS') {
        setPayRefs((prev) => {
          const next = { ...prev };
          delete next[appointment.id];
          return next;
        });
        try {
          await AsyncStorage.removeItem(payRefKey(appointment.id));
        } catch {
          // Non-fatal: the in-memory ref is already cleared.
        }
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

  // expo-web-browser is not installed (see apps/mobile/package.json), so the
  // Paystack handoff stays on openURL. Auto-verify pending refs when the app
  // returns to the foreground; the manual "I have paid — verify" button stays.
  const payRefsRef = useRef(payRefs);
  payRefsRef.current = payRefs;
  const appointmentsRef = useRef(allAppointments);
  appointmentsRef.current = allAppointments;
  const verifyPayRef = useRef(verifyPay);
  verifyPayRef.current = verifyPay;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const refs = payRefsRef.current;
      if (Object.keys(refs).length === 0) return;
      for (const a of appointmentsRef.current) {
        if (refs[a.id]) void verifyPayRef.current(a);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Screen testID="patient.appointments.screen" style={styles.content}>
      <PatientHeader
        eyebrow="CARE SCHEDULE"
        title="Appointments"
        subtitle="Your upcoming and previous consultations."
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {(['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
          <Pressable
            key={s}
            accessibilityRole="tab"
            accessibilityLabel={`Filter appointments by ${s.toLowerCase()}`}
            accessibilityState={{ selected: statusFilter === s }}
            onPress={() => setStatusFilter(s)}
            style={[styles.tab, statusFilter === s && styles.tabActive]}
            testID={`patient.appointments.tab-${s}`}
          >
            <Text style={statusFilter === s ? styles.tabTextActive : styles.tabText}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>
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
          {allAppointments
            .filter((a) => statusFilter === 'ALL' || a.status === statusFilter)
            .map((appointment) => (
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
                appointment.telemedicineRoom?.id ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Join video consultation"
                    testID="patient.appointments.joinVideo"
                    onPress={() => {
                      const roomId = appointment.telemedicineRoom?.id;
                      if (!roomId) return;
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
                ) : (
                  <Text style={styles.location}>
                    Room not ready yet — the video link appears here once the clinic opens it.
                  </Text>
                )
              ) : null}
              {appointment.status === 'PENDING' || appointment.status === 'CONFIRMED' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel appointment"
                  testID="patient.appointments.cancel"
                  disabled={cancellingId === appointment.id}
                  onPress={() => askCancelReasonAndCancel(appointment.id)}
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
          {nextOffset !== null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Load more appointments"
              testID="patient.appointments.loadMore"
              disabled={loadingMore}
              onPress={() => void loadMore()}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Text>
            </Pressable>
          ) : null}
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
  tabs: { flexGrow: 0 },
  tab: {
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.slate200,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    marginRight: spacing[2],
  },
  tabActive: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  tabText: { ...typography.caption, color: colors.slate600, fontSize: 11 },
  tabTextActive: { ...typography.caption, color: colors.white, fontSize: 11 },
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
