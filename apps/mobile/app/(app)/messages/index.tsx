import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice } from '@/components/ui';
import { messagingService } from '@/features/messaging/messaging-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface Conversation {
  id: string;
  title?: string | null;
  participants?: Array<{
    user?: {
      email?: string | null;
      providerProfile?: { firstName?: string | null; lastName?: string | null } | null;
    } | null;
  }>;
  messages?: Array<{ body?: string | null }>;
  unreadCount?: number;
}

function conversationName(conv: Conversation): string {
  if (conv.title) return conv.title;
  for (const p of conv.participants ?? []) {
    const full = [p.user?.providerProfile?.firstName, p.user?.providerProfile?.lastName]
      .filter(Boolean)
      .join(' ');
    if (full) return full;
    if (p.user?.email) return p.user.email;
  }
  return 'Conversation';
}

export default function InboxScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = (await messagingService.conversations()) as { conversations: Conversation[] };
      setConversations(result.conversations);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Messages could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen testID="messages.inbox.screen" style={styles.content}>
      <PatientHeader eyebrow="MESSAGES" title="Inbox" subtitle="Secure chat with your care team." />
      {conversations === null && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading messages…</Text>
        </View>
      ) : error ? (
        <StateNotice
          title="Messages could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : conversations?.length ? (
        <View style={styles.list}>
          {conversations.map((conv) => (
            <Pressable
              key={conv.id}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${conversationName(conv)}`}
              onPress={() => router.push(`./${conv.id}` as const)}
              style={styles.card}
              testID={`messages.conv-${conv.id}`}
            >
              <View style={styles.icon}>
                <MessageCircle color={colors.blue700} size={22} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.name}>{conversationName(conv)}</Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {conv.messages?.[0]?.body || 'No messages yet'}
                </Text>
              </View>
              {(conv.unreadCount ?? 0) > 0 ? (
                <View style={styles.dot} testID={`messages.unread-${conv.id}`} />
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <View testID="messages.empty">
          <StateNotice title="No messages" message="Your care team will reach you here." />
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
  name: { ...typography.bodyStrong, color: colors.navy900 },
  preview: { ...typography.caption, color: colors.slate600 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue600 },
});
