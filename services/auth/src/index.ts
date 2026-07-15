import 'dd-trace/init';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
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
} from '@ricton/shared';
import authRoutes from './routes/auth.routes';

dotenv.config({ path: '../../.env' });

initSentry('auth-service');

const app = express();
const PORT = process.env.PORT_AUTH || 3001;

app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json());
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
import { redis } from './config/redis';

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(200).json({ status: 'ok', service: 'auth-service' });
  } catch (error) {
    res
      .status(503)
      .json({ status: 'error', service: 'auth-service', message: 'Dependency check failed' });
  }
});

app.use('/api/auth', authRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in auth-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Auth service listening on port ${PORT}`);
});

setupGracefulShutdown({
  app,
  server,
  serviceName: 'auth-service',
  onShutdown: async () => {
    await prisma.$disconnect();
    await redis.quit();
  },
});
