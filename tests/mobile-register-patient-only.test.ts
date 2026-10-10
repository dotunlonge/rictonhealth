/**
 * Mobile patient-only registration (TDD RED → GREEN).
 * The mobile app serves PATIENTs only and its session layer rejects any
 * other role — so the register screen must not offer CONSULTANT/PHARMACIST
 * (a picker there built accounts mobile immediately throws away).
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('mobile patient-only registration', () => {
  const src = () =>
    fs.readFileSync(path.join(root, 'apps', 'mobile', 'app', '(auth)', 'register.tsx'), 'utf8');

  it('offers no professional role options', () => {
    expect(src()).not.toMatch(/'CONSULTANT'/);
    expect(src()).not.toMatch(/'PHARMACIST'/);
  });

  it('registers as PATIENT and says so', () => {
    expect(src()).toMatch(/role/);
    expect(src()).toMatch(/'PATIENT'/);
    expect(src()).toMatch(/testID="auth\.register\.role"/);
  });
});
