import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  TokenStorage,
  type SecureStoreAdapter,
} from '@/lib/auth/token-storage';

function createAdapter(initial: Record<string, string> = {}): SecureStoreAdapter & {
  values: Map<string, string>;
} {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
}

describe('TokenStorage', () => {
  it('stores the access and refresh token under one canonical key pair', async () => {
    const adapter = createAdapter();
    const storage = new TokenStorage(adapter);

    await storage.setTokens({ accessToken: 'access.jwt', refreshToken: 'refresh.jwt' });

    expect(adapter.values.get(ACCESS_TOKEN_KEY)).toBe('access.jwt');
    expect(adapter.values.get(REFRESH_TOKEN_KEY)).toBe('refresh.jwt');
  });

  it('restores a complete token pair', async () => {
    const storage = new TokenStorage(
      createAdapter({
        [ACCESS_TOKEN_KEY]: 'access.jwt',
        [REFRESH_TOKEN_KEY]: 'refresh.jwt',
      })
    );

    await expect(storage.getTokens()).resolves.toEqual({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
    });
  });

  it('clears a partial token pair rather than restoring an invalid session', async () => {
    const adapter = createAdapter({ [ACCESS_TOKEN_KEY]: 'orphaned.jwt' });
    const storage = new TokenStorage(adapter);

    await expect(storage.getTokens()).resolves.toBeNull();
    expect(adapter.values.size).toBe(0);
  });

  it('removes both tokens on logout', async () => {
    const adapter = createAdapter({
      [ACCESS_TOKEN_KEY]: 'access.jwt',
      [REFRESH_TOKEN_KEY]: 'refresh.jwt',
    });
    const storage = new TokenStorage(adapter);

    await storage.clearTokens();

    expect(adapter.values.size).toBe(0);
  });
});
