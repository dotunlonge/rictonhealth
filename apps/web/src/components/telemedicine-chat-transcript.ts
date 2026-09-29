/**
 * Visit chat transcript persistence (#57).
 *
 * The in-call chat is LiveKit `publishData` (ephemeral). This helper persists
 * the transcript per room on this device (localStorage, capped at 200
 * messages) and exports it as .txt. Messaging-service persistence + export is
 * the follow-up; the subtitle in the call UI must stay honest ("saved on this
 * device only") until then.
 */

export type TranscriptMessage = {
  id: string;
  sender: string;
  text: string;
  sentAt: string;
};

const keyFor = (roomId: string) => `ricton:chat:${roomId}`;

export function loadTranscript(roomId: string): TranscriptMessage[] {
  try {
    const raw = localStorage.getItem(keyFor(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TranscriptMessage[];
    return Array.isArray(parsed) ? parsed.slice(-200) : [];
  } catch {
    return [];
  }
}

export function saveTranscript(roomId: string, messages: TranscriptMessage[]): void {
  try {
    localStorage.setItem(keyFor(roomId), JSON.stringify(messages.slice(-200)));
  } catch {
    // best-effort only (private mode / quota)
  }
}

export function exportTranscript(roomId: string, messages: TranscriptMessage[]): void {
  const lines = messages.map((m) => `[${m.sentAt}] ${m.sender}: ${m.text}`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ricton-chat-${roomId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
