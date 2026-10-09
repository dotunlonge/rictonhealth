import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { supportService } from '@/features/support/support-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
}

function asList(data: unknown): Ticket[] {
  if (Array.isArray(data)) return data as Ticket[];
  if (data && typeof data === 'object' && Array.isArray((data as { tickets?: unknown }).tickets)) {
    return (data as { tickets: Ticket[] }).tickets;
  }
  return [];
}

export default function SupportScreen() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTickets(asList(await supportService.listMine()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Tickets could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const file = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and details are required.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await supportService.file({ subject: subject.trim(), body: body.trim() });
      setSubject('');
      setBody('');
      setNotice('Ticket filed. Our team will triage it shortly.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ticket could not be filed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="account.support.screen" style={styles.content}>
      <PatientHeader
        eyebrow="SUPPORT"
        title="Help and tickets"
        subtitle="File a ticket and track its status."
      />
      {notice ? <StateNotice title="Ticket filed" message={notice} /> : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>New ticket</Text>
        <TextField
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Payment not reflecting in wallet"
          testID="support.subject"
        />
        <TextField
          label="Details"
          value={body}
          onChangeText={setBody}
          placeholder="Describe what happened and what you expected…"
          multiline
          testID="support.body"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          accessibilityLabel="File support ticket"
          label="File ticket"
          loading={saving}
          onPress={() => void file()}
          testID="support.file"
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My tickets{tickets ? ` (${tickets.length})` : ''}</Text>
        {tickets === null && !error ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.blue600} />
            <Text style={styles.loadingText}>Loading tickets…</Text>
          </View>
        ) : (tickets ?? []).length === 0 ? (
          <Text style={styles.empty}>No tickets yet. File the first one above.</Text>
        ) : (
          (tickets ?? []).map((t) => (
            <View key={t.id} style={styles.ticket} testID={`support.ticket.${t.id}`}>
              <View style={styles.ticketRow}>
                <Text style={styles.ticketSubject}>{t.subject}</Text>
                <Text style={styles.ticketStatus}>{t.status.replace('_', ' ')}</Text>
              </View>
              <Text style={styles.ticketBody}>{t.body}</Text>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[6] },
  card: {
    gap: spacing[4],
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[5],
  },
  cardTitle: { ...typography.heading, color: colors.navy900 },
  error: { ...typography.caption, color: colors.rose700 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.caption, color: colors.slate600 },
  empty: { ...typography.caption, color: colors.slate600 },
  ticket: {
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.slate100,
    padding: spacing[4],
  },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing[3] },
  ticketSubject: { ...typography.label, color: colors.navy900, flex: 1 },
  ticketStatus: { ...typography.caption, color: colors.blue700 },
  ticketBody: { ...typography.caption, color: colors.slate700 },
});
