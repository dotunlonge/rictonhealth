/** Phase 1c wiring TDD RED→GREEN: mobile consumes shared contract + tokens. */
import fs from 'fs';
import path from 'path';

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
});
