import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import { rewardsService } from '@/features/rewards/rewards-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface RewardItem {
  id: string;
  name: string;
  pointsCost: number;
  stock: number;
}

function formatPoints(value: number): string {
  return value.toLocaleString('en-NG');
}

export default function RewardsScreen() {
  const [balance, setBalance] = useState<{ balance: number; tier?: string } | null>(null);
  const [items, setItems] = useState<RewardItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, c] = await Promise.all([
        rewardsService.balance() as Promise<{ balance: number; tier?: string }>,
        rewardsService.catalog() as Promise<{ items: RewardItem[] }>,
      ]);
      setBalance(b);
      setItems(c.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Rewards could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const redeem = async (item: RewardItem) => {
    setRedeeming(item.id);
    setConflictId(null);
    try {
      await rewardsService.redeem(
        { rewardId: item.id },
        { idempotencyKey: `${Date.now().toString(36)}-${item.id}` }
      );
      await load();
    } catch (caught) {
      if (caught instanceof Error && (caught as { code?: string }).code === 'REWARD_CONFLICT') {
        setConflictId(item.id);
      } else {
        setError(caught instanceof Error ? caught.message : 'Reward could not be redeemed.');
      }
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <Screen testID="rewards.screen" style={styles.content}>
      <PatientHeader
        eyebrow="REWARDS"
        title="Points and perks"
        subtitle="Balances and redemptions are enforced by the server."
      />
      {!balance || !items ? (
        error ? (
          <StateNotice
            title="Rewards could not be loaded"
            message={error}
            actionLabel="Try again"
            onAction={() => void load()}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.blue600} />
            <Text style={styles.loadingText}>Loading rewards…</Text>
          </View>
        )
      ) : (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.balance}>{formatPoints(balance.balance)} pts</Text>
            {balance.tier ? <Text style={styles.tier}>{balance.tier} tier</Text> : null}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={styles.card} testID={`rewards.item-${item.id}`}>
                <View style={styles.cardCopy}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.cost}>
                    {formatPoints(item.pointsCost)} pts · {item.stock} left
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Redeem ${item.name}`}
                  disabled={redeeming === item.id || item.stock <= 0}
                  onPress={() => void redeem(item)}
                  style={styles.redeem}
                  testID={`rewards.redeem-${item.id}`}
                >
                  <Text style={styles.redeemText}>{redeeming === item.id ? '…' : 'Redeem'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {conflictId ? (
            <View testID="rewards.conflict">
              <StateNotice
                title="Already redeemed"
                message="This reward was already claimed or is unavailable."
              />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  balanceCard: {
    ...cardShadow,
    borderRadius: radii.lg,
    backgroundColor: colors.navy900,
    padding: spacing[6],
  },
  balance: { ...typography.title, color: colors.white, fontSize: 30 },
  tier: { ...typography.caption, color: colors.blue100 },
  error: { ...typography.caption, color: colors.rose700 },
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
  cost: { ...typography.caption, color: colors.slate600 },
  redeem: {
    minWidth: 88,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  redeemText: { ...typography.bodyStrong, color: colors.white },
});
