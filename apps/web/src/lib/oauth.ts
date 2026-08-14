import { api } from './api-client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (notification?: unknown) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<Record<string, unknown>>;
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
