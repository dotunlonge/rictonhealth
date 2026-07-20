import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'wallet-service',
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
import walletRoutes from './routes/wallet.routes';

dotenv.config({ path: '../../.env' });

initSentry('wallet-service');

const app = express();
const PORT = process.env.PORT_WALLET || 3008;

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
    await checkRedis(redis);
    res.status(200).json({ status: 'ok', service: 'wallet-service' });
  } catch (error) {
    res
      .status(503)
      .json({ status: 'error', service: 'wallet-service', message: 'Dependency check failed' });
  }
});

app.use('/api/wallets', walletRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in wallet-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Wallet service listening on port ${PORT}`);
});

server.timeout = 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'wallet-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
