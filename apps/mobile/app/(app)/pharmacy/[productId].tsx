import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import { cartStore, type CartProduct } from '@/features/pharmacy/cart-store';
import { pharmacyService } from '@/features/pharmacy/pharmacy-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

interface Product extends CartProduct {
  description?: string | null;
}

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProduct((await pharmacyService.productDetail(String(productId))) as Product);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Medicine could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const step = (delta: number) => {
    if (!product) return;
    setQuantity((current) => Math.max(1, Math.min(current + delta, product.stock)));
    setAdded(false);
  };

  const add = () => {
    if (!product) return;
    try {
      cartStore.add(product, quantity);
      setAdded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add to cart.');
    }
  };

  return (
    <Screen testID="pharmacy.detail.screen" style={styles.content}>
      <PatientHeader
        eyebrow="MEDICINE"
        title={product?.name ?? 'Medicine'}
        subtitle="Stock checked live at checkout."
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading medicine…</Text>
        </View>
      ) : error && !product ? (
        <StateNotice
          title="Medicine could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : product ? (
        <View testID="pharmacy.detail" style={styles.stack}>
          {product.requiresPrescription ? (
            <StateNotice
              title="Prescription needed"
              message="Attach a signed prescription at checkout."
            />
          ) : null}
          {product.stock <= 0 ? (
            <StateNotice title="Out of stock" message="Check back soon." />
          ) : null}
          <View style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease quantity"
              onPress={() => step(-1)}
              style={styles.stepButton}
              testID="pharmacy.qty-minus"
            >
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text testID="pharmacy.qty-value" style={styles.qty}>
              {quantity}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase quantity"
              onPress={() => step(1)}
              style={styles.stepButton}
              testID="pharmacy.qty-plus"
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Add to cart" onPress={add} testID="pharmacy.add" />
          {added ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('./cart')}
              testID="pharmacy.go-cart"
            >
              <Text style={styles.added}>Added — review cart</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  stack: { gap: spacing[4] },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  stepButton: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { ...typography.title, color: colors.navy900 },
  qty: { ...typography.title, color: colors.navy900, minWidth: 40, textAlign: 'center' },
  error: { ...typography.caption, color: colors.rose700 },
  added: { ...typography.bodyStrong, color: colors.blue700, textAlign: 'center' },
});
