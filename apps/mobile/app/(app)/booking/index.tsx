import { useRouter } from 'expo-router';
import { Stethoscope } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice, TextField } from '@/components/ui';
import { bookingService } from '@/features/booking/booking-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface Provider {
  id: string;
  email?: string | null;
  providerProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    specialty?: string | null;
  } | null;
}

function providerName(p: Provider): string {
  const full = [p.providerProfile?.firstName, p.providerProfile?.lastName]
    .filter(Boolean)
    .join(' ');
  return full || p.email || 'Ricton clinician';
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = (await bookingService.listProviders({
        search: query.trim() || undefined,
        limit: 20,
        offset: 0,
      })) as { providers: Provider[] };
      setProviders(result.providers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Providers could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return (
    <Screen testID="booking.discover.screen" style={styles.content}>
      <PatientHeader
        eyebrow="FIND CARE"
        title="Book a consultation"
        subtitle="Search verified clinicians by name or specialty."
      />
      <TextField
        label="Search providers"
        accessibilityLabel="Search providers"
        onChangeText={(text) => {
          setSearch(text);
          void load(text);
        }}
        placeholder="Name or specialty"
        returnKeyType="search"
        testID="booking.search"
        value={search}
      />
      {loading && providers === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Finding clinicians…</Text>
        </View>
      ) : error ? (
        <StateNotice
          title="Providers could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load(search)}
        />
      ) : providers?.length ? (
        <View style={styles.list}>
          {providers.map((provider) => (
            <Pressable
              key={provider.id}
              accessibilityRole="button"
              accessibilityLabel={`Book with ${providerName(provider)}`}
              onPress={() => router.push(`./${provider.id}` as const)}
              style={styles.card}
              testID={`booking.provider-${provider.id}`}
            >
              <View style={styles.icon}>
                <Stethoscope color={colors.blue700} size={22} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.provider}>{providerName(provider)}</Text>
                <Text style={styles.specialty}>
                  {provider.providerProfile?.specialty || 'General care'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View testID="booking.empty">
          <StateNotice title="No clinicians found" message="Try a different name or specialty." />
        </View>
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
  provider: { ...typography.bodyStrong, color: colors.navy900 },
  specialty: { ...typography.caption, color: colors.slate600 },
});
