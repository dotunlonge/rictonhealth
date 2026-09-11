'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import {
  ConnectionQuality,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client';

type RoomInfo = {
  id: string;
  externalRoomId: string;
};

type TokenResponse = {
  token: string;
  serverUrl: string;
  room: RoomInfo;
};

type UserSummary = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  sentAt: string;
  mine: boolean;
};

function attachMediaTrack(track: RemoteTrack, container: HTMLDivElement) {
  const element = track.attach();
  if (track.kind === Track.Kind.Video) {
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'cover';
  } else {
    element.style.display = 'none';
  }
  container.appendChild(element);
}

function detachMediaTrack(track: RemoteTrack) {
  track.detach().forEach((element) => element.remove());
}

function subscribedTrack(publication: RemoteTrackPublication) {
  return publication.track;
}

function ParticipantTile({ participant }: { participant: RemoteParticipant }) {
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mediaRef.current;
    if (!container) return;

    const onSubscribed = (track: RemoteTrack) => attachMediaTrack(track, container);
    const onUnsubscribed = (track: RemoteTrack) => detachMediaTrack(track);
    participant.trackPublications.forEach((publication) => {
      const track = subscribedTrack(publication);
      if (track) onSubscribed(track);
    });
    participant.on(RoomEvent.TrackSubscribed, onSubscribed);
    participant.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);

    return () => {
      participant.off(RoomEvent.TrackSubscribed, onSubscribed);
      participant.off(RoomEvent.TrackUnsubscribed, onUnsubscribed);
      participant.trackPublications.forEach((publication) => {
        const track = subscribedTrack(publication);
        if (track) detachMediaTrack(track);
      });
    };
  }, [participant]);

  return (
    <div className="relative min-h-64 overflow-hidden rounded-2xl bg-slate-900">
      <div ref={mediaRef} className="absolute inset-0" />
      <div className="absolute bottom-2 left-3 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white">
        {participant.identity}
      </div>
    </div>
  );
}

function parseChatMessage(data: Uint8Array | string, sender: string): ChatMessage | null {
  try {
    const raw = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const parsed = JSON.parse(raw) as Partial<ChatMessage> & { type?: string };
    if (parsed.type !== 'ricton-chat' || typeof parsed.text !== 'string') return null;
    const text = parsed.text.trim().slice(0, 1000);
    if (!text) return null;
    return {
      id: typeof parsed.id === 'string' ? parsed.id : crypto.randomUUID(),
      sender: typeof parsed.sender === 'string' ? parsed.sender.slice(0, 100) : sender,
      text,
      sentAt: typeof parsed.sentAt === 'string' ? parsed.sentAt : new Date().toISOString(),
      mine: false,
    };
  } catch {
    return null;
  }
}

export default function TelemedicineRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [duration, setDuration] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting'>('connected');
  const [networkQuality, setNetworkQuality] = useState<number>(0);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localDisplayNameRef = useRef('You');

  useEffect(() => {
    const livekitRoom = new Room();
    let cancelled = false;

    async function connect() {
      setConnecting(true);
      try {
        // Fetch user profile
        const profileRes = await api.get<UserSummary>('/users/me');
        if (profileRes.success && profileRes.data) {
          localDisplayNameRef.current =
            [profileRes.data.firstName, profileRes.data.lastName].filter(Boolean).join(' ') ||
            profileRes.data.email ||
            'You';
        }

        // Fetch LiveKit credentials from our backend (POST /telemedicine/rooms/:id/token)
        const tokenRes = await api.post<TokenResponse>(`/telemedicine/rooms/${id}/token`);
        if (!tokenRes.success || !tokenRes.data?.token || !tokenRes.data?.serverUrl) {
          setError(tokenRes.error?.message || 'Failed to retrieve video session credentials.');
          setLoading(false);
          setConnecting(false);
          return;
        }

        const { token, serverUrl, room: roomData } = tokenRes.data;
        setRoomInfo(roomData);

        await livekitRoom.connect(serverUrl, token, { autoSubscribe: true });
        await livekitRoom.localParticipant.setMicrophoneEnabled(true);
        await livekitRoom.localParticipant.setCameraEnabled(true, {
          resolution: { width: 1280, height: 720 },
          facingMode: 'user',
        });
        if (cancelled) {
          await livekitRoom.disconnect();
          return;
        }

        const joined = await api.post(`/telemedicine/rooms/${id}/join`);
        if (!joined.success) {
          await livekitRoom.disconnect();
          throw new Error(joined.error?.message || 'Failed to confirm video session join.');
        }

        setRoom(livekitRoom);
        setLoading(false);
        setConnecting(false);
        // LiveKit data channel needs no pre-published track.
        setChatReady(true);

        setParticipants(Array.from(livekitRoom.remoteParticipants.values()));

        livekitRoom.on(RoomEvent.ParticipantConnected, (participant) => {
          setParticipants((previous) =>
            previous.some((item) => item.sid === participant.sid)
              ? previous
              : [...previous, participant]
          );
        });

        livekitRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
          setParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));
        });

        livekitRoom.on(RoomEvent.DataReceived, (payload, participant) => {
          const message = parseChatMessage(
            payload instanceof Uint8Array ? payload : new TextEncoder().encode(String(payload)),
            participant?.identity || 'Peer'
          );
          if (message) setChatMessages((previous) => [...previous, message]);
        });

        // Reconnection + network-quality UX (LiveKit auto-recovers the media;
        // we surface state so users don't stare at a frozen frame).
        livekitRoom.on(RoomEvent.Reconnecting, () => setConnectionState('reconnecting'));
        livekitRoom.on(RoomEvent.Reconnected, () => setConnectionState('connected'));
        livekitRoom.on(RoomEvent.ConnectionQualityChanged, (quality) => {
          setNetworkQuality(
            quality === ConnectionQuality.Excellent
              ? 4
              : quality === ConnectionQuality.Good
                ? 3
                : quality === ConnectionQuality.Poor
                  ? 2
                  : 1
          );
        });
        setNetworkQuality(3);

        // Start call timer
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Connection to video room failed.');
        setLoading(false);
        setConnecting(false);
      }
    }

    connect();

    return () => {
      cancelled = true;
      void livekitRoom.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  useEffect(() => {
    const container = localVideoRef.current;
    if (!room || !container) return;
    const publication = Array.from(room.localParticipant.videoTrackPublications.values()).find(
      (item) => item.source === Track.Source.Camera && item.track
    );
    if (!publication?.track) return;
    const element = publication.track.attach();
    element.style.width = '100%';
    element.style.height = '100%';
    element.style.objectFit = 'cover';
    container.appendChild(element);
    return () => publication.track?.detach().forEach((item) => item.remove());
  }, [room]);

  const toggleMute = () => {
    if (!room) return;
    room.localParticipant.audioTrackPublications.forEach((publication) => {
      const track = publication.track;
      if (!track) return;
      if (isMuted) void track.unmute();
      else void track.mute();
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!room) return;
    room.localParticipant.videoTrackPublications.forEach((publication) => {
      if (publication.source === Track.Source.ScreenShare) return;
      const track = publication.track;
      if (!track) return;
      if (isVideoOff) void track.unmute();
      else void track.mute();
    });
    setIsVideoOff(!isVideoOff);
  };

  const stopScreenShare = () => {
    if (!room) return;
    void room.localParticipant.setScreenShareEnabled(false);
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    if (!room || screenShareBusy) return;
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    setScreenShareBusy(true);
    setActionError('');
    try {
      await room.localParticipant.setScreenShareEnabled(true);
      setIsScreenSharing(true);
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : 'Screen sharing failed or was cancelled.'
      );
    } finally {
      setScreenShareBusy(false);
    }
  };

  const sendChatMessage = () => {
    const text = chatDraft.trim().slice(0, 1000);
    if (!text || !room || !chatReady) return;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      sender: localDisplayNameRef.current,
      text,
      sentAt: new Date().toISOString(),
      mine: true,
    };
    const payload = new TextEncoder().encode(JSON.stringify({ ...message, type: 'ricton-chat' }));
    room.localParticipant.publishData(payload, { reliable: true }).catch((err: unknown) => {
      setActionError(err instanceof Error ? err.message : 'Message send failed.');
    });
    setChatMessages((previous) => [...previous, message]);
    setChatDraft('');
  };

  const handleLeave = async () => {
    if (room) room.disconnect();
    // Leave marks only this participant departed; the session continues.
    await api.post(`/telemedicine/rooms/${id}/leave`);
    window.location.href = '/telemedicine';
  };

  const handleEndForAll = async () => {
    // Host-only: the backend rejects non-hosts with 403.
    const res = await api.post(`/telemedicine/rooms/${id}/end`);
    if (!res.success) {
      setActionError(res.error?.message || 'Only the host can end the session for everyone.');
      return;
    }
    if (room) room.disconnect();
    window.location.href = '/telemedicine';
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-white flex flex-col"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {/* Recording honesty: the platform never records; nothing to consent to. */}
      <div className="px-6 py-1.5 bg-slate-900 text-center text-[11px] font-semibold text-slate-400 border-b border-slate-800">
        This consultation is not recorded by Ricton. Transport is TLS-encrypted; not end-to-end
        encrypted.
      </div>

      {/* Top Bar */}
      <header className="px-6 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1877F2] rounded-xl flex items-center justify-center font-bold text-sm">
            R
          </div>
          <div>
            <h1 className="font-bold text-sm text-white">Ricton Virtual Consultation</h1>
            <p className="text-[10px] text-slate-400">
              {roomInfo ? `Room: ${roomInfo.externalRoomId}` : `Session ${id.slice(0, 8)}...`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {room && (
            <div className="flex items-center gap-2 bg-green-900/40 border border-green-700 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-300">
                {formatDuration(duration)}
              </span>
            </div>
          )}
          {room && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold"
              title={`Network quality: ${networkQuality}/5`}
            >
              {[1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className={`w-1 rounded-full ${
                    networkQuality >= bar + 1 ? 'bg-green-400' : 'bg-slate-600'
                  }`}
                  style={{ height: `${4 + bar * 3}px` }}
                />
              ))}
            </div>
          )}
          {connectionState === 'reconnecting' && (
            <div className="px-3 py-1 rounded-full bg-amber-900/60 border border-amber-700 text-xs font-bold text-amber-300 animate-pulse">
              Reconnecting…
            </div>
          )}
          <div className="text-sm text-slate-400">
            {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
          </div>
        </div>
      </header>

      {/* Video Area */}
      <main className="flex-1 relative bg-slate-950 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">
              {connecting ? 'Connecting to secure video room...' : 'Loading...'}
            </p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {/outside.*join window|no longer eligible/i.test(error) ? (
              <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-8 max-w-md text-center">
                <div className="text-4xl mb-4">🕐</div>
                <h2 className="font-bold text-lg mb-2">Waiting room</h2>
                <p className="text-sm text-slate-300 mb-6">{error}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="bg-[#1877F2] hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-colors"
                  >
                    Retry joining
                  </button>
                  <Link
                    href="/telemedicine"
                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-colors"
                  >
                    Back
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-red-950/60 border border-red-800 rounded-3xl p-8 max-w-md text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="font-bold text-lg mb-2">Connection Error</h2>
                <p className="text-sm text-red-300 mb-6">{error}</p>
                <Link
                  href="/telemedicine"
                  className="inline-block bg-[#1877F2] hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-semibold text-sm transition-colors"
                >
                  Back to Telemedicine
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Remote participant grid */}
            <div
              className="grid h-full w-full auto-rows-fr grid-cols-1 gap-3 bg-slate-950 p-3 md:grid-cols-2"
              style={{ minHeight: 'calc(100vh - 130px)' }}
            >
              {participants.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-500 md:col-span-2">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p className="text-sm font-medium">Waiting for others to join...</p>
                  <p className="text-xs text-slate-600">
                    Share your room code: <span className="font-mono text-slate-400">{id}</span>
                  </p>
                </div>
              )}
              {participants.map((participant) => (
                <ParticipantTile key={participant.sid} participant={participant} />
              ))}
            </div>

            {/* Local video — picture-in-picture */}
            <div
              ref={localVideoRef}
              className="absolute bottom-6 right-6 w-40 h-28 bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-600 shadow-2xl"
              style={{ zIndex: 10 }}
            >
              {isVideoOff && (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
              )}
              <div className="absolute bottom-1 left-2 text-[9px] text-white/70 font-medium">
                You
              </div>
            </div>

            {chatOpen && (
              <aside className="absolute inset-y-3 right-3 z-20 flex w-[min(22rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur">
                <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-bold">Call chat</h2>
                    <p className="text-[10px] text-slate-400">
                      Visible only during this live session
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-label="Close chat"
                  >
                    ✕
                  </button>
                </div>
                <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto p-4">
                  {chatMessages.length === 0 ? (
                    <p className="pt-8 text-center text-xs text-slate-500">No messages yet.</p>
                  ) : (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                          message.mine
                            ? 'ml-auto bg-[#1877F2] text-white'
                            : 'bg-slate-800 text-slate-100'
                        }`}
                      >
                        <p className="mb-1 text-[9px] font-bold opacity-70">{message.sender}</p>
                        <p className="whitespace-pre-wrap break-words">{message.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <form
                  className="flex gap-2 border-t border-slate-700 p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendChatMessage();
                  }}
                >
                  <input
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    maxLength={1000}
                    className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-[#1877F2]"
                    placeholder="Message participants"
                    aria-label="Chat message"
                  />
                  <button
                    type="submit"
                    disabled={!chatDraft.trim() || !chatReady}
                    className="rounded-xl bg-[#1877F2] px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </aside>
            )}
          </>
        )}
      </main>

      {/* Controls Bar */}
      <footer className="bg-slate-900/90 backdrop-blur-sm border-t border-slate-800 px-6 py-4">
        {actionError && (
          <div className="mx-auto mb-3 flex max-w-2xl items-center justify-between rounded-xl border border-red-800 bg-red-950/70 px-4 py-2 text-xs text-red-200">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="ml-3 font-bold"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center justify-center gap-6 max-w-lg mx-auto">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>

          {/* Leave call (self only) */}
          <button
            onClick={handleLeave}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all shadow-lg"
            title="Leave call"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.32 8.91" />
              <line x1="23" y1="1" x2="1" y2="23" />
            </svg>
          </button>

          {/* End for everyone (host only; server enforces) */}
          <button
            onClick={handleEndForAll}
            className="px-4 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center transition-all text-xs font-bold text-slate-200"
            title="End session for everyone (host only)"
          >
            End for all
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
            )}
          </button>

          {/* Screen sharing */}
          <button
            type="button"
            onClick={() => void toggleScreenShare()}
            disabled={!room || screenShareBusy}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              isScreenSharing ? 'bg-[#1877F2] hover:bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 3H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7v2H5v2h14v-2h-4v-2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H2V5h20v12z" />
              <path d="M11 10l-4 4h3v4h2v-4h3l-4-4z" />
            </svg>
          </button>

          {/* Ephemeral in-room data chat */}
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            disabled={!room || !chatReady}
            className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              chatOpen ? 'bg-[#1877F2] hover:bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
            title="Open call chat"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {chatMessages.some((message) => !message.mine) && !chatOpen && (
              <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-red-500" />
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
