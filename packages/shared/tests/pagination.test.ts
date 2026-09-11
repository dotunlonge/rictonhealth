import { parseLimit, parseOffset, parsePage } from '../src/pagination';

describe('bounded pagination inputs', () => {
  it('caps client-controlled limits and rejects invalid or negative values', () => {
    expect(parseLimit('5000')).toBe(200);
    expect(parseLimit('50')).toBe(50);
    expect(parseLimit('-1')).toBe(20);
    expect(parseLimit('not-a-number', 50)).toBe(50);
  });

  it('normalizes pages and offsets to safe non-negative integers', () => {
    expect(parsePage('3')).toBe(3);
    expect(parsePage('-2')).toBe(1);
    expect(parseOffset('25')).toBe(25);
    expect(parseOffset('-25')).toBe(0);
    expect(parseOffset('1.5')).toBe(0);
  });
});
