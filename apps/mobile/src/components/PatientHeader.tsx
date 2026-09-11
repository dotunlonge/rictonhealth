import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/ui';
import { colors, spacing, typography } from '@/theme/tokens';

export function PatientHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <BrandMark compact />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[4], paddingTop: spacing[4] },
  copy: { flex: 1, gap: 2 },
  eyebrow: { ...typography.caption, color: colors.blue700, letterSpacing: 1.1 },
  title: { ...typography.title, color: colors.navy950 },
  subtitle: { ...typography.caption, color: colors.slate600, marginTop: spacing[1] },
});
