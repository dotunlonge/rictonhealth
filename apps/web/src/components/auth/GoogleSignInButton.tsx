'use client';

import React, { useEffect, useRef, useState } from 'react';
import { loadScript } from '@/lib/oauth';
import { GoogleGIcon, SOCIAL_BUTTON_CLASS } from './auth-ui';

type GoogleSignInButtonProps = {
  onCredential: (credential: string) => void | Promise<void>;
  onError: (message: string) => void;
  busy?: boolean;
  text?: GoogleButtonText;
};

type GoogleAccountsId = NonNullable<NonNullable<Window['google']>['accounts']['id']>;

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

const BUTTON_LABEL: Record<GoogleButtonText, string> = {
  signin_with: 'Sign in with Google',
  signup_with: 'Sign up with Google',
  continue_with: 'Continue with Google',
};

/**
 * GIS only renders fixed-width iframes (240–400px). Measure the actual grid
 * cell so the button fills its column instead of overflowing it.
 */
const MIN_BUTTON_WIDTH = 240;
const MAX_BUTTON_WIDTH = 400;

function measuredButtonWidth(container: HTMLElement) {
  const measured = Math.floor(container.clientWidth || MAX_BUTTON_WIDTH);
  return Math.min(MAX_BUTTON_WIDTH, Math.max(MIN_BUTTON_WIDTH, measured));
}

function renderGisButton(
  container: HTMLElement,
  googleIdentity: GoogleAccountsId,
  text: GoogleButtonText,
  renderedWidthRef: React.MutableRefObject<number>
) {
  const width = measuredButtonWidth(container);
  if (width === renderedWidthRef.current && container.firstElementChild) return;
  renderedWidthRef.current = width;
  container.replaceChildren();
  googleIdentity.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text,
    shape: 'rectangular',
    logo_alignment: 'left',
    width,
  });
}

export default function GoogleSignInButton({
  onCredential,
  onError,
  busy = false,
  text = 'continue_with',
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialHandlerRef = useRef(onCredential);
  const errorHandlerRef = useRef(onError);
  const googleRef = useRef<GoogleAccountsId | null>(null);
  const renderedWidthRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    credentialHandlerRef.current = onCredential;
    errorHandlerRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let debounce: number | undefined;

    async function initializeGoogleButton() {
      try {
        setReady(false);
        setFailed(false);
        renderedWidthRef.current = 0;
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
        googleRef.current = googleIdentity;
        renderGisButton(container, googleIdentity, text, renderedWidthRef);

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

        // GIS iframes are fixed-width: re-render when the grid cell resizes
        // (breakpoint change, rotation, devtools) so the button tracks its
        // column instead of overflowing the card.
        observer = new ResizeObserver(() => {
          if (debounce !== undefined) window.clearTimeout(debounce);
          debounce = window.setTimeout(() => {
            if (cancelled) return;
            const el = containerRef.current;
            const gis = googleRef.current;
            if (el && gis) renderGisButton(el, gis, text, renderedWidthRef);
          }, 150);
        });
        observer.observe(container);
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
      observer?.disconnect();
      if (debounce !== undefined) window.clearTimeout(debounce);
      googleRef.current = null;
      renderedWidthRef.current = 0;
    };
  }, [attempt, text]);

  const retry = () => {
    errorHandlerRef.current('');
    containerRef.current?.replaceChildren();
    renderedWidthRef.current = 0;
    setReady(false);
    setFailed(false);
    setAttempt((current) => current + 1);
  };

  // Google's iframe dictates its own pixels, so an exact visual match is
  // done by layering: a visual twin using the shared SocialButton geometry
  // on the bottom, with the real (transparent) GIS button overlaid on top to
  // receive clicks. Keyboard focus reveals the real button
  // (focus-within:opacity-100) so the focus ring stays honest. The visible
  // retry state is a real button since there is no GIS iframe then.
  return (
    <div
      className={`${SOCIAL_BUTTON_CLASS} cursor-pointer overflow-hidden ${busy ? 'pointer-events-none opacity-70' : ''}`}
      aria-busy={busy}
    >
      <span aria-hidden="true" className="absolute left-4">
        <GoogleGIcon />
      </span>
      <span aria-hidden="true" className="w-full text-center">
        {!ready && !failed ? 'Loading Google sign-in…' : BUTTON_LABEL[text]}
      </span>
      {!ready && !failed && !busy && (
        <span className="sr-only" role="status">
          Loading Google sign-in…
        </span>
      )}
      <div className="absolute inset-0 cursor-pointer opacity-0 focus-within:opacity-100">
        <div
          ref={containerRef}
          className="flex h-full w-full min-w-0 items-center justify-center [&_iframe]:max-w-full"
        />
      </div>
      {failed && !busy && (
        <button
          type="button"
          onClick={retry}
          className="absolute inset-0 flex cursor-pointer items-center justify-center gap-3 bg-white text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1c7bcf] active:bg-slate-100"
        >
          <span aria-hidden="true" className="absolute left-4">
            <GoogleGIcon />
          </span>
          <span className="w-full text-center">Retry Google sign-in</span>
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
