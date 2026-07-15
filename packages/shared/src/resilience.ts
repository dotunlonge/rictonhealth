import * as Sentry from '@sentry/node';
import { Application } from 'express';
import { Server } from 'http';
import { logger } from './logger';

export interface ServerShutdownOptions {
  app: Application;
  server: Server;
  serviceName: string;
  onShutdown?: () => Promise<void>;
}

/**
 * Initializes Sentry if the DSN is provided.
 */
export function initSentry(serviceName: string) {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
      serverName: serviceName,
    });
    logger.info(`Sentry initialized for ${serviceName}`);
  }
}

/**
 * Sets up graceful shutdown hooks for the server.
 * Intercepts SIGTERM, SIGINT, uncaughtException, and unhandledRejection.
 */
export function setupGracefulShutdown(options: ServerShutdownOptions) {
  const { server, serviceName } = options;
  const shutdown = async (signal: string) => {
    logger.info(`[${serviceName}] Received ${signal}. Starting graceful shutdown...`);

    // 1. Flush Sentry events
    if (process.env.SENTRY_DSN) {
      logger.info(`[${serviceName}] Flushing Sentry events...`);
      await Sentry.close(2000);
    }

    // 2. Stop accepting new requests
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, `[${serviceName}] Error during server close`);
        process.exit(1);
      }
      logger.info(`[${serviceName}] Server closed to new connections.`);

      // 3. Custom shutdown logic (e.g. Prisma disconnect)
      if (options.onShutdown) {
        try {
          await options.onShutdown();
          logger.info(`[${serviceName}] Custom shutdown hooks executed.`);
        } catch (hookErr) {
          logger.error({ err: hookErr }, `[${serviceName}] Error executing custom shutdown hooks`);
        }
      }

      logger.info(`[${serviceName}] Graceful shutdown completed. Exiting.`);
      process.exit(0);
    });

    // Force shutdown after 10 seconds if not already exited
    setTimeout(() => {
      logger.error(`[${serviceName}] Forcefully terminating after 10s timeout.`);
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', async (error) => {
    logger.error({ err: error }, `[${serviceName}] UNCAUGHT EXCEPTION`);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    await shutdown('uncaughtException');
  });

  process.on('unhandledRejection', async (reason) => {
    logger.error({ err: reason }, `[${serviceName}] UNHANDLED REJECTION`);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(reason);
    }
    await shutdown('unhandledRejection');
  });
}
