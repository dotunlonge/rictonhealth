import { useLocalSearchParams } from 'expo-router';
import { Pill } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import { prescriptionService } from '@/features/prescriptions/prescription-service';
import type { Prescription } from '@/features/prescriptions/types';
import { colors, cardShadow, radii, spacing, typography } from '@/theme/tokens';

export default function PrescriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPrescription((await prescriptionService.detail(String(id))) as Prescription);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Prescription could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen testID="patient.prescription-detail.screen" style={styles.content}>
      <PatientHeader
        eyebrow="MEDICATION"
        title="Prescription detail"
        subtitle="Items, dosage, and status exactly as issued."
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading prescription…</Text>
        </View>
      ) : error && !prescription ? (
        <StateNotice
          title="Prescription could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : prescription ? (
        <View style={styles.card}>
          <View style={[styles.status, prescription.status !== 'SIGNED' && styles.statusPending]}>
            <Text style={styles.statusText}>{prescription.status}</Text>
          </View>
          {prescription.items.map((item) => (
            <View key={item.id} style={styles.item}>
              <Pill color={colors.slate600} size={17} />
              <View style={styles.itemCopy}>
                <Text style={styles.drug}>
                  {item.drugName} · {item.dosage}
                </Text>
                <Text style={styles.instructions}>
                  {item.frequency} for {item.duration}
                </Text>
              </View>
            </View>
          ))}
          {prescription.notes ? <Text style={styles.notes}>{prescription.notes}</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[6] },
  loading: { paddingVertical: spacing[12], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  card: {
    ...cardShadow,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[3],
  },
  status: {
    alignSelf: 'flex-start',
    borderRadius: radii.round,
    backgroundColor: colors.emerald100,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  statusPending: {
    backgroundColor: colors.amber100,
  },
  statusText: {
    ...typography.caption,
    color: colors.emerald700,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  itemCopy: { flex: 1 },
  drug: { ...typography.label, color: colors.slate900 },
  instructions: { ...typography.caption, color: colors.slate600 },
  notes: { ...typography.caption, color: colors.slate600 },
});
