import dotenv from 'dotenv';
import path from 'path';

// Repo-root .env first (works from src/ and dist/ alike), then an optional
// service-local override. Must run before any @ricton/* import
// (shared/otp.ts throws at import time without secrets).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { prisma } from '@ricton/db';
import { redis } from '@ricton/shared';
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
  checkRedis,
} from '@ricton/shared';
import messagingRoutes from './routes/messaging.routes';

initSentry('messaging-service');

const app = express();
// Canonical: PORT_MESSAGING (repo PORT_* convention). MESSAGING_PORT is accepted
// as a legacy fallback so existing prod envs keep working.
const PORT = process.env.PORT_MESSAGING || process.env.MESSAGING_PORT || 3012;

app.set('trust proxy', true);
app.use(helmet());
app.use(createCors());
app.use(express.json({ limit: '5mb' }));
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
    await checkRedis(redis);
    res.status(HTTP_STATUS.OK).json({
      status: 'ok',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Messaging routes
app.use('/api/messages', messagingRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Route not found', 'NOT_FOUND'));
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in messaging-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`💬 Messaging Service running on port ${PORT}`);
});

server.timeout = process.env.SERVER_TIMEOUT ? parseInt(process.env.SERVER_TIMEOUT, 10) : 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'messaging-service',
  onShutdown: async () => {
    await prisma.$disconnect();
    await redis.quit();
  },
});

export default app;
