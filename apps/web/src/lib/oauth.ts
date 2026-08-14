import { api } from './api-client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (notification?: unknown) => void;
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

export async function loginWithGoogleToken(token: string, role?: string) {
  const res = await api.post('/auth/oauth/google', { token, role });
  if (res.success && res.data) {
    if (res.data.token) {
      localStorage.setItem('ricton_token', res.data.token as string);
    }
    if (res.data.refreshToken) {
      localStorage.setItem('ricton_refresh_token', res.data.refreshToken as string);
    }
  }
  return res;
}

export async function loginWithAppleToken(token: string, role?: string) {
  const res = await api.post('/auth/oauth/apple', { token, role });
  if (res.success && res.data) {
    if (res.data.token) {
      localStorage.setItem('ricton_token', res.data.token as string);
    }
    if (res.data.refreshToken) {
      localStorage.setItem('ricton_refresh_token', res.data.refreshToken as string);
    }
  }
  return res;
}

export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

export async function triggerGoogleAuth(role: string = 'PATIENT'): Promise<any> {
  await loadScript('https://accounts.google.com/gsi/client');
  return new Promise((resolve, reject) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      reject(new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable is missing'));
      return;
    }

    if (!window.google?.accounts?.id) {
      reject(new Error('Google Accounts SDK failed to load'));
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential?: string }) => {
        if (response.credential) {
          try {
            const res = await loginWithGoogleToken(response.credential, role);
            resolve(res);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('No Google credential returned'));
        }
      },
    });

    window.google.accounts.id.prompt();
  });
}

export async function triggerAppleAuth(role: string = 'PATIENT'): Promise<any> {
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

  return await loginWithAppleToken(idToken, role);
}
