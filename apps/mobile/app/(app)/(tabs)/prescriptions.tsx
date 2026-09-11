import { ClipboardList, Pill, UserRound } from 'lucide-react-native';
import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import type { Prescription } from '@/features/prescriptions/types';
import { apiClient } from '@/lib/api/client';
import { useRemoteResource } from '@/lib/use-remote-resource';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

function prescriberName(prescription: Prescription): string {
  const profile = prescription.provider?.providerProfile;
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || prescription.provider?.email || 'Ricton clinician';
}

export default function PrescriptionsScreen() {
  const load = useCallback(() => apiClient.get<Prescription[]>('/prescriptions'), []);
  const resource = useRemoteResource(load);

  return (
    <Screen testID="patient.prescriptions.screen" style={styles.content}>
      <PatientHeader eyebrow="MEDICATION" title="Prescriptions" subtitle="Clinical instructions exactly as issued by your care team." />
      {resource.loading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.blue600} /><Text style={styles.loadingText}>Loading prescriptions…</Text></View>
      ) : resource.error ? (
        <StateNotice title="Prescriptions could not be loaded" message={resource.error} actionLabel="Try again" onAction={resource.reload} />
      ) : resource.data?.length ? (
        <View style={styles.list}>
          {resource.data.map((prescription) => (
            <View key={prescription.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.icon}><ClipboardList color={colors.blue700} size={22} /></View>
                <View style={styles.cardCopy}>
                  <Text style={styles.date}>Issued {new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(prescription.createdAt))}</Text>
                  <View style={styles.prescriberRow}><UserRound color={colors.slate600} size={15} /><Text style={styles.prescriber}>{prescriberName(prescription)}</Text></View>
                </View>
                <View style={styles.status}><Text style={styles.statusText}>{prescription.status}</Text></View>
              </View>
              <View style={styles.rule} />
              {prescription.items.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.item}>
                  <Pill color={colors.slate600} size={17} />
                  <View style={styles.itemCopy}>
                    <Text style={styles.drug}>{item.drugName} · {item.dosage}</Text>
                    <Text style={styles.instructions}>{item.frequency} for {item.duration}</Text>
                  </View>
                </View>
              ))}
              {prescription.items.length > 3 ? <Text style={styles.more}>+{prescription.items.length - 3} more medicines</Text> : null}
            </View>
          ))}
        </View>
      ) : (
        <StateNotice title="No prescriptions" message="Signed prescriptions from your clinicians will be shown here." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[6] },
  loading: { paddingVertical: spacing[12], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  list: { gap: spacing[4] },
  card: { ...cardShadow, borderWidth: 1, borderColor: colors.slate200, borderRadius: radii.lg, backgroundColor: colors.white, padding: spacing[4], gap: spacing[3] },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  date: { ...typography.bodyStrong, color: colors.navy900 },
  prescriberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  prescriber: { ...typography.caption, color: colors.slate600 },
  status: { borderRadius: radii.round, backgroundColor: colors.emerald100, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  statusText: { ...typography.caption, color: colors.emerald700, fontSize: 11, textTransform: 'capitalize' },
  rule: { height: 1, backgroundColor: colors.slate100 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  itemCopy: { flex: 1 },
  drug: { ...typography.label, color: colors.slate900 },
  instructions: { ...typography.caption, color: colors.slate600 },
  more: { ...typography.caption, color: colors.blue700, marginLeft: spacing[8] },
});
