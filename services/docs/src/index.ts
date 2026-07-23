import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'docs-service',
  env: process.env.NODE_ENV || 'development',
});

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import dotenv from 'dotenv';
import { prisma } from '@ricton/db';
import {
  logger,
  httpLogger,
  initSentry,
  setupGracefulShutdown,
  createCors,
  checkDatabase,
  AppError,
  validateEnv,
} from '@ricton/shared';

dotenv.config({ path: '../../.env' });

validateEnv();

initSentry('docs-service');

const app = express();
const PORT = process.env.PORT || 3003;

app.set('trust proxy', true);
app.use(helmet());
app.use(createCors());
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await checkDatabase(prisma);
    res.status(200).json({ status: 'ok', service: 'docs-service' });
  } catch (error: unknown) {
    res
      .status(503)
      .json({ status: 'error', service: 'docs-service', message: 'Dependency check failed' });
  }
});

// Load OpenAPI spec (3 levels up from src/ or dist/ reaches the monorepo root)
const openApiPath = path.join(__dirname, '../../../openapi.yaml');
let swaggerDocument: Record<string, unknown>;

try {
  const file = fs.readFileSync(openApiPath, 'utf8');
  swaggerDocument = yaml.parse(file);
} catch (e) {
  logger.error({ err: e }, 'Failed to load openapi.yaml. Make sure to run the generator script.');
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

app.use((_req: Request, res: Response) => {
  res
    .status(404)
    .json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in docs-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  } else {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Docs service listening on port ${PORT}`);
});

server.timeout = 30000;

setupGracefulShutdown({
  server,
  serviceName: 'docs-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
