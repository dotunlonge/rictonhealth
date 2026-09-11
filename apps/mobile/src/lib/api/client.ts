import { Platform } from 'react-native';
import { GATEWAY_PATHS, joinGateway } from '@ricton/api-contract';

import { tokenStorage, type TokenPair, type TokenStorageContract } from '@/lib/auth/token-storage';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  message?: string;
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  authenticated?: boolean;
}

export interface ApiClientOptions {
  baseUrl: string;
  tokenStorage: TokenStorageContract;
  fetchImpl?: typeof fetch;
  onSessionExpired?: () => void | Promise<void>;
  timeoutMs?: number;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function resolveDefaultBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured;

  if (__DEV__) {
    return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://127.0.0.1:8000/api';
  }

  throw new Error('EXPO_PUBLIC_API_URL must be configured for production builds.');
}

function joinUrl(baseUrl: string, path: string): string {
  const normalizedPath = baseUrl.replace(/\/$/, '').endsWith('/api')
    ? path.replace(/^\/api(?=\/|$)/, '')
    : path;
  return joinGateway(baseUrl, normalizedPath);
}

export { GATEWAY_PATHS };

export class ApiClient {
  private readonly baseUrl: string;
  private readonly storage: TokenStorageContract;
  private readonly fetchImpl: typeof fetch;
  private onSessionExpired?: () => void | Promise<void>;
  private readonly timeoutMs: number;
  private refreshPromise: Promise<TokenPair> | null = null;

  constructor({
    baseUrl,
    tokenStorage: storage,
    fetchImpl = fetch,
    onSessionExpired,
    timeoutMs = 15_000,
  }: ApiClientOptions) {
    this.baseUrl = baseUrl;
    this.storage = storage;
    this.fetchImpl = fetchImpl;
    this.onSessionExpired = onSessionExpired;
    this.timeoutMs = timeoutMs;
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  setSessionExpiredHandler(handler?: () => void | Promise<void>): void {
    this.onSessionExpired = handler;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
    isRetry = false
  ): Promise<T> {
    const { authenticated = true, headers: optionHeaders, ...requestOptions } = options;
    const tokens = authenticated ? await this.storage.getTokens() : null;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(optionHeaders as Record<string, string> | undefined),
    };

    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;

    let response: Response;
    try {
      response = await this.fetchWithTimeout(joinUrl(this.baseUrl, path), {
        ...requestOptions,
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Unable to reach Ricton services.',
        'NETWORK_ERROR',
        0,
        error
      );
    }

    const payload = await this.readEnvelope<T>(response);

    if (response.status === 401 && authenticated && !isRetry && tokens?.refreshToken) {
      try {
        await this.refreshTokens();
      } catch {
        await this.expireSession();
        throw this.toApiError(response, payload);
      }
      return this.request<T>(method, path, body, options, true);
    }

    if (!response.ok) throw this.toApiError(response, payload);
    return payload.data as T;
  }

  private async refreshTokens(): Promise<TokenPair> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<TokenPair> {
    const current = await this.storage.getTokens();
    if (!current?.refreshToken) {
      throw new ApiClientError('Your session has expired.', 'SESSION_EXPIRED', 401);
    }

    let response: Response;
    try {
      response = await this.fetchWithTimeout(joinUrl(this.baseUrl, GATEWAY_PATHS.authRefresh), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError('Unable to refresh your session.', 'NETWORK_ERROR', 0, error);
    }

    const payload = await this.readEnvelope<{ token?: string; refreshToken?: string }>(response);
    if (!response.ok) throw this.toApiError(response, payload);

    const accessToken = payload.data?.token;
    const refreshToken = payload.data?.refreshToken;
    if (!accessToken || !refreshToken) {
      throw new ApiClientError(
        'The session response was incomplete.',
        'INVALID_SESSION_RESPONSE',
        502
      );
    }

    const pair = { accessToken, refreshToken };
    await this.storage.setTokens(pair);
    return pair;
  }

  private async expireSession(): Promise<void> {
    await this.storage.clearTokens();
    await this.onSessionExpired?.();
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
    try {
      return (await response.json()) as ApiEnvelope<T>;
    } catch {
      return {};
    }
  }

  private toApiError(response: Response, payload: ApiEnvelope<unknown>): ApiClientError {
    return new ApiClientError(
      payload.error?.message ?? payload.message ?? `Request failed with status ${response.status}.`,
      payload.error?.code ?? 'HTTP_ERROR',
      response.status,
      payload.error?.details
    );
  }
}

export const apiClient = new ApiClient({
  baseUrl: resolveDefaultBaseUrl(),
  tokenStorage,
});
