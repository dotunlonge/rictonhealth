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
import walletRoutes from './routes/wallet.routes';

dotenv.config({ path: '../../.env' });

initSentry('wallet-service');

const app = express();
const PORT = process.env.PORT_WALLET || 3008;

app.use(helmet());
app.use(cors());
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
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'wallet-service' });
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

setupGracefulShutdown({
  app,
  server,
  serviceName: 'wallet-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
