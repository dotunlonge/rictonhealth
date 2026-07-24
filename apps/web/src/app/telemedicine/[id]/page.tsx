'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function TelemedicineRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    async function loadRoomToken() {
      const res = await api.get(`/telemedicine/rooms/${id}/token`);
      if (res.success && res.data?.token) {
        setToken(res.data.token);
      } else {
        setErrorMsg(res.error?.message || 'Failed to retrieve video session token.');
      }
      setLoading(false);
    }
    loadRoomToken();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Room Header */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-teal-600 rounded-xl font-bold">📹</span>
          <div>
            <h1 className="font-bold text-sm">Virtual Consultation Room</h1>
            <p className="text-[10px] text-slate-400">Session ID: {id}</p>
          </div>
        </div>
        <Link
          href="/appointments"
          className="px-4 py-1.5 bg-red-600 hover:bg-red-700 font-semibold rounded-xl text-xs transition-colors"
        >
          Leave Call
        </Link>
      </header>

      {/* Video Viewport Area */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center relative">
        {loading ? (
          <p className="text-slate-400 text-sm">Connecting to secure video gateway...</p>
        ) : errorMsg ? (
          <div className="bg-red-950/50 border border-red-800 p-6 rounded-2xl text-center max-w-md">
            <p className="text-red-400 text-sm">{errorMsg}</p>
            <Link
              href="/appointments"
              className="mt-4 inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl"
            >
              Return to Appointments
            </Link>
          </div>
        ) : (
          <div className="w-full max-w-5xl h-[520px] bg-slate-900 rounded-3xl border border-slate-800 relative flex items-center justify-center overflow-hidden shadow-2xl">
            {/* Remote Doctor Feed Placeholder */}
            {isVideoOff ? (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-2xl">
                  Dr
                </div>
                <p className="text-xs">Camera Turned Off</p>
              </div>
            ) : (
              <div className="text-center text-slate-400 space-y-2">
                <div className="w-24 h-24 rounded-full bg-teal-900/40 text-teal-400 border border-teal-700/50 flex items-center justify-center font-bold text-3xl mx-auto">
                  🩺
                </div>
                <p className="font-semibold text-sm text-slate-200">Doctor's Video Feed Active</p>
                <p className="text-xs text-slate-500">WebRTC Encrypted Connection</p>
              </div>
            )}

            {/* Self PIP Viewport */}
            <div className="absolute bottom-6 right-6 w-48 h-32 bg-slate-950 rounded-2xl border border-slate-700 flex items-center justify-center shadow-lg">
              <span className="text-xs text-slate-400">You (Patient)</span>
            </div>
          </div>
        )}
      </main>

      {/* Control Bar */}
      <footer className="px-6 py-4 border-t border-slate-800 flex items-center justify-center gap-4">
        <button
          onClick={() => setIsMicMuted(!isMicMuted)}
          className={`p-3.5 rounded-2xl font-bold text-xs transition-colors ${
            isMicMuted ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
        >
          {isMicMuted ? '🔇 Muted' : '🎙️ Mic On'}
        </button>
        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          className={`p-3.5 rounded-2xl font-bold text-xs transition-colors ${
            isVideoOff ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
        >
          {isVideoOff ? '📷 Cam Off' : '📹 Cam On'}
        </button>
      </footer>
    </div>
  );
}
