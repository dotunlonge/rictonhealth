/**
 * Route-coverage generator for openapi.yaml (gateway contract).
 *
 * Scans every service router for `router.<method>('<path>')` registrations,
 * joins them with the service mount prefixes from `services/<svc>/src/index.ts`
 * (`app.use('/api/<name>', ...)`), and adds any MISSING path+method entries to
 * openapi.yaml. Existing hand-written entries are never overwritten.
 *
 * Generated stubs carry `x-coverage: route-generated` so follow-up work can
 * promote them to full schemas (request/response refs). Run:
 *   npx ts-node -O '{"module":"commonjs"}' scripts/generate-openapi-from-routes.ts
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const root = path.resolve(__dirname, '..');

interface RouteDef {
  service: string;
  method: string;
  path: string;
}

function serviceRoutes(): RouteDef[] {
  const out: RouteDef[] = [];
  const servicesDir = path.join(root, 'services');
  for (const svc of fs.readdirSync(servicesDir)) {
    const indexPath = path.join(servicesDir, svc, 'src', 'index.ts');
    if (!fs.existsSync(indexPath)) continue;
    const indexSrc = fs.readFileSync(indexPath, 'utf8');
    // Import name -> route file (./routes/<name>[.routes]) for exact pairing.
    const importRes = [
      ...indexSrc.matchAll(/import\s+(\w+)\s+from\s+['"`]\.\/routes\/([^'"`]+)['"`]/g),
    ];
    const fileByVar = new Map<string, string>();
    for (const [, varName, mod] of importRes) {
      const base = mod.endsWith('.routes') ? mod : mod;
      fileByVar.set(varName, `${base}${base.endsWith('.routes') ? '' : '.routes'}.ts`);
    }
    const mountRes = [...indexSrc.matchAll(/app\.use\(\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*(\w+)/g)];
    if (mountRes.length === 0) continue;

    const routesDir = path.join(servicesDir, svc, 'src', 'routes');
    if (!fs.existsSync(routesDir)) continue;
    for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith('.ts'))) {
      // Only the mount(s) wired to THIS route file (by imported variable name).
      const myPrefixes = mountRes.filter((m) => fileByVar.get(m[2]) === file).map((m) => m[1]);
      if (myPrefixes.length === 0) continue;
      const src = fs.readFileSync(path.join(routesDir, file), 'utf8');
      const routeRes = [
        ...src.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g),
      ];
      for (const [, method, routePath] of routeRes) {
        const openApiPath = routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
        for (const prefix of myPrefixes) {
          // Canonical form: no trailing slash (router.get('/') === collection root).
          const full = `${prefix}${openApiPath}`.replace(/\/+$/, '') || '/';
          out.push({ service: svc, method: method.toUpperCase(), path: full });
        }
      }
    }
  }
  return out;
}

// Paths that do not use bearer auth (public entrypoints + provider webhooks).
function isPublic(method: string, routePath: string): boolean {
  if (method !== 'POST') return false;
  return (
    /\/api\/auth\/(register|login|oauth\/|otp\/|password\/|refresh|verify)/.test(routePath) ||
    /webhook/i.test(routePath)
  );
}

function summarize(def: RouteDef): string {
  const resource = def.path
    .replace(/^\/api\//, '')
    .replace(/[{}]/g, '')
    .replace(/\//g, ' ')
    .trim();
  const verb =
    def.method === 'GET'
      ? 'Retrieve'
      : def.method === 'POST'
        ? 'Create'
        : def.method === 'DELETE'
          ? 'Remove'
          : def.method === 'PUT'
            ? 'Replace'
            : def.method === 'PATCH'
              ? 'Update'
              : def.method;
  return `${verb} ${resource} [${def.service}]`;
}

export { serviceRoutes };
export interface OpenApiRouteDef extends RouteDef {}

export function syncOpenApiRouteCoverage() {
  const routes = serviceRoutes();
  console.log(`Discovered ${routes.length} route registrations.`);

  const specPath = path.join(root, 'openapi.yaml');
  const spec = yaml.parse(fs.readFileSync(specPath, 'utf8')) as {
    paths?: Record<string, Record<string, unknown>>;
  };
  spec.paths = spec.paths ?? {};

  // Prune stale trailing-slash duplicates from earlier generator runs.
  let pruned = 0;
  for (const p of Object.keys(spec.paths)) {
    if (p.length > 1 && p.endsWith('/')) {
      const canonical = p.replace(/\/+$/, '');
      if (spec.paths[canonical]) {
        delete spec.paths[p];
        pruned += 1;
      } else {
        spec.paths[canonical] = spec.paths[p];
        delete spec.paths[p];
        pruned += 1;
      }
    }
  }
  if (pruned > 0) console.log(`Normalized ${pruned} trailing-slash paths.`);

  // Retire generated stubs that no longer correspond to a mounted route
  // (e.g. entries produced before mount pairing was exact). Hand-written
  // entries are never touched.
  const live = new Set(routes.map((r) => `${r.method} ${r.path}`));
  let retired = 0;
  for (const [p, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (
        op &&
        typeof op === 'object' &&
        (op as Record<string, unknown>)['x-coverage'] === 'route-generated' &&
        !live.has(`${method.toUpperCase()} ${p}`)
      ) {
        delete (spec.paths[p] as Record<string, unknown>)[method];
        retired += 1;
      }
    }
    if (Object.keys(spec.paths[p] as Record<string, unknown>).length === 0) {
      delete spec.paths[p];
    }
  }
  if (retired > 0) console.log(`Retired ${retired} orphaned generated operations.`);

  let added = 0;
  for (const def of routes) {
    const methods = (spec.paths[def.path] = spec.paths[def.path] ?? {});
    const key = def.method.toLowerCase();
    if (methods[key]) continue;
    const pathParams = [...def.path.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    methods[key] = {
      summary: summarize(def),
      tags: [def.service],
      ...(isPublic(def.method, def.path) ? {} : { security: [{ bearerAuth: [] }] }),
      ...(pathParams.length > 0 ? { parameters: pathParams } : {}),
      responses: {
        '200': { description: 'Successful operation' },
        '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Not found' },
      },
      'x-coverage': 'route-generated',
    };
    added += 1;
  }

  // Promote generated stubs to full request schemas where a registered
  // component schema mirrors the controller's body. Entries stay marked so
  // the remaining stub count is auditable.
  const PROMOTE: Record<string, string> = {
    'POST /api/messages/threads': 'CreateConversationInput',
    'POST /api/messages/threads/{id}/messages': 'SendMessageInput',
    'PATCH /api/messages/threads/{id}/read': 'MarkConversationReadInput',
    'POST /api/messages/conversations': 'CreateConversationInput',
    'POST /api/messages/conversations/{id}/messages': 'SendMessageInput',
    'PATCH /api/messages/conversations/{id}/read': 'MarkConversationReadInput',
    'POST /api/telemedicine/rooms': 'CreateTelemedicineRoomInput',
    'POST /api/telemedicine/meetings': 'CreateTelemedicineRoomInput',
    'POST /api/notifications/push-token': 'PushTokenInput',
    'PUT /api/notifications/preferences': 'NotificationPreferencesInput',
    'POST /api/notifications/test': 'TestNotificationInput',
    'POST /api/admin/providers/{id}/verify': 'AdminVerifyProviderInput',
    'POST /api/admin/hospitals': 'AdminHospitalInput',
    'PUT /api/admin/hospitals/{id}': 'AdminHospitalInput',
    'PATCH /api/admin/users/{id}/status': 'AdminUserStatusInput',
    'POST /api/admin/users': 'AdminProvisionUserInput',
    'POST /api/pharmacy/products': 'PharmacyProductInput',
    'PUT /api/pharmacy/products/{id}': 'PharmacyProductInput',
    'PATCH /api/pharmacy/orders/{id}/status': 'PharmacyOrderStatusInput',
    'POST /api/pharmacy/prescriptions/fulfill': 'FulfillPrescriptionInput',
    'POST /api/subscriptions/upgrade': 'SubscriptionUpgradeInput',
    'POST /api/payments/initialize': 'PaymentInitializeInput',
    'POST /api/auth/2fa/verify': 'TwoFactorVerifyInput',
    'POST /api/rewards/claim': 'RedeemRewardRequest',
    'POST /api/rewards/redeem': 'RedeemRewardRequest',
    'POST /api/rewards/internal/earn': 'EarnPointsRequest',
    'PUT /api/users/me/avatar': 'AvatarUploadInput',
    'PUT /api/users/me/medical-history': 'MedicalHistoryInput',
  };
  // Provider-defined webhook payloads (Paystack/Twilio): documented as
  // external contracts rather than fabricated schemas.
  const EXTERNAL_WEBHOOKS = new Set([
    'POST /api/payments/webhook',
    'POST /api/wallets/webhook',
    'POST /api/subscriptions/webhook',
    'POST /api/telemedicine/callbacks/status',
    'POST /api/internal/payment/success',
    'POST /api/internal/payment/failed',
  ]);
  // Operations that genuinely take no body (verified against controllers).
  const NO_BODY = new Set([
    'POST /api/auth/logout-all',
    'POST /api/auth/2fa/setup',
    'POST /api/auth/2fa/enable',
    'POST /api/subscriptions/cancel',
    'POST /api/telemedicine/rooms/{id}/token',
    'POST /api/telemedicine/meetings/{id}/token',
    'POST /api/telemedicine/rooms/{id}/join',
    'POST /api/telemedicine/meetings/{id}/join',
    'POST /api/telemedicine/rooms/{id}/end',
    'POST /api/telemedicine/meetings/{id}/end',
    'POST /api/telemedicine/rooms/{id}/leave',
    'POST /api/telemedicine/meetings/{id}/leave',
    'PATCH /api/notifications/read-all',
    'PATCH /api/notifications/{id}/read',
    'PATCH /api/pharmacy/orders/{id}/cancel',
    'POST /api/admin/users/{id}/verify',
    'POST /api/auth/2fa/disable',
    'PATCH /api/prescriptions/{id}/dispense',
    'PATCH /api/addresses/{id}/set-default',
    'POST /api/wallets/virtual-account',
    'DELETE /api/auth/sessions/{sessionId}',
    'DELETE /api/notifications/push-token/{token}',
    'DELETE /api/notifications/{id}',
    'DELETE /api/pharmacy/products/{id}',
    'POST /api/smartguard/alerts/{id}/acknowledge',
    'POST /api/smartguard/threats/{id}/mitigate',
  ]);
  for (const key of EXTERNAL_WEBHOOKS) {
    const [method, ...rest] = key.split(' ');
    const path = rest.join(' ');
    const op = (spec.paths[path] as Record<string, unknown> | undefined)?.[method.toLowerCase()] as
      | Record<string, unknown>
      | undefined;
    if (!op || typeof op !== 'object') continue;
    if (op['x-coverage'] === 'route-generated') op['x-coverage'] = 'external-webhook';
  }
  let promoted = 0;
  for (const [key, schema] of Object.entries(PROMOTE)) {
    const [method, ...rest] = key.split(' ');
    const path = rest.join(' ');
    const op = (spec.paths[path] as Record<string, unknown> | undefined)?.[method.toLowerCase()] as
      | Record<string, unknown>
      | undefined;
    if (!op || typeof op !== 'object') continue;
    op['requestBody'] = {
      content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
    };
    if (op['x-coverage'] === 'route-generated')
      op['x-coverage'] = 'route-generated+schema-promoted';
    promoted += 1;
  }
  for (const key of NO_BODY) {
    const [method, ...rest] = key.split(' ');
    const path = rest.join(' ');
    const op = (spec.paths[path] as Record<string, unknown> | undefined)?.[method.toLowerCase()] as
      | Record<string, unknown>
      | undefined;
    if (!op || typeof op !== 'object') continue;
    if (op['x-coverage'] === 'route-generated') op['x-coverage'] = 'documented-no-body';
  }
  if (promoted > 0) console.log(`Promoted ${promoted} operations to full request schemas.`);

  fs.writeFileSync(specPath, yaml.stringify(spec));
  console.log(`Added ${added} missing path operations to openapi.yaml.`);
}

if (require.main === module) {
  syncOpenApiRouteCoverage();
}
