import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { cartStore } from '@/features/pharmacy/cart-store';
import { useCart } from '@/features/pharmacy/use-cart';
import { pharmacyService } from '@/features/pharmacy/pharmacy-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type Fulfillment = 'PICKUP' | 'DELIVERY';

function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CheckoutScreen() {
  const { prescriptionId } = useLocalSearchParams<{ prescriptionId?: string }>();
  const lines = useCart();
  const [fulfillment, setFulfillment] = useState<Fulfillment>('DELIVERY');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [addressError, setAddressError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placedId, setPlacedId] = useState<string | null>(null);

  const place = async () => {
    if (fulfillment === 'DELIVERY' && !address.trim()) {
      setAddressError(true);
      return;
    }
    setAddressError(false);
    setPlacing(true);
    setError(null);
    try {
      const order = (await pharmacyService.checkout(
        {
          items: lines.map((line) => ({ productId: line.id, quantity: line.quantity })),
          deliveryType: fulfillment,
          ...(fulfillment === 'DELIVERY' ? { deliveryAddress: address.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(prescriptionId ? { prescriptionId: String(prescriptionId) } : {}),
        },
        { idempotencyKey: newIdempotencyKey() }
      )) as { id: string };
      cartStore.clear();
      setPlacedId(order.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Order could not be placed.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Screen testID="pharmacy.checkout.screen" style={styles.content}>
      <PatientHeader
        eyebrow="CHECKOUT"
        title="Review and place"
        subtitle="Totals and stock are set by the server."
      />
      <View style={styles.row}>
        {(['PICKUP', 'DELIVERY'] as const).map((option) => {
          const active = fulfillment === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setFulfillment(option)}
              style={[styles.option, active && styles.optionActive]}
              testID={`pharmacy.fulfillment-${option.toLowerCase()}`}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {option === 'PICKUP' ? 'Pickup' : 'Home delivery'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {fulfillment === 'DELIVERY' ? (
        <>
          <TextField
            label="Delivery address"
            value={address}
            onChangeText={setAddress}
            testID="pharmacy.address"
          />
          {addressError ? (
            <Text testID="pharmacy.address-error" style={styles.error}>
              Enter a delivery address.
            </Text>
          ) : null}
        </>
      ) : null}
      <TextField
        label="Notes for the pharmacy (optional)"
        value={notes}
        onChangeText={setNotes}
        testID="pharmacy.notes"
      />
      {cartStore.needsPrescription() && !prescriptionId ? (
        <StateNotice
          title="Prescription needed"
          message="One or more items require a signed prescription."
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Place order"
        loading={placing}
        onPress={() => void place()}
        testID="pharmacy.place-order"
      />
      {placedId ? (
        <View testID="pharmacy.order-placed">
          <StateNotice title="Order placed" message={`Order ${placedId} is being prepared.`} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  row: { flexDirection: 'row', gap: spacing[3] },
  option: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  optionText: { ...typography.bodyStrong, color: colors.slate600 },
  optionTextActive: { color: colors.blue700 },
  error: { ...typography.caption, color: colors.rose700 },
});
