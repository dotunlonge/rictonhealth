import { renderKongRuntime } from '../scripts/render-kong-runtime';

describe('Kong runtime render', () => {
  const config = 'secret: ${JWT_SECRET}\npassword: ${REDIS_PASSWORD}\nhost: ${API_DOMAIN}\n';

  it('replaces each deployment placeholder with a YAML-safe scalar', () => {
    expect(
      renderKongRuntime(config, {
        JWT_SECRET: 'jwt: with spaces',
        REDIS_PASSWORD: 'redis-password',
        API_DOMAIN: 'api.rictonhealth.com',
      })
    ).toBe(
      'secret: "jwt: with spaces"\npassword: "redis-password"\nhost: "api.rictonhealth.com"\n'
    );
  });

  it('rejects incomplete production runtime configuration', () => {
    expect(() => renderKongRuntime(config, { JWT_SECRET: 'x' })).toThrow(
      'REDIS_PASSWORD is required'
    );
  });
});
