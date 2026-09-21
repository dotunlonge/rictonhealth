/** Phase 1c wiring TDD RED→GREEN: mobile consumes shared contract + tokens. */
import fs from 'fs';
import path from 'path';

import { GATEWAY_PATHS } from '@ricton/api-contract';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('shared contract wiring', () => {
  it('mobile depends on workspace contract + tokens', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['@ricton/api-contract']).toBeDefined();
    expect(pkg.dependencies['@ricton/design-tokens']).toBeDefined();
  });

  it('canonical client uses GATEWAY_PATHS (no hardcoded auth refresh)', () => {
    const src = read('src/lib/api/client.ts');
    expect(src).toMatch(/@ricton\/api-contract/);
    expect(src).toMatch(/GATEWAY_PATHS|joinGateway/);
  });

  it('mobile theme derives from shared design tokens', () => {
    const src = read('src/theme/tokens.ts');
    expect(src).toMatch(/@ricton\/design-tokens/);
  });

  it('tab screens compose GATEWAY_PATHS (no hardcoded gateway literals)', () => {
    for (const screen of [
      'app/(app)/(tabs)/index.tsx',
      'app/(app)/(tabs)/appointments.tsx',
      'app/(app)/(tabs)/prescriptions.tsx',
    ]) {
      const src = read(screen);
      expect(src).toMatch(/GATEWAY_PATHS/);
      expect(src).not.toMatch(/apiClient\.(get|post)\(\s*['"`]\//);
    }
  });

  it('composed paths resolve against the OpenAPI contract', () => {
    const yaml = fs.readFileSync(path.resolve(root, '..', '..', 'openapi.yaml'), 'utf8');
    const composed = [
      GATEWAY_PATHS.appointments,
      GATEWAY_PATHS.prescriptions,
      GATEWAY_PATHS.walletMe,
      `${GATEWAY_PATHS.teleRooms}/{id}/token`,
      `${GATEWAY_PATHS.teleRooms}/{id}/join`,
      `${GATEWAY_PATHS.teleRooms}/{id}/leave`,
    ];
    for (const p of composed) {
      const key = p.replace(/^\/api/, '/api');
      expect(yaml.includes(key) || yaml.includes(p)).toBe(true);
    }
  });
});
