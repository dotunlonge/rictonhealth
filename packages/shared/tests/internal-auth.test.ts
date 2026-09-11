import { getInternalApiSecret, internalSecretMatches } from '../src/internal-auth';

describe('internal service authentication', () => {
  const secret = 'a-secure-internal-service-secret-32-chars';

  it('fails closed when no strong secret is configured', () => {
    expect(() => getInternalApiSecret({})).toThrow(/configured/i);
    expect(() => getInternalApiSecret({ INTERNAL_API_SECRET: 'short' })).toThrow(/32/);
  });

  it('accepts bare and Bearer credentials using the configured secret', () => {
    expect(internalSecretMatches(secret, secret)).toBe(true);
    expect(internalSecretMatches(`Bearer ${secret}`, secret)).toBe(true);
    expect(internalSecretMatches('wrong', secret)).toBe(false);
    expect(internalSecretMatches(undefined, secret)).toBe(false);
  });
});
