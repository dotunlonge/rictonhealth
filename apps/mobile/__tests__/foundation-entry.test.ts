/** Phase 1c TDD RED→GREEN: single Expo Router entry, no legacy auth drift. */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const exists = (p: string) => fs.existsSync(path.join(root, p));
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('foundation single entry', () => {
  it('uses expo-router entry as the only root', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.main).toBe('expo-router/entry');
    expect(exists('app/_layout.tsx')).toBe(true);
    // Legacy dual-entry must be gone
    expect(exists('App.tsx')).toBe(false);
    expect(exists('src/navigation/AppNavigator.tsx')).toBe(false);
    expect(exists('src/screens/LoginScreen.tsx')).toBe(false);
  });

  it('has no legacy direct-port / AsyncStorage auth clients', () => {
    expect(exists('src/services/api.ts')).toBe(false);
    expect(exists('src/api/auth.ts')).toBe(false);
  });

  it('declares deep-link scheme for protected-link E2E', () => {
    const manifest = JSON.parse(read('app.json'));
    expect(manifest.expo.scheme ?? manifest.expo.extra?.scheme).toBeDefined();
  });

  it('canonical client goes through gateway /api with SecureStore + 401 refresh', () => {
    const src = read('src/lib/api/client.ts');
    expect(src).toMatch(/EXPO_PUBLIC_API_URL/);
    expect(src).toMatch(/authRefresh|auth\/refresh/);
    expect(src).toMatch(/SecureStore|token-storage/);
    expect(src).not.toMatch(/localhost:3000\/api/);
    expect(read('src/lib/auth/token-storage.ts')).toMatch(/expo-secure-store/);
  });
});
