import { parseAnalyticsTimeWindow } from '../src/time-range';

describe('analytics time window', () => {
  const now = new Date('2026-09-10T12:00:00.000Z');

  it('defaults to the last 30 days', () => {
    const result = parseAnalyticsTimeWindow({}, now);
    expect(result.since?.toISOString()).toBe('2026-08-11T12:00:00.000Z');
    expect(result.until).toBeUndefined();
    expect(result.createdAt?.gte).toEqual(result.since);
  });

  it('anchors a relative range to an explicit upper bound', () => {
    const result = parseAnalyticsTimeWindow({ range: '7d', to: '2026-05-10T00:00:00.000Z' }, now);
    expect(result.since?.toISOString()).toBe('2026-05-03T00:00:00.000Z');
    expect(result.until?.toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });

  it('uses explicit from/to bounds and rejects a reversed window', () => {
    const result = parseAnalyticsTimeWindow({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
    });
    expect(result.createdAt).toEqual({
      gte: new Date('2026-01-01T00:00:00.000Z'),
      lte: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(() =>
      parseAnalyticsTimeWindow({
        from: '2026-02-01T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      })
    ).toThrow(/to/);
  });
});
