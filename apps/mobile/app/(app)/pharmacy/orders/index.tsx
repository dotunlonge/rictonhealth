import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import { pharmacyService } from '@/features/pharmacy/pharmacy-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface Order {
  id: string;
  status: string;
  totalAmount: number | string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = (await pharmacyService.listOrders({ limit: 20, offset: 0 })) as {
        orders: Order[];
      };
      setOrders(result.orders);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Orders could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen testID="pharmacy.orders.screen" style={styles.content}>
      <PatientHeader
        eyebrow="ORDERS"
        title="My orders"
        subtitle="Every order with its live status."
      />
      {orders === null && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading orders…</Text>
        </View>
      ) : error ? (
        <StateNotice
          title="Orders could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : orders?.length ? (
        <View style={styles.list}>
          {orders.map((order) => (
            <Pressable
              key={order.id}
              accessibilityRole="button"
              onPress={() => router.push(`./${order.id}` as const)}
              style={styles.card}
              testID={`pharmacy.order-${order.id}`}
            >
              <Text style={styles.status}>{order.status.replaceAll('_', ' ')}</Text>
              <Text style={styles.total}>NGN {String(order.totalAmount)}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <StateNotice title="No orders yet" message="Placed orders will appear here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  list: { gap: spacing[3] },
  card: {
    ...cardShadow,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
  },
  status: { ...typography.bodyStrong, color: colors.navy900, textTransform: 'capitalize' },
  total: { ...typography.caption, color: colors.slate600 },
});
