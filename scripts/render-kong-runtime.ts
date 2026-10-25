/**
 * Render the final Kong declarative configuration on the deployment host.
 *
 * Kong's declarative YAML does not expand `${NAME}` placeholders in plugin
 * values. Replacing the placeholders immediately before startup keeps secrets
 * out of version control while ensuring Redis, JWT, and ACME use their real
 * runtime values.
 */
import fs from 'fs';

const RUNTIME_KEYS = ['JWT_SECRET', 'REDIS_PASSWORD', 'API_DOMAIN'] as const;

export function renderKongRuntime(
  input: string,
  environment: Readonly<Record<string, string | undefined>>
): string {
  return RUNTIME_KEYS.reduce((output, key) => {
    const value = environment[key]?.trim();
    if (!value) throw new Error(`${key} is required to render Kong runtime configuration`);
    // JSON strings are valid YAML scalars and safely preserve special characters.
    return output.split(`\${${key}}`).join(JSON.stringify(value));
  }, input);
}

function readEnv(name: string): string {
  return (process.env[name] || '').trim();
}

if (require.main === module) {
  const inputPath = readEnv('KONG_IN') || 'gateway/kong.yml';
  const outputPath = readEnv('KONG_OUT') || inputPath;
  fs.writeFileSync(outputPath, renderKongRuntime(fs.readFileSync(inputPath, 'utf8'), process.env));
  console.log(`Kong runtime configuration rendered -> ${outputPath}`);
}
