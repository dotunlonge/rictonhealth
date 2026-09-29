import { Link, useLocalSearchParams } from 'expo-router';
import { openURL } from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const [verifying, setVerifying] = useState(false);
  const [placedId, setPlacedId] = useState<string | null>(null);
  const [payReference, setPayReference] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

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
      // Chain order → payment initialize → provider-hosted checkout.
      // Missing method (older mocks) means order-only: still show placed.
      const launcher = (pharmacyService as { initiateOrderPayment?: unknown })[
        'initiateOrderPayment'
      ];
      if (typeof launcher === 'function') {
        try {
          const launched = (await (
            pharmacyService as unknown as {
              initiateOrderPayment: (input: { orderId: string }) => Promise<{
                authorization_url: string;
                reference: string;
              }>;
            }
          ).initiateOrderPayment({ orderId: order.id })) as {
            authorization_url: string;
            reference: string;
          };
          setPayReference(launched.reference);
          // expo-web-browser is not installed: keep openURL handoff; the
          // foreground listener below auto-verifies on return.
          await openURL(launched.authorization_url);
        } catch (payError) {
          // Order exists but is unpaid — surface paid/unpaid state, keep
          // the order ID so the user can retry payment from tracking.
          setPayReference(null);
          setError(
            `Order ${order.id} placed (unpaid): ${
              payError instanceof Error ? payError.message : 'Payment could not start.'
            }`
          );
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Order could not be placed.');
    } finally {
      setPlacing(false);
    }
  };

  const verify = async () => {
    if (!payReference) return;
    setVerifying(true);
    setError(null);
    try {
      const verifier = (pharmacyService as { verifyOrderPayment?: unknown })[
        'verifyOrderPayment'
      ];
      if (typeof verifier !== 'function') {
        setError('Verification is not available in this build.');
        return;
      }
      const result = (await (
        pharmacyService as unknown as {
          verifyOrderPayment: (reference: string) => Promise<{ status: string }>;
        }
      ).verifyOrderPayment(payReference)) as { status: string };
      if (result.status === 'SUCCESS') {
        setPaid(true);
      } else {
        setError(`Payment is ${result.status.toLowerCase()}. It lands once it succeeds.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  // expo-web-browser is not installed (see apps/mobile/package.json), so the
  // Paystack handoff stays on openURL. Auto-verify when the app returns to
  // the foreground; the manual "I have paid — verify" button remains.
  const verifyRef = useRef(verify);
  verifyRef.current = verify;
  useEffect(() => {
    if (!payReference || paid) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void verifyRef.current();
    });
    return () => sub.remove();
  }, [payReference, paid]);

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
          <StateNotice
            title={paid ? 'Order paid' : payReference ? 'Order placed (unpaid)' : 'Order placed'}
            message={
              paid
                ? `Order ${placedId} payment confirmed.`
                : payReference
                  ? `Order ${placedId} is awaiting payment. Complete it in your browser, then verify below.`
                  : `Order ${placedId} is being prepared.`
            }
          />
          {payReference && !paid ? (
            <View testID="pharmacy.checkout-opened" style={styles.stack}>
              <PrimaryButton
                label="I have paid — verify"
                loading={verifying}
                onPress={() => void verify()}
                testID="pharmacy.verify"
              />
            </View>
          ) : null}
          {paid ? (
            <View testID="pharmacy.verified">
              <StateNotice title="Payment verified" message="The pharmacy can now fulfill it." />
            </View>
          ) : null}
          <Link
            href={{ pathname: '/pharmacy/orders/[orderId]', params: { orderId: placedId } }}
            testID="pharmacy.track-order"
          >
            <Text style={styles.link}>Track order</Text>
          </Link>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  row: { flexDirection: 'row', gap: spacing[3] },
  stack: { gap: spacing[4] },
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
  link: { ...typography.bodyStrong, color: colors.blue700 },
});
