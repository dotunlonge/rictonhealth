import { ApiClient, ApiClientError } from '@/lib/api/client';
import type { TokenPair, TokenStorageContract } from '@/lib/auth/token-storage';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createStorage(initial: TokenPair | null): TokenStorageContract & {
  current: TokenPair | null;
} {
  return {
    current: initial,
    getTokens: jest.fn(async function (this: { current: TokenPair | null }) {
      return this.current;
    }),
    setTokens: jest.fn(async function (this: { current: TokenPair | null }, tokens: TokenPair) {
      this.current = tokens;
    }),
    clearTokens: jest.fn(async function (this: { current: TokenPair | null }) {
      this.current = null;
    }),
  };
}

describe('ApiClient session behavior', () => {
  it('sends authenticated requests through the configured gateway', async () => {
    const storage = createStorage({ accessToken: 'access.jwt', refreshToken: 'refresh.jwt' });
    const fetchImpl = jest.fn(async () =>
      jsonResponse(200, { success: true, data: { id: 'user-1' } })
    );
    const client = new ApiClient({
      baseUrl: 'https://gateway.example/api/',
      tokenStorage: storage,
      fetchImpl,
    });

    await expect(client.get<{ id: string }>('/users/me')).resolves.toEqual({ id: 'user-1' });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://gateway.example/api/users/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer access.jwt' }),
      })
    );
  });

  it('rotates tokens once and retries a request after a 401', async () => {
    const storage = createStorage({ accessToken: 'expired.jwt', refreshToken: 'refresh.old' });
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } })
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: { token: 'access.new', refreshToken: 'refresh.new' },
        })
      )
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: 'user-1' } }));
    const client = new ApiClient({
      baseUrl: 'https://gateway.example/api',
      tokenStorage: storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.get<{ id: string }>('/users/me')).resolves.toEqual({ id: 'user-1' });
    expect(storage.current).toEqual({ accessToken: 'access.new', refreshToken: 'refresh.new' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('uses one refresh request for concurrent 401 responses', async () => {
    const storage = createStorage({ accessToken: 'expired.jwt', refreshToken: 'refresh.old' });
    let refreshCalls = 0;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse(200, {
          success: true,
          data: { token: 'access.new', refreshToken: 'refresh.new' },
        });
      }
      const authorization = (init?.headers as Record<string, string>)?.Authorization;
      if (authorization === 'Bearer expired.jwt') {
        return jsonResponse(401, {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Expired' },
        });
      }
      return jsonResponse(200, { success: true, data: { ok: true } });
    });
    const client = new ApiClient({
      baseUrl: 'https://gateway.example/api',
      tokenStorage: storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await Promise.all([client.get('/users/me'), client.get('/appointments')]);

    expect(refreshCalls).toBe(1);
  });

  it('clears the session when refresh is rejected', async () => {
    const storage = createStorage({ accessToken: 'expired.jwt', refreshToken: 'refresh.old' });
    const onSessionExpired = jest.fn();
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Expired' } })
      )
      .mockResolvedValueOnce(
        jsonResponse(401, {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' },
        })
      );
    const client = new ApiClient({
      baseUrl: 'https://gateway.example/api',
      tokenStorage: storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onSessionExpired,
    });

    await expect(client.get('/users/me')).rejects.toMatchObject({ status: 401 });
    expect(storage.current).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh for unauthenticated requests', async () => {
    const storage = createStorage(null);
    const fetchImpl = jest.fn(async () =>
      jsonResponse(401, {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      })
    );
    const client = new ApiClient({
      baseUrl: 'https://gateway.example/api',
      tokenStorage: storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.post(
        '/auth/login',
        { email: 'patient@example.com', password: 'wrong' },
        { authenticated: false }
      )
    ).rejects.toBeInstanceOf(ApiClientError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reports a structured network error without clearing valid credentials', async () => {
    const storage = createStorage({ accessToken: 'access.jwt', refreshToken: 'refresh.jwt' });
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    const client = new ApiClient({
      baseUrl: 'https://gateway.example/api',
      tokenStorage: storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.get('/users/me')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
    expect(storage.current).not.toBeNull();
  });
});
