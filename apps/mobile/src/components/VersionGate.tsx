import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark, PrimaryButton } from '@/components/ui';
import {
  currentAppVersion,
  fetchVersionInfo,
  isUpdateRequired,
} from '@/lib/version';
import { colors, spacing, typography } from '@/theme/tokens';

/**
 * #107 Force-update gate hook. Fetches GET /version on mount; `blocked` is
 * true only when the running build is confirmed below minSupported.
 * Fail-open: while checking or on network error the app proceeds normally
 * so an offline or unhealthy version endpoint never bricks the app.
 */
export function useVersionGate(): { blocked: boolean; retry: () => void } {
  const [blocked, setBlocked] = useState(false);

  const retry = useCallback(() => {
    void (async () => {
      try {
        const info = await fetchVersionInfo();
        setBlocked(isUpdateRequired(currentAppVersion(), info));
      } catch {
        setBlocked(false);
      }
    })();
  }, []);

  useEffect(() => {
    retry();
  }, [retry]);

  return { blocked, retry };
}

/** Blocking card rendered instead of the navigator when an update is required. */
export function UpdateRequiredCard({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.container} testID="update-required-card">
      <BrandMark />
      <Text style={styles.title}>Update required</Text>
      <Text style={styles.message}>
        This version of Ricton Health is no longer supported. Please update to the latest
        version to continue your care securely.
      </Text>
      <View style={styles.action}>
        <PrimaryButton label="Check again" onPress={onRetry} testID="update-required-retry" />
      </View>
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
  title: { ...typography.title, color: colors.navy900, textAlign: 'center' },
  message: { ...typography.body, color: colors.slate600, textAlign: 'center' },
  action: { width: '100%', maxWidth: 420 },
});
