/** Phase 7 TDD: release-hardening guards (privacy, PCI, ports, a11y, E2E coverage). */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
const srcFiles = [...walk(path.join(root, 'src')), ...walk(path.join(root, 'app'))].filter(
  (f) => f.endsWith('.ts') || f.endsWith('.tsx')
);
const readAll = () =>
  srcFiles.map((f) => fs.readFileSync(f, 'utf8').replace(/\n/g, '\n')).join('\n');

describe('release hardening', () => {
  it('never collects raw card details (PCI scope)', () => {
    expect(readAll()).not.toMatch(/CardField|cardNumber|card_number|\bcvv\b|Cvv/i);
  });

  it('never calls direct service ports; gateway only', () => {
    const all = readAll();
    expect(all).not.toMatch(/localhost:300\d|10\.0\.2\.2:300\d|127\.0\.0\.1:300\d/);
    expect(all).toMatch(/EXPO_PUBLIC_API_URL/);
  });

  it('leaks no tokens/PHI to console logs', () => {
    expect(readAll()).not.toMatch(/console\.(log|warn|error)/);
  });

  it('stores tokens versioned in SecureStore, never plain AsyncStorage keys', () => {
    const all = readAll();
    expect(all).toMatch(/ricton\.auth\.access-token\.v1/);
    expect(all).not.toMatch(/ricton_access_token|userToken/);
  });

  it('meets touch-target and deep-link scheme requirements', () => {
    const tokens = fs.readFileSync(path.join(root, 'src/theme/tokens.ts'), 'utf8');
    expect(tokens).toMatch(/minimumTouchTarget/);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const schemes = Array.isArray(manifest.expo.scheme)
      ? manifest.expo.scheme
      : [manifest.expo.scheme];
    expect(schemes).toContain('ricton');
  });

  it('runs only executable Maestro flows and never counts TODO shells as E2E coverage', () => {
    const e2eRoot = path.join(root, 'e2e');
    const yamlFiles = walk(e2eRoot).filter((file) => file.endsWith('.yaml'));
    const executable = yamlFiles.filter((file) => !fs.readFileSync(file, 'utf8').includes('TODO'));
    expect(executable.length).toBeGreaterThanOrEqual(8);
    for (const file of executable) {
      expect(fs.readFileSync(file, 'utf8')).toMatch(/assertVisible|assertNotVisible|tapOn/);
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const e2eCommand = packageJson.scripts.e2e as string;
    expect(e2eCommand).toContain('e2e/foundation');
    expect(e2eCommand).toContain('e2e/auth/05-password-login.yaml');
    expect(e2eCommand).toContain('e2e/auth/06-invalid-login.yaml');
    expect(e2eCommand).not.toMatch(/maestro test e2e\/$/);
    expect(packageJson.scripts['e2e:all']).toBeUndefined();
  });
});
