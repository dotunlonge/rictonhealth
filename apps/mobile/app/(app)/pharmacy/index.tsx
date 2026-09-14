import { useRouter } from 'expo-router';
import { Pill } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice, TextField } from '@/components/ui';
import { useCart } from '@/features/pharmacy/use-cart';
import { pharmacyService } from '@/features/pharmacy/pharmacy-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface Product {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  requiresPrescription: boolean;
  pharmacy?: { pharmacyProfile?: { pharmacyName?: string | null } | null } | null;
}

function displayPrice(price: number | string): string {
  const amount = typeof price === 'string' ? Number(price) : price;
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `NGN ${amount.toFixed(2)}`;
  }
}

export default function PharmacyCatalogScreen() {
  const router = useRouter();
  const cart = useCart();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = (await pharmacyService.browseProducts({
        search: query.trim() || undefined,
        limit: 20,
        offset: 0,
      })) as { products: Product[] };
      setProducts(result.products);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Medicines could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Screen testID="pharmacy.catalog.screen" style={styles.content}>
      <PatientHeader
        eyebrow="PHARMACY"
        title="Order medicines"
        subtitle="Licensed stock, server-verified prices."
      />
      <TextField
        label="Search medicines"
        accessibilityLabel="Search medicines"
        onChangeText={(text) => {
          setSearch(text);
          void load(text);
        }}
        placeholder="Paracetamol, vitamin C…"
        returnKeyType="search"
        testID="pharmacy.search"
        value={search}
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('./cart')}
          style={styles.cartButton}
          testID="pharmacy.go-cart"
        >
          <Text style={styles.cartText}>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('./orders')}
          style={styles.ordersButton}
          testID="pharmacy.go-orders"
        >
          <Text style={styles.ordersText}>My orders</Text>
        </Pressable>
      </View>
      {loading && products === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading medicines…</Text>
        </View>
      ) : error ? (
        <StateNotice
          title="Medicines could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load(search)}
        />
      ) : products?.length ? (
        <View style={styles.list}>
          {products.map((product) => (
            <Pressable
              key={product.id}
              accessibilityRole="button"
              accessibilityLabel={`View ${product.name}`}
              onPress={() => router.push(`./${product.id}` as const)}
              style={styles.card}
              testID={`pharmacy.product-${product.id}`}
            >
              <View style={styles.icon}>
                <Pill color={colors.blue700} size={22} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.name}>{product.name}</Text>
                <Text style={styles.meta}>
                  {displayPrice(product.price)} ·{' '}
                  {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  {product.requiresPrescription ? ' · Needs prescription' : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View testID="pharmacy.empty">
          <StateNotice title="No medicines found" message="Try a different search." />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  actions: { flexDirection: 'row', gap: spacing[3] },
  cartButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartText: { ...typography.bodyStrong, color: colors.white },
  ordersButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordersText: { ...typography.bodyStrong, color: colors.navy900 },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  list: { gap: spacing[3] },
  card: {
    ...cardShadow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.navy900 },
  meta: { ...typography.caption, color: colors.slate600 },
});
