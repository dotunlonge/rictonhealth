import { compareSemver, isUpdateRequired, type VersionGateInfo } from '@/lib/version';

const info: VersionGateInfo = {
  latest: '1.2.0',
  minSupported: { ios: '1.1.0', android: '1.1.0', web: '1.0.0' },
};

describe('version gate semver', () => {
  it('orders dotted versions numerically, not lexicographically', () => {
    expect(compareSemver('1.9.0', '1.10.0')).toBe(-1);
    expect(compareSemver('1.10.0', '1.9.0')).toBe(1);
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('2.0.0', '1.99.99')).toBe(1);
  });

  it('requires update only when below the platform minimum', () => {
    expect(isUpdateRequired('1.0.0', info, 'ios')).toBe(true);
    expect(isUpdateRequired('1.1.0', info, 'ios')).toBe(false);
    expect(isUpdateRequired('1.2.0', info, 'android')).toBe(false);
    expect(isUpdateRequired('1.0.0', info, 'web')).toBe(false);
  });
});
