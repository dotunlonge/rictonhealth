/**
 * Wallet chart honesty (TDD RED → GREEN).
 * The weekly chart must aggregate from raw ISO timestamps, never by
 * re-parsing a locale display string ("Jan 5" parses in V8 but is
 * locale-fragile and year-blind).
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('wallet chart honesty', () => {
  const src = () =>
    fs.readFileSync(path.join(root, 'apps', 'web', 'src', 'app', 'wallet', 'page.tsx'), 'utf8');

  it('keeps a raw timestamp on mapped transactions', () => {
    expect(src()).toMatch(/createdAt/);
  });

  it('builds the weekly chart from the raw timestamp, not the display string', () => {
    const s = src();
    const chartStart = s.indexOf('dayTotals');
    expect(chartStart).toBeGreaterThan(-1);
    const chartBody = s.slice(chartStart, chartStart + 800);
    expect(chartBody).not.toMatch(/new Date\(t\.date\)/);
  });
});
