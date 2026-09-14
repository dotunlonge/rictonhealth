import { tokens, cssVariables, buildCssDeclarations, toneForStatus } from '../src';

describe('design tokens', () => {
  it('exposes accessible touch target + brand colors', () => {
    expect(tokens.minTouchTarget).toBeGreaterThanOrEqual(44);
    expect(tokens.color.action).toBe('#1877F2');
    expect(tokens.color.navy).toBe('#0A192F');
  });

  it('enforces a 12px readable floor for routine UI text', () => {
    expect(tokens.type.minBodyPx).toBe(12);
    expect(tokens.type.size.xs).toBeGreaterThanOrEqual(tokens.type.minBodyPx);
    expect(tokens.type.minEyebrowPx).toBeGreaterThanOrEqual(11);
  });

  it('publishes every color as a --ricton-* CSS variable', () => {
    for (const [name, value] of Object.entries(tokens.color)) {
      const expected = Object.values(cssVariables);
      expect(expected).toContain(value);
      expect(name.length).toBeGreaterThan(0);
    }
    expect(cssVariables['--ricton-action']).toBe(tokens.color.action);
    expect(cssVariables['--ricton-surface-muted']).toBe(tokens.color.surfaceMuted);
  });

  it('publishes the auth action palette from the login/register mockups', () => {
    expect(tokens.color.authAction).toBe('#B3CDF2');
    expect(tokens.color.authActionDark).toBe('#93B8EC');
    expect(cssVariables['--ricton-auth-action']).toBe(tokens.color.authAction);
  });
  it('builds a :root declaration block for globals.css', () => {
    const css = buildCssDeclarations();
    expect(css).toContain('--ricton-action: #1877F2;');
    expect(css).toContain('--ricton-touch-target: 44px;');
  });

  it('maps statuses to semantic tones with a safe fallback', () => {
    expect(toneForStatus('ACTIVE').fg).toBe(tokens.color.success);
    expect(toneForStatus('cancelled').fg).toBe(tokens.color.danger);
    expect(toneForStatus('SOMETHING_NEW').fg).toBe(tokens.color.inkMuted);
  });
});
