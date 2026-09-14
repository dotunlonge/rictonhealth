import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
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
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingBody, setPendingBody] = useState<string | null>(null);
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

  const send = async (body: string) => {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await messagingService.sendMessage(
        { conversationId: String(conversationId), body: body.trim() },
        { idempotencyKey: newIdempotencyKey() }
      );
      setDraft('');
      setPendingBody(null);
      await load();
    } catch (caught) {
      setPendingBody(body);
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
          {(messages ?? []).map((message) => (
            <View key={message.id} style={styles.bubble} testID={`messages.msg-${message.id}`}>
              <Text style={styles.body}>{message.body}</Text>
            </View>
          ))}
        </View>
      )}
      {error && messages !== null ? (
        <View testID="messages.send-error" style={styles.stack}>
          <Text style={styles.error}>{error}</Text>
          <PrimaryButton
            label="Retry send"
            onPress={() => pendingBody && void send(pendingBody)}
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
  bubble: {
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: spacing[3],
  },
  body: { ...typography.body, color: colors.slate900 },
  stack: { gap: spacing[2] },
  error: { ...typography.caption, color: colors.rose700 },
});
