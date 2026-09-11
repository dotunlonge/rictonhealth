import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { syncOpenApiRouteCoverage } from './generate-openapi-from-routes';

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

const spec = generateOpenApiSpec();
const yamlStr = yaml.stringify(spec);

const outputPath = path.join(__dirname, '../openapi.yaml');
fs.writeFileSync(outputPath, yamlStr);
syncOpenApiRouteCoverage();

console.log(`OpenAPI spec successfully generated at ${outputPath}`);
process.exit(0);
