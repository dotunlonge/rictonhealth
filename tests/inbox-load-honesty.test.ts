/**
 * Inbox load honesty (TDD RED → GREEN).
 * Failed conversation/message loads must surface as errors with retry —
 * never render as an empty inbox (clinical threads hidden as "no threads").
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('inbox load honesty', () => {
  const src = () =>
    fs.readFileSync(path.join(root, 'apps', 'web', 'src', 'app', 'inbox', 'page.tsx'), 'utf8');

  it('tracks thread-list failure distinctly from empty', () => {
    expect(src()).toMatch(/threadsError/);
    expect(src()).toMatch(/Try again/);
  });

  it('tracks message-load failure with reload', () => {
    expect(src()).toMatch(/messagesError/);
    expect(src()).toMatch(/Reload conversation/);
  });
});
