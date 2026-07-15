import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { generateOpenApiSpec } from '@ricton/shared';
// Import the schemas so they register themselves before generation
import '@ricton/shared';

const spec = generateOpenApiSpec();
const yamlStr = yaml.stringify(spec);

const outputPath = path.join(__dirname, '../openapi.yaml');
fs.writeFileSync(outputPath, yamlStr);

console.log(`OpenAPI spec successfully generated at ${outputPath}`);
