import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'messaging-service',
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
  checkRedis,
  redis,
} from '@ricton/shared';
import messagingRoutes from './routes/messaging.routes';

dotenv.config({ path: '../../.env' });

initSentry('messaging-service');

const app = express();
const PORT = process.env.PORT_MESSAGING || 3012;

app.set('trust proxy', true);
app.use(helmet());
app.use(createCors());
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await checkDatabase(prisma);
    await checkRedis(redis);
    res.status(200).json({
      status: 'ok',
      service: 'messaging-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
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
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Route not found', 404, 'ROUTE_NOT_FOUND'));
});

// Global error handler
app.use(errorResponse);

// Graceful shutdown
setupGracefulShutdown(app, redis, prisma);

app.listen(PORT, () => {
  logger.info(`💬 Messaging Service running on port ${PORT}`);
});

export default app;
