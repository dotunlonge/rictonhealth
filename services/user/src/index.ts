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
import userRoutes from './routes/user.routes';

dotenv.config({ path: '../../.env' });

initSentry('user-service');

const app = express();
const PORT = process.env.PORT_USER || 3002;

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
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', service: 'user-service' });
  } catch (error) {
    res
      .status(503)
      .json({ status: 'error', service: 'user-service', message: 'Dependency check failed' });
  }
});

app.use('/api/users', userRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in user-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`User service listening on port ${PORT}`);
});

setupGracefulShutdown({
  app,
  server,
  serviceName: 'user-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
