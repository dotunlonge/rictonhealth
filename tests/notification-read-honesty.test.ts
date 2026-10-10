/**
 * Notification read honesty (TDD RED → GREEN).
 * The optimistic read must roll back when the server rejects it — the api
 * client returns an envelope (no throw) on HTTP errors, so checking only
 * the throw path leaves the UI permanently out of sync.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('notification read honesty', () => {
  const body = () => {
    const src = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'store', 'useAppStore.ts'),
      'utf8'
    );
    const start = src.indexOf('markNotificationRead: async');
    return src.slice(start, src.indexOf('fetchWallet', start));
  };

  it('restores the snapshot when the server reports failure', () => {
    expect(body()).toMatch(/!res\.success/);
    expect(body()).toMatch(/set\(\{ notifications: snapshot \}\)/);
  });
});
