import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { accountService } from '@/features/account/account-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface Address {
  id: string;
  label?: string;
  city?: string;
  isDefault?: boolean;
}

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [label, setLabel] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAddresses((await accountService.listAddresses()) as Address[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Addresses could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!label.trim() || !city.trim()) {
      setError('Label and city are required.');
      return;
    }
    setSaving(true);
    try {
      await accountService.createAddress({ label: label.trim(), city: city.trim() });
      setLabel('');
      setCity('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Address could not be added.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await accountService.deleteAddress(id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Address could not be removed.');
    }
  };

  return (
    <Screen testID="account.addresses.screen" style={styles.content}>
      <PatientHeader
        eyebrow="ADDRESSES"
        title="Delivery addresses"
        subtitle="Used for home-delivery orders."
      />
      {addresses === null && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading addresses…</Text>
        </View>
      ) : error && addresses === null ? (
        <StateNotice
          title="Addresses could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.list}>
          {(addresses ?? []).map((address) => (
            <View key={address.id} style={styles.card} testID={`account.addr-${address.id}`}>
              <View style={styles.cardCopy}>
                <Text style={styles.label}>
                  {address.label || 'Address'}
                  {address.isDefault ? ' · Default' : ''}
                </Text>
                <Text style={styles.city}>{address.city}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${address.label || 'address'}`}
                onPress={() => void remove(address.id)}
                testID={`account.addr-delete-${address.id}`}
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {error && addresses !== null ? <Text style={styles.error}>{error}</Text> : null}
      <TextField
        label="Label"
        placeholder="Home"
        value={label}
        onChangeText={setLabel}
        testID="account.addr-label"
      />
      <TextField
        label="City"
        placeholder="Lagos"
        value={city}
        onChangeText={setCity}
        testID="account.addr-city"
      />
      <PrimaryButton
        label="Add address"
        loading={saving}
        onPress={() => void add()}
        testID="account.addr-add"
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  cardCopy: { flex: 1 },
  label: { ...typography.bodyStrong, color: colors.navy900 },
  city: { ...typography.caption, color: colors.slate600 },
  remove: { ...typography.bodyStrong, color: colors.rose700 },
  error: { ...typography.caption, color: colors.rose700 },
});
