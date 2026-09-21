import dotenv from 'dotenv';
import path from 'path';

// Repo-root .env first (works from src/ and dist/ alike), then an optional
// service-local override. Must run before dd-trace init and before any
// @ricton/* import (shared/otp.ts throws at import time without secrets).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'subscription-service',
  env: process.env.NODE_ENV || 'development',
});

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { prisma } from '@ricton/db';
import { redis } from '@ricton/shared';
import {
  errorResponse,
  AppError,
  httpLogger,
  logger,
  initSentry,
  setupGracefulShutdown,
  createCors,
} from '@ricton/shared';
import subscriptionRoutes from './routes/subscription.routes';

initSentry('subscription-service');

const app = express();
const PORT = process.env.PORT_SUBSCRIPTION || 3009;

app.set('trust proxy', true);
app.use(helmet());
app.use(createCors());
// Paystack signs raw bytes — parse webhook as Buffer BEFORE express.json().
app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
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
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(200).json({ status: 'ok', service: 'subscription-service' });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'subscription-service',
      message: 'Dependency check failed',
    });
  }
});

app.use('/api/subscriptions', subscriptionRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in subscription-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Subscription service listening on port ${PORT}`);
});

server.timeout = 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'subscription-service',
  onShutdown: async () => {
    await prisma.$disconnect();
    await redis.quit();
  },
});

export default app;
