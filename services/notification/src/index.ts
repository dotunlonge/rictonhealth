import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'notification-service',
  env: process.env.NODE_ENV || 'development',
});

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
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
import notificationRoutes from './routes/notification.routes';
import internalRoutes from './routes/internal.routes';
import { startJobProcessors } from '@ricton/shared/jobs';

dotenv.config({ path: '../../.env' });

initSentry('notification-service');

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 3016;

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
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(200).json({ status: 'ok', service: 'notification-service' });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'notification-service',
      message: 'Dependency check failed',
    });
  }
});

app.use('/api/internal', internalRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in notification-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Notification service listening on port ${PORT}`);
});

// Delivery workers (email/SMS/notification/webhook, subscription renewals,
// OTP outbox relay). In production Compose, the dedicated `worker` process
// owns these jobs; set START_WORKERS=false on notification-service to prevent
// duplicate worker polling, or leave unset in dev where notification-service runs them.
const shouldStartWorkers = process.env.START_WORKERS !== 'false';
const jobProcessors = shouldStartWorkers ? startJobProcessors() : {};

server.timeout = 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'notification-service',
  onShutdown: async () => {
    if (shouldStartWorkers) {
      await Promise.all(
        Object.values(jobProcessors).map((worker) =>
          (worker as { close: () => Promise<unknown> }).close()
        )
      );
    }
    await prisma.$disconnect();
    await redis.quit();
  },
});

export default app;
