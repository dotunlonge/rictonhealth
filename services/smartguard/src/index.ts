import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'smartguard-service',
  env: process.env.NODE_ENV || 'development',
});
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
} from '@ricton/shared';
import smartguardRoutes from './routes/smartguard.routes';

dotenv.config({ path: '../../.env' });

initSentry('smartguard-service');

const app = express();
const PORT = process.env.PORT_SMARTGUARD || 3017;

app.set('trust proxy', true);
app.use(helmet());
app.use(createCors());
app.use(express.json({ limit: '1mb' }));
app.use(httpLogger);

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.status(HTTP_STATUS.OK).json({ status: 'ok', service: 'smartguard-service' });
  } catch (error) {
    res
      .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
      .json({ status: 'error', service: 'smartguard-service', message: 'Dependency check failed' });
  }
});

app.use('/api/smartguard', smartguardRoutes);

app.use((_req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in smartguard-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Smartguard service listening on port ${PORT}`);
});

server.timeout = process.env.SERVER_TIMEOUT ? parseInt(process.env.SERVER_TIMEOUT, 10) : 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'smartguard-service',
  onShutdown: async () => {
    await prisma.$disconnect();
    await redis.quit();
  },
});
