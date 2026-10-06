import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { prisma } from '@ricton/db';
import { redis } from '@ricton/shared';
import { HTTP_STATUS, checkDatabase, checkRedis, createCors, logger } from '@ricton/shared';
import * as Sentry from '@sentry/node';
import adminRoutes from './routes/admin.routes';

const app = express();
const PORT = process.env.PORT_ADMIN || 3010;

// Initialize Sentry (#103: 0.1 traces sample in prod).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: Number(
    process.env.SENTRY_TRACES_SAMPLE_RATE ?? (process.env.NODE_ENV === 'production' ? 0.1 : 1.0)
  ),
});

// Middleware
app.use(helmet());
app.use(createCors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// #104 minimal Prometheus counter stub (no prom-client dep: single
// http_requests_total counter; /metrics renders exposition format).
const httpRequestsTotal = (() => {
  let count = 0;
  return {
    inc: () => {
      count += 1;
    },
    render: () =>
      [
        '# HELP http_requests_total Total HTTP requests received.',
        '# TYPE http_requests_total counter',
        `http_requests_total{service="admin"} ${count}`,
      ].join('\n'),
  };
})();

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path, ip: req.ip });
  // #104 minimal Prometheus counter stub (per-process, resets on restart).
  httpRequestsTotal.inc();
  next();
});

// Routes
app.use('/api/admin', adminRoutes);

// #104 metrics stub for Prometheus scraping (CloudWatch alarms in
// infra/terraform/alarms.tf consume ALB 5xx/latency, not this endpoint).
app.get('/metrics', (_req: Request, res: Response) => {
  res.type('text/plain').send(`${httpRequestsTotal.render()}\n`);
});

// Liveness: cheap, dependency-free — a DB/Redis blip must NOT restart pods.
// (values.yaml livenessProbe -> /health.)
app.get('/health', (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'ok',
    service: 'admin',
    timestamp: new Date().toISOString(),
  });
});

// #107 Force-update gate (public, no auth — mobile checks this pre-login on
// launch and blocks when its build is below minSupported). Kept at the
// service root next to /health on purpose: everything under /api/admin is
// behind requireAuth, which would lock out logged-out / must-update clients.
// The gateway exposes this at /api/version (kong.yml version-route with
// strip_path so /api/version lands here). Tune via MIN_APP_VERSION_* /
// LATEST_APP_VERSION (defaults mirror apps/mobile/app.json version).
app.get('/version', (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    service: 'admin',
    latest: process.env.LATEST_APP_VERSION ?? '1.0.0',
    minSupported: {
      ios: process.env.MIN_APP_VERSION_IOS ?? '1.0.0',
      android: process.env.MIN_APP_VERSION_ANDROID ?? '1.0.0',
      web: process.env.MIN_APP_VERSION_WEB ?? '1.0.0',
    },
    timestamp: new Date().toISOString(),
  });
});

// Readiness: dependency-aware (503 when DB or Redis is unreachable so the
// orchestrator stops routing traffic to an unhealthy instance).
// (values.yaml readinessProbe -> /ready.)
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    await checkDatabase(prisma);
    await checkRedis(redis);
    res.status(HTTP_STATUS.OK).json({
      status: 'ok',
      service: 'admin',
      timestamp: new Date().toISOString(),
      dependencies: { database: 'connected', redis: 'connected' },
    });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'unhealthy',
      service: 'admin',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Admin Service running on port ${PORT}`);
});

export default app;
