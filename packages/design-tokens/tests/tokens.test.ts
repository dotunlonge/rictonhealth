import { tokens } from '../src';

describe('design tokens', () => {
  it('exposes accessible touch target + brand colors', () => {
    expect(tokens.minTouchTarget).toBeGreaterThanOrEqual(44);
    expect(tokens.color.action).toBe('#1877F2');
    expect(tokens.color.navy).toBe('#0A192F');
  });
});
