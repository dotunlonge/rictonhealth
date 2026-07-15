import express from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'docs-service' });
});

// Load OpenAPI spec (3 levels up from src/ or dist/ reaches the monorepo root)
const openApiPath = path.join(__dirname, '../../../openapi.yaml');
let swaggerDocument: Record<string, unknown>;

try {
  const file = fs.readFileSync(openApiPath, 'utf8');
  swaggerDocument = yaml.parse(file);
} catch (e) {
  console.error('Failed to load openapi.yaml. Make sure to run the generator script.');
  swaggerDocument = {
    openapi: '3.0.0',
    info: { title: 'Error', version: '1.0.0', description: 'OpenAPI spec not generated.' },
    paths: {},
  };
}

// Serve Swagger UI
app.use(
  '/docs',
  swaggerUi.serve as unknown as express.RequestHandler[],
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Ricton API Documentation',
  }) as unknown as express.RequestHandler
);

app.listen(PORT, () => {
  console.log(`Docs service listening at http://localhost:${PORT}`);
});
