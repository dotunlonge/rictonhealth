/**
 * Gateway-routed API client.
 *
 * - Every request goes through the gateway (`/api/*`, same-origin in dev via
 *   Next rewrites, `NEXT_PUBLIC_API_URL` in production). Direct per-service
 *   localhost ports are prohibited (contract gate G2).
 * - Tokens live in memory only (never localStorage) to limit XSS exfiltration.
 * - Single-flight silent refresh queue: concurrent 401s trigger exactly one
 *   `/auth/refresh` call; all waiters retry once with the new token.
 * - Request timeout via AbortController (default 15s) + safe non-JSON handling.
 * - Optional idempotency keys for money-mutating calls (`POST /wallets/*`,
 *   `/payments/*`, `/rewards/*`).
 */

const OVERRIDE_API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_TIMEOUT_MS = 15000;

export function getEndpointUrl(endpoint: string): string {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiPath = cleanPath.startsWith('/api/') ? cleanPath : `/api${cleanPath}`;
  if (OVERRIDE_API_URL) {
    const cleanBase = OVERRIDE_API_URL.endsWith('/')
      ? OVERRIDE_API_URL.slice(0, -1)
      : OVERRIDE_API_URL;
    return `${cleanBase}${apiPath}`;
  }
  return apiPath;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  idempotencyKey?: string;
  /** Skip the silent-refresh retry (used by the refresh call itself). */
  skipRefreshRetry?: boolean;
}

// Tab-scoped storage for the refresh token. Persistent localStorage is intentionally
// prohibited because it extends the theft window after a browser restart.
const STORAGE_REFRESH_KEY = 'ricton_session_rt';

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_REFRESH_KEY);
  } catch {
    return null;
  }
}

function setStoredRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      sessionStorage.setItem(STORAGE_REFRESH_KEY, token);
    } else {
      sessionStorage.removeItem(STORAGE_REFRESH_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

let accessToken: string | null = null;
let refreshTokenValue: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

function parseJsonSafe(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function setPresenceCookies(role: string | null) {
  if (typeof document === 'undefined') return;
  try {
    if (role) {
      // Non-sensitive routing hints for Next middleware (NOT credentials:
      // the access token stays in memory, refresh in sessionStorage).
      // Forging these only renders app chrome; every data call still
      // requires the real token and 401s back to /login.
      document.cookie = `ricton_session=1; path=/; SameSite=Lax`;
      document.cookie = `ricton_role=${encodeURIComponent(role)}; path=/; SameSite=Lax`;
    } else {
      document.cookie = `ricton_session=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `ricton_role=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch {
    // ignore cookie errors (private mode etc.)
  }
}

export function hasSessionHints(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .some((part) => part === 'ricton_session=1');
}

class ApiClient {
  public setToken(token: string | null, refreshToken?: string | null, role?: string | null) {
    accessToken = token;
    if (refreshToken !== undefined) {
      refreshTokenValue = refreshToken;
      setStoredRefreshToken(refreshToken);
    }
    if (role !== undefined) {
      setPresenceCookies(role);
    }
  }

  public getRefreshToken(): string | null {
    if (!refreshTokenValue) {
      refreshTokenValue = getStoredRefreshToken();
    }
    return refreshTokenValue;
  }

  public clearToken() {
    accessToken = null;
    refreshTokenValue = null;
    refreshPromise = null;
    setStoredRefreshToken(null);
    setPresenceCookies(null);
    if (typeof window !== 'undefined') {
      for (const k of [
        'ricton_token',
        'ricton_refresh_token',
        'ricton_user',
        'ricton_user_storage',
        STORAGE_REFRESH_KEY,
      ]) {
        try {
          window.sessionStorage.removeItem(k);
          window.localStorage.removeItem(k);
        } catch {
          // ignore storage errors
        }
      }
    }
  }

  /** Server-authoritative logout: invalidates the refresh-token session. */
  public async logout(): Promise<void> {
    const rt = this.getRefreshToken();
    // Clear the local session FIRST: callers navigate immediately (e.g. to
    // /login), and a restore racing the server round-trip must not resurrect
    // the session and bounce the user back to the dashboard.
    this.clearToken();
    try {
      if (rt) {
        await this.request(
          '/auth/logout',
          { method: 'POST', body: JSON.stringify({ refreshToken: rt }) },
          // logout must not trigger refresh; fire under a short timeout
          { timeoutMs: 8000, skipRefreshRetry: true }
        );
      }
    } catch {
      // ignore network errors — local session is cleared regardless
    }
  }

  public async refreshAccessToken(): Promise<boolean> {
    const rt = this.getRefreshToken();
    if (!rt) return false;
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const res = await fetch(getEndpointUrl('/auth/refresh'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
            signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
          });
          const text = await res.text();
          const data = parseJsonSafe(text) as
            | {
                success?: boolean;
                data?: { token?: string; refreshToken?: string };
              }
            | undefined;
          if (res.ok && data?.success && data?.data?.token) {
            accessToken = data.data.token;
            if (data.data.refreshToken) {
              refreshTokenValue = data.data.refreshToken;
              setStoredRefreshToken(data.data.refreshToken);
            }
            return true;
          }
          return false;
        } catch {
          return false;
        } finally {
          // Allow a later refresh attempt after this one settles.
          const settled = refreshPromise;
          queueMicrotask(() => {
            if (refreshPromise === settled) refreshPromise = null;
          });
        }
      })();
    }
    const ok = await refreshPromise;
    if (!ok) this.clearToken();
    return ok;
  }

  public async request<T = any>(
    endpoint: string,
    init: RequestInit = {},
    opts: { timeoutMs?: number; idempotencyKey?: string; skipRefreshRetry?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    if (!accessToken && this.getRefreshToken() && !endpoint.includes('/auth/')) {
      await this.refreshAccessToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }
    // Correlate retries of the same logical operation.
    if (!headers['X-Request-Id'] && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      try {
        headers['X-Request-Id'] = crypto.randomUUID();
      } catch {
        // ignore
      }
    }

    const fullUrl = getEndpointUrl(endpoint);

    const doFetch = async (): Promise<ApiResponse<T>> => {
      let response: Response;
      try {
        response = await fetch(fullUrl, { ...init, headers, signal: controller.signal });
      } catch (error: unknown) {
        const aborted = error instanceof DOMException ? error.name === 'AbortError' : false;
        return {
          success: false,
          error: {
            code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
            message: aborted
              ? `Request timed out after ${timeoutMs}ms`
              : error instanceof Error
                ? error.message
                : 'Network error occurred. Please check your connection.',
          },
        };
      } finally {
        clearTimeout(timer);
      }

      const text = await response.text().catch(() => '');
      const data = parseJsonSafe(text) as ApiResponse<T> | undefined;

      if (!response.ok) {
        if (
          response.status === 401 &&
          !opts.skipRefreshRetry &&
          this.getRefreshToken() &&
          !endpoint.includes('/auth/refresh')
        ) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed && accessToken) {
            return this.request<T>(endpoint, init, { ...opts, skipRefreshRetry: true });
          }
        }
        if (data && typeof data === 'object' && 'success' in (data as object)) {
          return data as ApiResponse<T>;
        }
        return {
          success: false,
          error: {
            code: 'HTTP_ERROR',
            message: `Request failed with status ${response.status}`,
          },
        };
      }

      if (data === undefined) {
        return {
          success: false,
          error: { code: 'BAD_RESPONSE', message: 'Server returned a non-JSON response' },
        };
      }
      return data as ApiResponse<T>;
    };

    return doFetch();
  }

  public get<T = any>(endpoint: string, options?: RequestOptions) {
    const { timeoutMs, skipRefreshRetry, ...init } = options ?? {};
    delete init.idempotencyKey;
    return this.request<T>(endpoint, { ...init, method: 'GET' }, { timeoutMs, skipRefreshRetry });
  }

  public post<T = any>(endpoint: string, body?: unknown, options?: RequestOptions) {
    const { timeoutMs, idempotencyKey, skipRefreshRetry, ...init } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...init, method: 'POST', body: JSON.stringify(body) },
      { timeoutMs, idempotencyKey, skipRefreshRetry }
    );
  }

  public put<T = any>(endpoint: string, body?: unknown, options?: RequestOptions) {
    const { timeoutMs, idempotencyKey, skipRefreshRetry, ...init } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...init, method: 'PUT', body: JSON.stringify(body) },
      { timeoutMs, idempotencyKey, skipRefreshRetry }
    );
  }

  public delete<T = any>(endpoint: string, options?: RequestOptions) {
    const { timeoutMs, skipRefreshRetry, ...init } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...init, method: 'DELETE' },
      { timeoutMs, skipRefreshRetry }
    );
  }

  public patch<T = any>(endpoint: string, body?: unknown, options?: RequestOptions) {
    const { timeoutMs, idempotencyKey, skipRefreshRetry, ...init } = options ?? {};
    return this.request<T>(
      endpoint,
      { ...init, method: 'PATCH', body: JSON.stringify(body) },
      { timeoutMs, idempotencyKey, skipRefreshRetry }
    );
  }
}

export const api = new ApiClient();
