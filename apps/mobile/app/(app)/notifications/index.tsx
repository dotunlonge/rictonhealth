import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import { notificationService } from '@/features/notifications/notification-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  isRead: boolean;
}

interface Preferences {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, preferences] = await Promise.all([
        notificationService.list() as Promise<{ notifications: NotificationItem[] }>,
        notificationService.preferences(),
      ]);
      setItems(list.notifications);
      setPrefs(preferences);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Notifications could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const readAll = async () => {
    await notificationService.markAllRead();
    setItems((current) => (current ?? []).map((item) => ({ ...item, isRead: true })));
  };

  const togglePush = async () => {
    const next = !(prefs?.pushEnabled ?? false);
    const updated = (await notificationService.updatePreferences({
      pushEnabled: next,
    })) as Preferences;
    setPrefs({ ...prefs, ...updated, pushEnabled: updated.pushEnabled ?? next });
  };

  return (
    <Screen testID="notifications.screen" style={styles.content}>
      <PatientHeader
        eyebrow="UPDATES"
        title="Notifications"
        subtitle="Reminders and care updates."
      />
      {items === null && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading notifications…</Text>
        </View>
      ) : error ? (
        <StateNotice
          title="Notifications could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : (
        <>
          <View style={styles.row}>
            <PrimaryButton
              label="Mark all read"
              onPress={() => void readAll()}
              testID="notifications.read-all"
            />
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: prefs?.pushEnabled ?? false }}
            onPress={() => void togglePush()}
            style={styles.prefRow}
            testID="notifications.push-toggle"
          >
            <Text style={styles.prefLabel}>Push notifications</Text>
            <Text style={styles.prefValue}>{prefs?.pushEnabled ? 'On' : 'Off'}</Text>
          </Pressable>
          {items?.length ? (
            <View style={styles.list}>
              {items.map((item) => (
                <View
                  key={item.id}
                  style={[styles.card, !item.isRead && styles.cardUnread]}
                  testID={`notifications.item-${item.id}`}
                >
                  <Text style={styles.title}>{item.title}</Text>
                  {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <StateNotice title="All caught up" message="New updates will appear here." />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  row: { gap: spacing[3] },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
  },
  prefLabel: { ...typography.bodyStrong, color: colors.navy900 },
  prefValue: { ...typography.bodyStrong, color: colors.blue700 },
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
  cardUnread: { borderColor: colors.blue600 },
  title: { ...typography.bodyStrong, color: colors.navy900 },
  body: { ...typography.caption, color: colors.slate600 },
});
