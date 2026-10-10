/**
 * Subscription success honesty (TDD RED → GREEN).
 * Visiting /subscription/success with no Paystack reference must NEVER
 * render "Subscription Activated" — there is nothing to verify against.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('subscription success honesty', () => {
  const src = () =>
    fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'app', 'subscription', 'success', 'page.tsx'),
      'utf8'
    );

  it('never marks verified on the missing-reference path', () => {
    expect(src()).not.toMatch(/if\s*\(!reference\)[^}]*setVerified\(true\)/);
  });

  it('explains the missing reference as an error', () => {
    expect(src()).toMatch(/reference/i);
    expect(src()).toMatch(/setError/);
  });
});
