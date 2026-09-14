import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import { isTerminalOrder, pharmacyService } from '@/features/pharmacy/pharmacy-service';
import { colors, spacing, typography } from '@/theme/tokens';

interface Order {
  id: string;
  status: string;
  totalAmount: number | string;
  deliveryType?: string;
  items?: Array<{ drugName: string; quantity: number }>;
}

const STAGES = ['PLACED', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;

function stageIndex(status: string): number {
  const direct = (STAGES as readonly string[]).indexOf(status);
  if (direct >= 0) return direct;
  return status === 'READY_FOR_PICKUP' ? 3 : -1;
}

export default function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder((await pharmacyService.trackOrder(String(orderId))) as Order);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Order could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async () => {
    setCancelling(true);
    try {
      setOrder((await pharmacyService.cancelOrder(String(orderId))) as Order);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Order could not be cancelled.');
    } finally {
      setCancelling(false);
    }
  };

  const current = order ? stageIndex(order.status) : -1;

  return (
    <Screen testID="pharmacy.tracking.screen" style={styles.content}>
      <PatientHeader eyebrow="ORDER" title="Tracking" subtitle="Live status from the pharmacy." />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading order…</Text>
        </View>
      ) : error && !order ? (
        <StateNotice
          title="Order could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : order ? (
        <View testID="pharmacy.tracking" style={styles.stack}>
          <Text style={styles.status}>
            {order.status.replaceAll('_', ' ')} · NGN {String(order.totalAmount)}
          </Text>
          <View style={styles.stages}>
            {STAGES.map((stage, index) => (
              <View key={stage} style={styles.stage}>
                <View style={[styles.dot, index <= current && styles.dotDone]} />
                <Text style={styles.stageText}>{stage.replaceAll('_', ' ')}</Text>
              </View>
            ))}
          </View>
          {order.status === 'PLACED' ? (
            <PrimaryButton
              label="Cancel order"
              loading={cancelling}
              onPress={() => void cancel()}
              testID="pharmacy.cancel"
            />
          ) : null}
          {isTerminalOrder(order.status) ? (
            <StateNotice title="Order complete" message="This order reached a terminal state." />
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
  status: { ...typography.heading, color: colors.navy900, textTransform: 'capitalize' },
  stages: { gap: spacing[2] },
  stage: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.slate200 },
  dotDone: { backgroundColor: colors.blue600 },
  stageText: { ...typography.caption, color: colors.slate600, textTransform: 'capitalize' },
  error: { ...typography.caption, color: colors.rose700 },
});
