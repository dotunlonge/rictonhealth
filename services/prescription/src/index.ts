import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'prescription-service',
  env: process.env.NODE_ENV || 'development',
});

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { prisma } from '@ricton/db';
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
} from '@ricton/shared';
import prescriptionRoutes from './routes/prescription.routes';

dotenv.config({ path: '../../.env' });

initSentry('prescription-service');

const app = express();
const PORT = process.env.PORT_PRESCRIPTION || 3004;

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
    res.status(HTTP_STATUS.OK).json({ status: 'ok', service: 'prescription-service' });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'error',
      service: 'prescription-service',
      message: 'Dependency check failed',
    });
  }
});

app.use('/api/prescriptions', prescriptionRoutes);

app.use((_req: Request, res: Response) => {
  res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse('Endpoint not found', 'NOT_FOUND'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in prescription-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

const server = app.listen(PORT, () => {
  logger.info(`Prescription service listening on port ${PORT}`);
});

server.timeout = process.env.SERVER_TIMEOUT ? parseInt(process.env.SERVER_TIMEOUT, 10) : 30000;

setupGracefulShutdown({
  app,
  server,
  serviceName: 'prescription-service',
  onShutdown: async () => {
    await prisma.$disconnect();
  },
});
