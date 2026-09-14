import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import { cartStore, lineEstimate } from '@/features/pharmacy/cart-store';
import { useCart } from '@/features/pharmacy/use-cart';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function CartScreen() {
  const router = useRouter();
  const lines = useCart();
  const estimate = lines.reduce((sum, line) => sum + lineEstimate(line), 0);

  return (
    <Screen testID="pharmacy.cart.screen" style={styles.content}>
      <PatientHeader eyebrow="YOUR CART" title="Cart" subtitle="One pharmacy per order." />
      {lines.length === 0 ? (
        <StateNotice title="Cart is empty" message="Browse medicines to add them here." />
      ) : (
        <>
          <View style={styles.list}>
            {lines.map((line) => (
              <View key={line.id} style={styles.card} testID={`pharmacy.cart-line-${line.id}`}>
                <View style={styles.cardCopy}>
                  <Text style={styles.name}>{line.name}</Text>
                  <Text style={styles.meta}>
                    Qty {line.quantity} · stock {line.stock}
                  </Text>
                </View>
                <Text style={styles.remove} onPress={() => cartStore.remove(line.id)}>
                  Remove
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.estimate}>
            Catalog estimate: NGN {estimate.toFixed(2)} — final total is set by the server.
          </Text>
          <PrimaryButton
            label="Continue to checkout"
            onPress={() => router.push('./checkout')}
            testID="pharmacy.go-checkout"
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  list: { gap: spacing[3] },
  card: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cardCopy: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.navy900 },
  meta: { ...typography.caption, color: colors.slate600 },
  remove: { ...typography.bodyStrong, color: colors.rose700 },
  estimate: { ...typography.caption, color: colors.slate600 },
});
