import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandMark, PrimaryButton } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { colors, spacing, typography } from '@/theme/tokens';

export function SessionGate() {
  const { status, recoveryMessage, retryRestore } = useSession();

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <BrandMark />
      <Text style={styles.name}>Ricton Health</Text>
      {status === 'booting' ? (
        <>
          <ActivityIndicator color={colors.blue600} size="small" />
          <Text style={styles.message}>Securing your care workspace…</Text>
        </>
      ) : (
        <View style={styles.recovery}>
          <Text style={styles.message}>{recoveryMessage}</Text>
          <PrimaryButton label="Try again" onPress={() => void retryRestore()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    backgroundColor: colors.canvas,
  },
  name: { ...typography.title, color: colors.navy900 },
  message: { ...typography.body, color: colors.slate600, textAlign: 'center' },
  recovery: { width: '100%', maxWidth: 420, gap: spacing[5] },
});
