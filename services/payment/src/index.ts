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
import paymentRoutes from './routes/payment.routes';

dotenv.config({ path: '../../.env' });

initSentry('payment-service');

const app = express();
const PORT = process.env.PORT_PAYMENT || 3004;

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
  res.status(200).json({ status: 'ok', service: 'payment-service' });
});

app.use('/api/payments', paymentRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in payment-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Payment service listening on port ${PORT}`);
});

setupGracefulShutdown({
  app,
  server,
  serviceName: 'payment-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
