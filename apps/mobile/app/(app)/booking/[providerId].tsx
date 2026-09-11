import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { bookingService, SlotTakenError } from '@/features/booking/booking-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ProviderDetailScreen() {
  const { providerId } = useLocalSearchParams<{ providerId: string }>();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = (await bookingService.getSlots(
        String(providerId),
        new Date().toISOString().slice(0, 10)
      )) as { slots: string[] } | string[];
      setSlots(Array.isArray(result) ? result : result.slots);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Available times could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

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
      await bookingService.createAppointment(
        {
          providerId: String(providerId),
          scheduledAt: selected,
          type: 'VIDEO',
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        },
        { idempotencyKey: newIdempotencyKey() }
      );
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
        eyebrow="CHOOSE A TIME"
        title="Available times"
        subtitle="Times update live — taken slots disappear."
      />
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
      <TextField
        label="Reason for visit (optional)"
        value={reason}
        onChangeText={setReason}
        testID="booking.reason"
      />
      <PrimaryButton
        accessibilityLabel="Confirm booking"
        disabled={!selected}
        label="Confirm booking"
        loading={booking}
        onPress={() => void confirm()}
        testID="booking.confirm"
      />
      {confirmed ? (
        <View testID="booking.confirmed">
          <StateNotice
            title="Booking confirmed"
            message="Your appointment is booked. Reminders will arrive before your visit."
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
