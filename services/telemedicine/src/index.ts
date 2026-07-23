import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'telemedicine-service',
  env: process.env.NODE_ENV || 'development',
});

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { prisma } from '@ricton/db';
import {
  errorResponse,
  AppError,
  httpLogger,
  logger,
  initSentry,
  setupGracefulShutdown,
  createCors,
  checkDatabase,
  validateEnv,
} from '@ricton/shared';
import telemedicineRoutes from './routes/telemedicine.routes';

dotenv.config({ path: '../../.env' });

validateEnv();

initSentry('telemedicine-service');

const app = express();
const PORT = process.env.PORT_TELEMEDICINE || 3005;

app.set('trust proxy', true);
app.use(helmet());
app.use(createCors());
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await checkDatabase(prisma);
    res.status(200).json({ status: 'ok', service: 'telemedicine-service' });
  } catch (error: unknown) {
    res.status(503).json({
      status: 'error',
      service: 'telemedicine-service',
      message: 'Dependency check failed',
    });
  }
});

app.use('/api/telemedicine', telemedicineRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in telemedicine-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Telemedicine service listening on port ${PORT}`);
});

server.timeout = 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'telemedicine-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
