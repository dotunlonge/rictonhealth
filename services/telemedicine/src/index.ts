import dotenv from 'dotenv';
import path from 'path';

// Repo-root .env first (works from src/ and dist/ alike), then an optional
// service-local override. Must run before dd-trace init and before any
// @ricton/* import (shared/otp.ts throws at import time without secrets).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'telemedicine-service',
  env: process.env.NODE_ENV || 'development',
});

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { prisma } from '@ricton/db';
import {
  HTTP_STATUS,
  errorResponse,
  AppError,
  httpLogger,
  logger,
  initSentry,
  setupGracefulShutdown,
  createCors,
  checkDatabase,
} from '@ricton/shared';
import telemedicineRoutes from './routes/telemedicine.routes';

initSentry('telemedicine-service');

const app = express();
const PORT = process.env.PORT_TELEMEDICINE || 3013;

app.set('trust proxy', true);
app.use(helmet());
app.use(createCors());
// LiveKit signs raw bytes — parse the status callback as a Buffer BEFORE
// express.json(), otherwise verification runs against re-serialized JSON and
// false-rejects on whitespace/key-order drift.
app.use(
  '/api/telemedicine/callbacks/status',
  express.raw({ type: 'application/json', limit: '1mb' })
);
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
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
    res.status(HTTP_STATUS.OK).json({ status: 'ok', service: 'telemedicine-service' });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'error',
      service: 'telemedicine-service',
      message: 'Dependency check failed',
    });
  }
});

app.use('/api/telemedicine', telemedicineRoutes);

app.use((_req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in telemedicine-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Telemedicine service listening on port ${PORT}`);
});

server.timeout = process.env.SERVER_TIMEOUT ? parseInt(process.env.SERVER_TIMEOUT, 10) : 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'telemedicine-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
