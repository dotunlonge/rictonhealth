import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { messagingService } from '@/features/messaging/messaging-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

interface Message {
  id: string;
  body?: string | null;
  senderId: string;
}

function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user } = useSession();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingBody, setPendingBody] = useState<string | null>(null);
  // Stable idempotency key created once per send and reused on retry, so a
  // retry never mints a fresh key (which would duplicate the message).
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = (await messagingService.thread(String(conversationId))) as {
        messages: Message[];
      };
      setMessages(result.messages);
      await messagingService
        .markRead({ conversationId: String(conversationId) })
        .catch(() => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Conversation could not be loaded.');
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (body: string, reuseKey?: string) => {
    if (!body.trim()) return;
    // Create the temp/idempotency key once per send; retries reuse it.
    const idempotencyKey = reuseKey ?? newIdempotencyKey();
    setSending(true);
    setError(null);
    try {
      await messagingService.sendMessage(
        { conversationId: String(conversationId), body: body.trim() },
        { idempotencyKey }
      );
      setDraft('');
      setPendingBody(null);
      setPendingKey(null);
      await load();
    } catch (caught) {
      setPendingBody(body);
      setPendingKey(idempotencyKey);
      setError(caught instanceof Error ? caught.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen testID="messages.thread.screen" style={styles.content}>
      <PatientHeader
        eyebrow="CONVERSATION"
        title="Messages"
        subtitle="Only you and your care team can read these."
      />
      {messages === null && !error ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading conversation…</Text>
        </View>
      ) : error && messages === null ? (
        <StateNotice
          title="Conversation could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : (
        <View style={styles.list}>
          {(messages ?? []).length === 0 ? (
            <Text testID="messages.empty-thread" style={styles.emptyText}>
              No messages yet — say hello to start the conversation.
            </Text>
          ) : (
            (messages ?? []).map((message) => {
              const mine = user?.id ? message.senderId === user.id : false;
              return (
                <View
                  key={message.id}
                  style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                  testID={`messages.msg-${message.id}`}
                >
                  <Text style={mine ? styles.bodyMine : styles.body}>{message.body}</Text>
                </View>
              );
            })
          )}
        </View>
      )}
      {error && messages !== null ? (
        <View testID="messages.send-error" style={styles.stack}>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton
            label="Retry send"
            onPress={() => pendingBody && void send(pendingBody, pendingKey ?? undefined)}
            testID="messages.retry"
          />
        </View>
      ) : null}
      <TextField
        label="Write a message"
        accessibilityLabel="Write a message"
        onChangeText={setDraft}
        placeholder="Type here…"
        testID="messages.composer"
        value={draft}
      />
      <PrimaryButton
        label="Send"
        loading={sending}
        onPress={() => void send(draft)}
        testID="messages.send"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  list: { gap: spacing[2] },
  emptyText: { ...typography.body, color: colors.slate600, textAlign: 'center' },
  bubble: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing[3],
    maxWidth: '80%',
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.blue600, borderColor: colors.blue600 },
  bubbleTheirs: { alignSelf: 'flex-start' },
  body: { ...typography.body, color: colors.slate900 },
  bodyMine: { ...typography.body, color: colors.white },
  stack: { gap: spacing[2] },
  error: { ...typography.caption, color: colors.rose700 },
});
