'use client';

import { useEffect, useRef, useState } from 'react';
import { loadScript } from '@/lib/oauth';

type GoogleSignInButtonProps = {
  onCredential: (credential: string) => void | Promise<void>;
  onError: (message: string) => void;
  busy?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
};

export default function GoogleSignInButton({
  onCredential,
  onError,
  busy = false,
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandlerRef = useRef(onCredential);
  const errorHandlerRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
    errorHandlerRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    let cancelled = false;

    async function initializeGoogleButton() {
      try {
        setReady(false);
        setFailed(false);
        await loadScript('https://accounts.google.com/gsi/client');
        if (cancelled) return;

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
        const googleIdentity = window.google?.accounts.id;
        const container = containerRef.current;
        if (!clientId) {
          throw new Error('Google Sign-In is not configured for this deployment.');
        }
        if (!googleIdentity || !container) {
          throw new Error('Google Sign-In could not be loaded. Check your connection and retry.');
        }

        googleIdentity.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              void credentialHandlerRef.current(response.credential);
            } else {
              errorHandlerRef.current('Google did not return an identity credential.');
            }
          },
        });
        container.replaceChildren();
        googleIdentity.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(400, Math.max(240, Math.floor(container.clientWidth || 400))),
        });

        // GIS normally inserts its iframe synchronously. Give it one short
        // rendering window so an invalid OAuth origin cannot masquerade as a
        // clickable, empty container forever.
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        if (cancelled) return;
        if (!container.firstElementChild) {
          throw new Error(
            `Google Sign-In could not render for ${window.location.origin}. Verify this exact origin in the Google OAuth client.`
          );
        }
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setReady(false);
          setFailed(true);
          errorHandlerRef.current(
            error instanceof Error ? error.message : 'Google Sign-In could not be loaded.'
          );
        }
      }
    }

    void initializeGoogleButton();
    return () => {
      cancelled = true;
    };
  }, [attempt, text]);

  const retry = () => {
    errorHandlerRef.current('');
    containerRef.current?.replaceChildren();
    setReady(false);
    setFailed(false);
    setAttempt((current) => current + 1);
  };

  return (
    <div
      className={`relative mx-auto flex h-14 w-full max-w-[400px] items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm ${busy ? 'pointer-events-none opacity-70' : ''}`}
      aria-busy={busy}
    >
      <div ref={containerRef} className="flex w-full items-center justify-center" />
      {!ready && !failed && !busy && (
        <span className="absolute text-sm font-semibold text-slate-500" role="status">
          Loading Google sign-in…
        </span>
      )}
      {failed && !busy && (
        <button
          type="button"
          onClick={retry}
          className="absolute inset-0 flex cursor-pointer items-center justify-center gap-3 bg-white text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1c7bcf] active:bg-slate-100"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 4.98-.9 6.64-2.37l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
            />
            <path
              fill="#FBBC05"
              d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z"
            />
          </svg>
          Retry Google sign-in
        </button>
      )}
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-white/95 text-sm font-bold text-slate-700">
          Signing in with Google…
        </span>
      )}
    </div>
  );
}
