'use client';

/**
 * Telemedicine safety panel (#54 blind-doctor, #55 emergency).
 *
 * Standalone clinical context panel: allergies / history / meds + emergency
 * SOS card. Best-effort fetch — never breaks the call.
 *
 * WIRING (one import in the video room page):
 *   import { TelemedicineSafetyPanel } from '@/components/telemedicine-safety-panel';
 *   {roomInfo && <TelemedicineSafetyPanel roomId={id} />}
 *
 * NOTE: kept as a separate module (not inlined in
 * `app/telemedicine/[id]/page.tsx`) so it can evolve without touching the
 * RTC lifecycle in the room page.
 */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

export type PatientSafetyCtx = {
  allergies: string[];
  history: string;
  meds: string[];
  emergencyContact: { name?: string; phone?: string } | null;
};

export function TelemedicineSafetyPanel({ roomId }: { roomId: string }) {
  const [ctx, setCtx] = useState<PatientSafetyCtx | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const parts = await api.get<{
          participants?: Array<{ userId: string; role?: string }>;
        }>(`/telemedicine/rooms/${roomId}/participants`);
        const list = parts.data?.participants ?? [];
        const patientIds = list.filter((x) => x.role === 'PATIENT').map((x) => x.userId);
        if (patientIds.length !== 1) return;
        const res = await api.get<{
          patientProfile?: {
            allergies?: string[];
            medicalHistory?: Array<{ condition?: string }> | string;
            emergencyContact?: { name?: string; phone?: string } | null;
          };
          prescriptionsAsPatient?: Array<{ items?: Array<{ drugName?: string }> }>;
        }>(`/users/patients/${patientIds[0]}`);
        const prof = res.data?.patientProfile;
        if (!prof || cancelled) return;
        const allergies = Array.isArray(prof.allergies) ? prof.allergies : [];
        const history = Array.isArray(prof.medicalHistory)
          ? prof.medicalHistory
              .map((h) => h.condition ?? '')
              .filter(Boolean)
              .join('; ')
          : String(prof.medicalHistory ?? '');
        const meds = (res.data?.prescriptionsAsPatient ?? [])
          .flatMap((rx) => rx.items ?? [])
          .map((it) => it.drugName ?? '')
          .filter(Boolean);
        setCtx({
          allergies,
          history,
          meds,
          emergencyContact: prof.emergencyContact ?? null,
        });
      } catch {
        // video must never break on context fetch
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (!ctx) return null;
  if (!open) return null;

  return (
    <aside
      className="absolute inset-y-3 left-3 z-20 flex w-[min(20rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-900/95 text-slate-100 shadow-2xl"
      aria-label="Patient safety context"
    >
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2">
        <h2 className="text-sm font-bold">Patient safety</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Hide safety panel"
        >
          Hide
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
        <div>
          <p className="font-bold text-amber-300">Allergies</p>
          <p>{ctx.allergies.length ? ctx.allergies.join(', ') : 'None recorded'}</p>
        </div>
        <div>
          <p className="font-bold text-amber-300">History</p>
          <p className="whitespace-pre-wrap break-words">{ctx.history || 'None recorded'}</p>
        </div>
        <div>
          <p className="font-bold text-amber-300">Meds</p>
          <p>{ctx.meds.length ? ctx.meds.join(', ') : 'None recorded'}</p>
        </div>
        {ctx.emergencyContact && (
          <div className="rounded-xl border border-red-500/40 p-2">
            <p className="font-bold text-red-300">Emergency</p>
            <p>
              {ctx.emergencyContact.name ?? 'Contact'}
              {ctx.emergencyContact.phone ? ` — ${ctx.emergencyContact.phone}` : ''}
            </p>
            {ctx.emergencyContact.phone && (
              <a className="font-bold underline" href={`tel:${ctx.emergencyContact.phone}`}>
                SOS call now
              </a>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
