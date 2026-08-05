'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

// Twilio Video types (loaded dynamically to avoid SSR issues)
type TwilioRoom = {
  disconnect: () => void;
  localParticipant: TwilioParticipant;
  participants: Map<string, TwilioParticipant>;
  on: (event: string, cb: (...args: any[]) => void) => void;
  off: (event: string, cb: (...args: any[]) => void) => void;
  sid: string;
  name: string;
  state: string;
};

type TwilioParticipant = {
  identity: string;
  sid: string;
  tracks: Map<string, any>;
  on: (event: string, cb: (...args: any[]) => void) => void;
  off: (event: string, cb: (...args: any[]) => void) => void;
};

type TwilioPublication = {
  track: TwilioTrack | null;
  isSubscribed: boolean;
};

type TwilioTrack = {
  kind: 'video' | 'audio';
  attach: (el?: HTMLElement) => HTMLMediaElement;
  detach: () => HTMLMediaElement[];
};

export default function TelemedicineRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = { push: (url: string) => { if (typeof window !== 'undefined') window.location.href = url; } };

  const [room, setRoom] = useState<TwilioRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [participants, setParticipants] = useState<TwilioParticipant[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Attach remote tracks from a participant to the container
  function attachParticipantTracks(participant: TwilioParticipant, container: HTMLDivElement) {
    participant.tracks.forEach((publication: TwilioPublication) => {
      if (publication.track) {
        const el = publication.track.attach();
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.objectFit = 'cover';
        container.appendChild(el);
      }
    });
  }

  function detachParticipantTracks(participant: TwilioParticipant) {
    participant.tracks.forEach((publication: TwilioPublication) => {
      if (publication.track) {
        publication.track.detach().forEach((el) => el.remove());
      }
    });
  }

  useEffect(() => {
    let twilioRoom: TwilioRoom | null = null;

    async function connect() {
      setConnecting(true);
      try {
        // Fetch user profile
        const profileRes = await api.get('/users/me');
        if (profileRes.success) setUserProfile(profileRes.data);

        // Fetch Twilio token from our backend (POST /telemedicine/rooms/:id/token)
        const tokenRes = await api.post(`/telemedicine/rooms/${id}/token`);
        if (!tokenRes.success || !tokenRes.data?.token) {
          setError(tokenRes.error?.message || 'Failed to retrieve video session credentials.');
          setLoading(false);
          setConnecting(false);
          return;
        }

        const { token, room: roomData } = tokenRes.data;
        setRoomInfo(roomData);

        // Dynamically import Twilio Video (client-side only)
        const TwilioVideo = await import('twilio-video');
        
        twilioRoom = await TwilioVideo.connect(token, {
          name: roomData.externalRoomId,
          audio: true,
          video: { width: 1280, height: 720, facingMode: 'user' },
        }) as unknown as TwilioRoom;

        setRoom(twilioRoom);
        setLoading(false);
        setConnecting(false);

        // Attach local video
        if (localVideoRef.current) {
          const localVideoTrack = Array.from(twilioRoom.localParticipant.tracks.values())
            .find((pub: any) => pub.track?.kind === 'video');
          if (localVideoTrack?.track) {
            const el = (localVideoTrack.track as TwilioTrack).attach();
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.objectFit = 'cover';
            localVideoRef.current.appendChild(el);
          }
        }

        // Handle existing remote participants
        twilioRoom.participants.forEach((participant) => {
          setParticipants((prev) => [...prev, participant]);
          if (remoteContainerRef.current) {
            attachParticipantTracks(participant, remoteContainerRef.current);
          }
          participant.on('trackSubscribed', (track: TwilioTrack) => {
            if (remoteContainerRef.current) {
              const el = track.attach();
              el.style.width = '100%';
              el.style.height = '100%';
              el.style.objectFit = 'cover';
              remoteContainerRef.current.appendChild(el);
            }
          });
        });

        // Handle new remote participants
        twilioRoom.on('participantConnected', (participant) => {
          setParticipants((prev) => [...prev, participant]);
          participant.on('trackSubscribed', (track: TwilioTrack) => {
            if (remoteContainerRef.current) {
              const el = track.attach();
              el.style.width = '100%';
              el.style.height = '100%';
              el.style.objectFit = 'cover';
              remoteContainerRef.current.appendChild(el);
            }
          });
        });

        twilioRoom.on('participantDisconnected', (participant) => {
          setParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));
          detachParticipantTracks(participant);
        });

        // Start call timer
        timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

      } catch (err: any) {
        setError(err?.message || 'Connection to video room failed.');
        setLoading(false);
        setConnecting(false);
      }
    }

    connect();

    return () => {
      if (twilioRoom) twilioRoom.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const toggleMute = () => {
    if (!room) return;
    room.localParticipant.tracks.forEach((publication: any) => {
      if (publication.track?.kind === 'audio') {
        if (isMuted) publication.track.enable();
        else publication.track.disable();
      }
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!room) return;
    room.localParticipant.tracks.forEach((publication: any) => {
      if (publication.track?.kind === 'video') {
        if (isVideoOff) publication.track.enable();
        else publication.track.disable();
      }
    });
    setIsVideoOff(!isVideoOff);
  };

  const handleLeave = async () => {
    if (room) room.disconnect();
    // Notify backend session ended
    await api.post(`/telemedicine/rooms/${id}/end`);
    window.location.href = '/telemedicine';
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Bar */}
      <header className="px-6 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1877F2] rounded-xl flex items-center justify-center font-bold text-sm">R</div>
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
              <span className="text-xs font-semibold text-green-300">{formatDuration(duration)}</span>
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
            <p className="text-slate-400 text-sm">{connecting ? 'Connecting to secure video room...' : 'Loading...'}</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
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
          </div>
        ) : (
          <>
            {/* Remote video — full screen */}
            <div
              ref={remoteContainerRef}
              className="w-full h-full bg-slate-900 flex items-center justify-center relative"
              style={{ minHeight: 'calc(100vh - 130px)' }}
            >
              {participants.length === 0 && (
                <div className="flex flex-col items-center gap-3 text-slate-500">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <p className="text-sm font-medium">Waiting for others to join...</p>
                  <p className="text-xs text-slate-600">Share your room code: <span className="font-mono text-slate-400">{id}</span></p>
                </div>
              )}
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
              <div className="absolute bottom-1 left-2 text-[9px] text-white/70 font-medium">You</div>
            </div>
          </>
        )}
      </main>

      {/* Controls Bar */}
      <footer className="bg-slate-900/90 backdrop-blur-sm border-t border-slate-800 px-6 py-4">
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            )}
          </button>

          {/* End call */}
          <button
            onClick={handleLeave}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-all shadow-lg"
            title="Leave call"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 9.88a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.32 8.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            )}
          </button>

          {/* Share screen placeholder */}
          <button
            className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-all"
            title="Share screen"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7v2H5v2h14v-2h-4v-2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H2V5h20v12z"/><path d="M11 10l-4 4h3v4h2v-4h3l-4-4z"/></svg>
          </button>

          {/* Chat placeholder */}
          <button
            className="w-12 h-12 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-all"
            title="Chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
