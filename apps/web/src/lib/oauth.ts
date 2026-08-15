import { api } from './api-client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (notification?: (n: any) => void) => void;
        };
        oauth2: {
          initTokenClient: (config: Record<string, unknown>) => {
            requestAccessToken: () => void;
          };
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

export async function loginWithGoogleToken(token: string, role?: string, totpCode?: string) {
  const res = await api.post('/auth/oauth/google', { token, role, totpCode });
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

export async function loginWithAppleToken(token: string, role?: string, totpCode?: string) {
  const res = await api.post('/auth/oauth/apple', { token, role, totpCode });
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

export async function triggerGoogleAuth(role?: string, totpCode?: string): Promise<any> {
  await loadScript('https://accounts.google.com/gsi/client');
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable is missing');
  }

  if (!window.google?.accounts) {
    throw new Error('Google Accounts SDK failed to load');
  }

  return new Promise((resolve, reject) => {
    // Standard OAuth2 Popup client
    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: { access_token?: string; id_token?: string }) => {
          const token = tokenResponse.id_token || tokenResponse.access_token;
          if (token) {
            try {
              const res = await loginWithGoogleToken(token, role || undefined, totpCode);
              resolve(res);
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error('No token returned from Google'));
          }
        },
        error_callback: (err: any) => reject(err),
      });
      client.requestAccessToken();
    } else {
      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (response.credential) {
            try {
              const res = await loginWithGoogleToken(
                response.credential,
                role || undefined,
                totpCode
              );
              resolve(res);
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error('No Google credential returned'));
          }
        },
      });
      window.google!.accounts.id.prompt();
    }
  });
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
