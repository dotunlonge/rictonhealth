import { api } from './api-client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{ authorization?: { id_token?: string } }>;
      };
    };
  }
}

function storeSession(res: { success: boolean; data?: unknown }) {
  const data = res.data as
    | { token?: string; refreshToken?: string; user?: { role?: string } }
    | undefined;
  if (res.success && data?.token) {
    // Memory-only session (api-client); never persisted to localStorage.
    api.setToken(data.token, data.refreshToken ?? null, data.user?.role ?? null);
  }
}

export type OAuthProvider = 'google' | 'apple';

export interface PendingOAuthRoleSelection {
  email: string;
  provider: OAuthProvider;
  token: string;
}

let pendingOAuthRoleSelection: PendingOAuthRoleSelection | null = null;

/** Keep the provider credential out of URLs and persistent browser storage. */
export function setPendingOAuthRoleSelection(value: PendingOAuthRoleSelection): void {
  pendingOAuthRoleSelection = value;
}

export function getPendingOAuthRoleSelection(): PendingOAuthRoleSelection | null {
  return pendingOAuthRoleSelection;
}

export function clearPendingOAuthRoleSelection(): void {
  pendingOAuthRoleSelection = null;
}

const activeScriptLoads = new Map<string, Promise<void>>();

function providerScriptIsReady(src: string): boolean {
  if (src.includes('accounts.google.com/gsi/client')) {
    return Boolean(window.google?.accounts.id);
  }
  if (src.includes('appleid.cdn-apple.com')) {
    return Boolean(window.AppleID?.auth);
  }
  return false;
}

export async function loginWithGoogleToken(token: string, role?: string, totpCode?: string) {
  const res = await api.post('/auth/oauth/google', { token, role, totpCode });
  storeSession(res);
  return res;
}

export async function loginWithAppleToken(token: string, role?: string, totpCode?: string) {
  const res = await api.post('/auth/oauth/apple', { token, role, totpCode });
  storeSession(res);
  return res;
}

export function loadScript(src: string): Promise<void> {
  if (providerScriptIsReady(src)) {
    return Promise.resolve();
  }

  const activeLoad = activeScriptLoads.get(src);
  if (activeLoad) return activeLoad;

  // A tag can survive a failed network request. It is not proof that the SDK
  // loaded, and reusing it would make every retry a silent no-op.
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
  existing?.remove();

  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      activeScriptLoads.delete(src);
      resolve();
    };
    script.onerror = () => {
      script.remove();
      activeScriptLoads.delete(src);
      const provider = src.includes('appleid.cdn-apple.com') ? 'Apple' : 'Google';
      reject(
        new Error(`${provider} Sign-In could not be loaded. Check your connection and retry.`)
      );
    };
    document.body.appendChild(script);
  });

  activeScriptLoads.set(src, load);
  return load;
}

export async function triggerAppleAuth(role: string = 'PATIENT', totpCode?: string): Promise<any> {
  await loadScript(
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
  );
  const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_APPLE_CLIENT_ID environment variable is missing');
  }

  if (!window.AppleID) {
    throw new Error('Apple Sign-In SDK failed to load');
  }

  window.AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI: `${window.location.origin}/login`,
    usePopup: true,
  });

  const response = await window.AppleID.auth.signIn();
  const idToken = response.authorization?.id_token;
  if (!idToken) {
    throw new Error('No Apple ID token returned');
  }

  return await loginWithAppleToken(idToken, role, totpCode);
}
