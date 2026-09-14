import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { accountService } from '@/features/account/account-service';
import { spacing, typography } from '@/theme/tokens';
import { colors } from '@/theme/tokens';

export default function MedicalHistoryScreen() {
  const [conditions, setConditions] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const list = conditions
      .split(/[\n,]+/)
      .map((c) => c.trim())
      .filter(Boolean)
      .map((condition) => ({ condition }));
    if (list.length === 0) {
      setError('Add at least one condition, or leave care to your next visit.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await accountService.updateMedicalHistory(list);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'History could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="account.history.screen" style={styles.content}>
      <PatientHeader
        eyebrow="HEALTH RECORD"
        title="Medical history"
        subtitle="Conditions, one per line or comma-separated."
      />
      <TextField
        label="Conditions"
        accessibilityLabel="Conditions"
        multiline
        numberOfLines={4}
        onChangeText={setConditions}
        placeholder="Hypertension, Asthma"
        testID="account.conditions"
        value={conditions}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Save history"
        loading={saving}
        onPress={() => void save()}
        testID="account.save-history"
      />
      {saved ? (
        <Text testID="account.history-saved" style={styles.saved}>
          History saved.
        </Text>
      ) : (
        <StateNotice
          title="Clinician-verified"
          message="Your care team reviews everything you add here."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  error: { ...typography.caption, color: colors.rose700 },
  saved: { ...typography.bodyStrong, color: colors.emerald700 },
});
