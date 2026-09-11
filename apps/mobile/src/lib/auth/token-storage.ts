import * as SecureStore from 'expo-secure-store';

export const ACCESS_TOKEN_KEY = 'ricton.auth.access-token.v1';
export const REFRESH_TOKEN_KEY = 'ricton.auth.refresh-token.v1';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SecureStoreAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void>;
  deleteItemAsync(key: string, options?: SecureStore.SecureStoreOptions): Promise<void>;
}

export interface TokenStorageContract {
  getTokens(): Promise<TokenPair | null>;
  setTokens(tokens: TokenPair): Promise<void>;
  clearTokens(): Promise<void>;
}

const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export class TokenStorage implements TokenStorageContract {
  constructor(private readonly store: SecureStoreAdapter = SecureStore) {}

  async getTokens(): Promise<TokenPair | null> {
    const [accessToken, refreshToken] = await Promise.all([
      this.store.getItemAsync(ACCESS_TOKEN_KEY),
      this.store.getItemAsync(REFRESH_TOKEN_KEY),
    ]);

    if (!accessToken || !refreshToken) {
      if (accessToken || refreshToken) {
        await this.clearTokens();
      }
      return null;
    }

    return { accessToken, refreshToken };
  }

  async setTokens(tokens: TokenPair): Promise<void> {
    await Promise.all([
      this.store.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken, STORE_OPTIONS),
      this.store.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken, STORE_OPTIONS),
    ]);
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      this.store.deleteItemAsync(ACCESS_TOKEN_KEY, STORE_OPTIONS),
      this.store.deleteItemAsync(REFRESH_TOKEN_KEY, STORE_OPTIONS),
    ]);
  }
}

export const tokenStorage = new TokenStorage();
