import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { syncOpenApiRouteCoverage, writeOpenApiSpec } from './generate-openapi-from-routes';

process.env.JWT_SECRET = 'docs-generation-secret';

// Generate from the source registry so the contract never depends on a stale
// packages/shared/dist build left over from an earlier compile. Import schema
// modules explicitly to avoid loading unrelated runtime integrations.
import { generateOpenApiSpec } from '../packages/shared/src/schemas/openapi.registry';
import '../packages/shared/src/schemas/address.schema';
import '../packages/shared/src/schemas/admin.schema';
import '../packages/shared/src/schemas/analytics.schema';
import '../packages/shared/src/schemas/appointment.schema';
import '../packages/shared/src/schemas/auth.schema';
import '../packages/shared/src/schemas/messaging.schema';
import '../packages/shared/src/schemas/notification.schema';
import '../packages/shared/src/schemas/payment.schema';
import '../packages/shared/src/schemas/pharmacy.schema';
import '../packages/shared/src/schemas/prescription.schema';
import '../packages/shared/src/schemas/rewards.schema';
import '../packages/shared/src/schemas/subscription.schema';
import '../packages/shared/src/schemas/telemedicine.schema';
import '../packages/shared/src/schemas/user.schema';
import '../packages/shared/src/schemas/wallet.schema';
import '../packages/shared/src/schemas/coverage.schema';

const outputPath = path.join(__dirname, '../openapi.yaml');

type PathItem = Record<string, unknown>;
type Paths = Record<string, PathItem>;

// Merge, never clobber: the registry is the source of truth for the paths
// and components it defines (generated from current zod schemas), while
// hand-written path operations and components are preserved verbatim.
// A previous full-rewrite version of this script wiped hand-written
// requestBodies and attestations on every run.
const registrySpec = generateOpenApiSpec() as unknown as {
  paths?: Paths;
  components?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
};

let existing: {
  paths?: Paths;
  components?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
} = {};
try {
  existing = yaml.parse(fs.readFileSync(outputPath, 'utf8')) ?? {};
} catch {
  existing = {};
}

const mergedPaths: Paths = { ...(existing.paths ?? {}) };
for (const [p, registryItem] of Object.entries(registrySpec.paths ?? {})) {
  mergedPaths[p] = { ...(mergedPaths[p] ?? {}), ...(registryItem as PathItem) };
}

const mergedComponents: Record<string, Record<string, unknown>> = {
  ...(existing.components ?? {}),
};
for (const [group, registryGroup] of Object.entries(registrySpec.components ?? {})) {
  mergedComponents[group] = {
    ...(mergedComponents[group] ?? {}),
    ...(registryGroup as Record<string, unknown>),
  };
}

const merged = {
  ...existing,
  ...registrySpec,
  paths: mergedPaths,
  components: mergedComponents,
};

writeOpenApiSpec(outputPath, merged);
syncOpenApiRouteCoverage();

console.log(`OpenAPI spec successfully generated at ${outputPath}`);
process.exit(0);
