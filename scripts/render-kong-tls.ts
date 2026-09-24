/**
 * Render Kong TLS (domain attach without AWS console).
 *
 * Source gateway/kong.yml stays portable (plain HTTP). At deploy time the
 * workflow runs this over it: when API_DOMAIN + ACME_EMAIL are set, a global
 * ACME plugin (Let's Encrypt http-01, auto-renew, certs in the stack redis)
 * is upserted; otherwise the input passes through byte-identical.
 *
 * Pure renderKongTls() is pinned by tests/kong-tls-render.test.ts.
 */
import fs from 'fs';
import yaml from 'yaml';

export interface KongTlsOptions {
  apiDomain?: string;
  acmeEmail?: string;
}

export function deriveApiDomain(nextPublicApiUrl?: string): string | null {
  if (!nextPublicApiUrl) return null;
  try {
    const host = new URL(nextPublicApiUrl).hostname.trim().toLowerCase();
    if (!host || host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  } catch {
    return null;
  }
}

interface KongPlugin {
  name?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

interface KongDoc {
  plugins?: KongPlugin[];
  [key: string]: unknown;
}

function acmePlugin(apiDomain: string, acmeEmail: string): KongPlugin {
  return {
    name: 'acme',
    config: {
      account_email: acmeEmail,
      tos_accepted: true,
      domains: [apiDomain],
      // DB-less Kong cannot use `kong` storage; the stack redis persists
      // certs across Kong restarts (auth interpolated by Kong at load).
      storage: 'redis',
      storage_config: {
        redis: { host: 'redis', port: 6379, auth: '${REDIS_PASSWORD}' },
      },
      renew_threshold_days: 30,
    },
  };
}

/** Upsert the global ACME plugin; idempotent; passthrough when disabled. */
export function renderKongTls(input: string, opts: KongTlsOptions = {}): string {
  const apiDomain = opts.apiDomain?.trim();
  const acmeEmail = opts.acmeEmail?.trim();
  if (!apiDomain || !acmeEmail) return input;

  const doc = yaml.parse(input) as KongDoc;
  const plugins = Array.isArray(doc.plugins) ? doc.plugins : [];
  const rest = plugins.filter((p) => p?.name !== 'acme');
  rest.push(acmePlugin(apiDomain, acmeEmail));
  doc.plugins = rest;
  return yaml.stringify(doc);
}

function readEnv(name: string): string {
  return (process.env[name] || '').trim();
}

if (require.main === module) {
  const inPath = readEnv('KONG_IN') || 'gateway/kong.yml';
  const outPath = readEnv('KONG_OUT') || 'gateway/kong.yml';
  const apiDomain = readEnv('API_DOMAIN') || deriveApiDomain(readEnv('NEXT_PUBLIC_API_URL')) || '';
  const rendered = renderKongTls(fs.readFileSync(inPath, 'utf8'), {
    apiDomain: apiDomain || undefined,
    acmeEmail: readEnv('ACME_EMAIL') || undefined,
  });
  fs.writeFileSync(outPath, rendered);
  if (apiDomain && readEnv('ACME_EMAIL')) {
    console.log(`Kong TLS enabled for ${apiDomain} -> ${outPath}`);
  } else {
    console.log(`Kong TLS skipped (no API_DOMAIN/ACME_EMAIL) -> ${outPath} unchanged`);
  }
}
