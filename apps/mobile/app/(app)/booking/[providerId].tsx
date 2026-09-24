import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { bookingService, SlotTakenError } from '@/features/booking/booking-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';
import { createIdempotencyScope } from '@ricton/api-contract';

export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function nextSevenDays(from = new Date()): Array<{ key: string; label: string }> {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    return {
      key: toLocalDateKey(d),
      label:
        i === 0
          ? 'Today'
          : new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric' }).format(d),
    };
  });
}

export type ConsultType = 'VIDEO' | 'IN_PERSON';

export default function ProviderDetailScreen() {
  const { providerId, rescheduleId } = useLocalSearchParams<{
    providerId: string;
    rescheduleId?: string;
  }>();
  const rescheduling = typeof rescheduleId === 'string' && rescheduleId.length > 0;
  const days = useRef(nextSevenDays()).current;
  const [dayKey, setDayKey] = useState(days[0].key);
  const [consultType, setConsultType] = useState<ConsultType>('VIDEO');
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [rescheduled, setRescheduled] = useState(false);
  // Stable idempotency scope: same key across retries of one selection,
  // fresh key after success or selection change (see api-contract).
  const idempotencyScope = useRef(createIdempotencyScope());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // The slots API interprets `date` in UTC while the picker shows local
    // calendar days; slot instants render back in local time below, so what
    // the patient picks is what they see. A tz-aware slots API would remove
    // the residual ±1-day edge for UTC+X zones around midnight.
    try {
      const result = (await bookingService.getSlots(String(providerId), dayKey)) as
        | { data?: string[] | { slots?: string[] }; slots?: string[] }
        | string[];
      const slotData = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : result.data && 'slots' in result.data
            ? result.data.slots
            : result.slots;
      setSlots(slotData ?? []);
      setSelected(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Available times could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [providerId, dayKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async () => {
    if (!selected) {
      setError('Choose a time first.');
      return;
    }
    setBooking(true);
    setError(null);
    try {
      // Reschedule keeps the same visit (provider + type fixed server-side);
      // only the grid slot moves.
      if (rescheduling) {
        await bookingService.rescheduleAppointment(String(rescheduleId), selected);
        setRescheduled(true);
        return;
      }
      await bookingService.createAppointment(
        {
          providerId: String(providerId),
          scheduledAt: selected,
          type: consultType,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
        {
          idempotencyKey: idempotencyScope.current.keyFor(
            String(providerId),
            selected,
            consultType
          ),
        }
      );
      idempotencyScope.current.reset(String(providerId), selected, consultType);
      setConfirmed(true);
    } catch (caught) {
      setError(
        caught instanceof SlotTakenError
          ? 'That time was just taken. Pick another.'
          : caught instanceof Error
            ? caught.message
            : 'Booking could not be completed.'
      );
    } finally {
      setBooking(false);
    }
  };

  return (
    <Screen testID="booking.detail.screen" style={styles.content}>
      <PatientHeader
        eyebrow={rescheduling ? 'MOVE YOUR VISIT' : 'CHOOSE A TIME'}
        title={rescheduling ? 'Pick a new time' : 'Available times'}
        subtitle="Times update live — taken slots disappear."
      />
      <View testID="booking.day-strip" style={styles.dayStrip}>
        {days.map((day, index) => {
          const active = day.key === dayKey;
          return (
            <Pressable
              key={day.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setDayKey(day.key)}
              style={[styles.day, active && styles.slotActive]}
              testID={`booking.day-${index}`}
            >
              <Text style={[styles.slotText, active && styles.slotTextActive]}>{day.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {rescheduling ? null : (
        <View style={styles.typeRow}>
          {(['VIDEO', 'IN_PERSON'] as const).map((type) => {
            const active = consultType === type;
            return (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setConsultType(type)}
                style={[styles.day, active && styles.slotActive]}
                testID={type === 'VIDEO' ? 'booking.type-video' : 'booking.type-inperson'}
              >
                <Text style={[styles.slotText, active && styles.slotTextActive]}>
                  {type === 'VIDEO' ? 'Video visit' : 'In person'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading times…</Text>
        </View>
      ) : error && !slots ? (
        <StateNotice
          title="Times could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : (
        <View testID="booking.slots" style={styles.list}>
          {(slots ?? []).map((slot, index) => {
            const active = selected === slot;
            return (
              <Pressable
                key={slot}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelected(slot)}
                style={[styles.slot, active && styles.slotActive]}
                testID={`booking.slot-${index}`}
              >
                <Text style={[styles.slotText, active && styles.slotTextActive]}>
                  {new Intl.DateTimeFormat('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(slot))}
                </Text>
              </Pressable>
            );
          })}
          {(slots ?? []).length === 0 ? (
            <StateNotice title="No times that day" message="Try another day or clinician." />
          ) : null}
        </View>
      )}
      {error && slots ? <Text style={styles.error}>{error}</Text> : null}
      {rescheduling ? null : (
        <TextField
          label="Reason for visit (optional)"
          value={reason}
          onChangeText={setReason}
          testID="booking.reason"
        />
      )}
      <PrimaryButton
        accessibilityLabel={rescheduling ? 'Confirm reschedule' : 'Confirm booking'}
        disabled={!selected}
        label={rescheduling ? 'Confirm reschedule' : 'Confirm booking'}
        loading={booking}
        onPress={() => void confirm()}
        testID="booking.confirm"
      />
      {confirmed ? (
        <View testID="booking.confirmed">
          <StateNotice
            title="Booking requested"
            message="Your appointment request has been received and is awaiting provider confirmation. Reminders will arrive before your visit."
          />
        </View>
      ) : null}
      {rescheduled ? (
        <View testID="booking.rescheduled">
          <StateNotice
            title="Visit rescheduled"
            message="Your visit was moved to the new time. The other party has been notified."
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  list: { gap: spacing[2] },
  dayStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  typeRow: { flexDirection: 'row', gap: spacing[2] },
  day: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  slot: {
    ...cardShadow,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing[4],
  },
  slotActive: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  slotText: { ...typography.bodyStrong, color: colors.navy900 },
  slotTextActive: { color: colors.blue700 },
  error: { ...typography.caption, color: colors.rose700 },
});
