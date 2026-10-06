import { openURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import { subscriptionService } from '@/features/subscription/subscription-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface Plan {
  id: string;
  name: string;
  code: 'FREE' | 'PREMIUM';
  price: number;
  currency: string;
  features: string[];
}

interface Entitlement {
  plan: 'FREE' | 'PREMIUM';
  status: string;
  expiresAt?: string;
}

function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function PremiumScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [history, setHistory] = useState<Array<{ plan?: string; status?: string; createdAt?: string; expiresAt?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [p, e] = await Promise.all([
        subscriptionService.listPlans() as Promise<{ plans: Plan[] }>,
        subscriptionService.refreshEntitlement(),
      ]);
      setPlans(p.plans);
      setEntitlement(e);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Plans could not be loaded.');
    }
    // History is non-critical: never block plans/entitlement on it.
    try {
      const h = (await subscriptionService.history({ limit: 10, offset: 0 })) as
        | { subscriptions?: Array<{ plan?: string; status?: string; createdAt?: string; expiresAt?: string }> }
        | Array<{ plan?: string; status?: string; createdAt?: string; expiresAt?: string }>;
      setHistory(Array.isArray(h) ? h : (h.subscriptions ?? []));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subscribe = async () => {
    setWorking(true);
    setError(null);
    try {
      const result = (await subscriptionService.subscribe(
        { plan: 'PREMIUM' },
        { idempotencyKey: newIdempotencyKey() }
      )) as { paymentUrl?: string };
      if (result.paymentUrl) await openURL(result.paymentUrl);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Subscription could not be started.');
    } finally {
      setWorking(false);
    }
  };

  const cancel = async () => {
    setWorking(true);
    try {
      await subscriptionService.cancel();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Subscription could not be cancelled.');
    } finally {
      setWorking(false);
    }
  };

  const isPremium = entitlement?.plan === 'PREMIUM' && entitlement?.status === 'ACTIVE';

  return (
    <Screen testID="premium.screen" style={styles.content}>
      <PatientHeader
        eyebrow="MEMBERSHIP"
        title="Ricton Premium"
        subtitle="Entitlements are granted by the server, never this screen."
      />
      {!plans || !entitlement ? (
        error ? (
          <StateNotice
            title="Plans could not be loaded"
            message={error}
            actionLabel="Try again"
            onAction={() => void load()}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.blue600} />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        )
      ) : (
        <>
          <View
            testID={isPremium ? 'premium.current-premium' : 'premium.current-free'}
            style={styles.current}
          >
            <Text style={styles.currentText}>
              {isPremium ? 'Premium active' : 'Free plan'} · {entitlement.status}
            </Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.list}>
            {plans.map((plan) => (
              <View key={plan.id} style={styles.card} testID={`premium.plan-${plan.id}`}>
                <Text style={styles.name}>
                  {plan.name} · {plan.currency} {plan.price.toLocaleString()}
                </Text>
                {plan.features.map((feature) => (
                  <Text key={feature} style={styles.feature}>
                    • {feature}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          {isPremium ? (
            <PrimaryButton
              label="Cancel premium"
              loading={working}
              onPress={() => void cancel()}
              testID="premium.cancel"
            />
          ) : (
            <PrimaryButton
              label="Subscribe to Premium"
              loading={working}
              onPress={() => void subscribe()}
              testID="premium.subscribe"
            />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('./rewards')}
            testID="premium.go-rewards"
          >
            <Text style={styles.link}>View rewards</Text>
          </Pressable>
          <View style={styles.history} testID="premium.history">
            <Text style={styles.historyTitle}>Subscription history</Text>
            {history.length === 0 ? (
              <Text style={styles.historyEmpty}>No past subscriptions.</Text>
            ) : (
              history.map((item, index) => (
                <View
                  key={`${item.plan ?? 'plan'}-${item.createdAt ?? index}`}
                  style={styles.historyRow}
                  testID={`premium.history-${index}`}
                >
                  <Text style={styles.historyPlan}>{item.plan ?? '—'}</Text>
                  <Text style={styles.historyMeta}>
                    {[item.status, item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  current: { borderRadius: radii.md, backgroundColor: colors.blue50, padding: spacing[4] },
  currentText: { ...typography.bodyStrong, color: colors.blue700 },
  error: { ...typography.caption, color: colors.rose700 },
  list: { gap: spacing[3] },
  card: {
    ...cardShadow,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[1],
  },
  name: { ...typography.bodyStrong, color: colors.navy900 },
  feature: { ...typography.caption, color: colors.slate600 },
  link: { ...typography.bodyStrong, color: colors.blue700, textAlign: 'center' },
  history: { gap: spacing[2] },
  historyTitle: { ...typography.bodyStrong, color: colors.navy900 },
  historyEmpty: { ...typography.caption, color: colors.slate600 },
  historyRow: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing[3],
    gap: spacing[1],
  },
  historyPlan: { ...typography.bodyStrong, color: colors.navy900 },
  historyMeta: { ...typography.caption, color: colors.slate600 },
});
