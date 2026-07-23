import ddTrace from 'dd-trace';

ddTrace.init({
  service: 'messaging-service',
  env: process.env.NODE_ENV || 'development',
});

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
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
  validateEnv,
} from '@ricton/shared';
import messagingRoutes from './routes/messaging.routes';

dotenv.config({ path: '../../.env' });

validateEnv();

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
 * */
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
  } catch (error: unknown) {
    logger.error({ err: error }, 'Health check failed');
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
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in messaging-service');
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code, err.details));
  } else {
    res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  }
});

// Create HTTP server wrapper for WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.use((socket, next) => {
  const token =
    socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
  if (!token) {
    return next(new Error('Authentication error'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
    socket.data.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} (user: ${socket.data.user?.userId})`);

  socket.on('join', (threadId: string) => {
    socket.join(threadId);
    logger.info(`User ${socket.data.user?.userId} joined room/thread ${threadId}`);
  });

  socket.on('leave', (threadId: string) => {
    socket.leave(threadId);
    logger.info(`User ${socket.data.user?.userId} left room/thread ${threadId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Graceful shutdown
server.listen(PORT, () => {
  logger.info(`💬 Messaging Service running on port ${PORT}`);
});

setupGracefulShutdown({
  server,
  serviceName: 'messaging-service',
  onShutdown: async () => {
    await prisma.$disconnect();
    await redis.quit();
  },
});

export default app;
