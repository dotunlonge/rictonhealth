"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSentry = initSentry;
exports.setupGracefulShutdown = setupGracefulShutdown;
const Sentry = __importStar(require("@sentry/node"));
const logger_1 = require("./logger");
/**
 * Initializes Sentry if the DSN is provided.
 */
function initSentry(serviceName) {
    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV || 'development',
            tracesSampleRate: 1.0,
            serverName: serviceName,
        });
        logger_1.logger.info(`Sentry initialized for ${serviceName}`);
    }
}
/**
 * Sets up graceful shutdown hooks for the server.
 * Intercepts SIGTERM, SIGINT, uncaughtException, and unhandledRejection.
 */
function setupGracefulShutdown(options) {
    const { server, serviceName } = options;
    const shutdown = async (signal) => {
        logger_1.logger.info(`[${serviceName}] Received ${signal}. Starting graceful shutdown...`);
        // 1. Flush Sentry events
        if (process.env.SENTRY_DSN) {
            logger_1.logger.info(`[${serviceName}] Flushing Sentry events...`);
            await Sentry.close(2000);
        }
        // 2. Stop accepting new requests
        server.close(async (err) => {
            if (err) {
                logger_1.logger.error({ err }, `[${serviceName}] Error during server close`);
                process.exit(1);
            }
            logger_1.logger.info(`[${serviceName}] Server closed to new connections.`);
            // 3. Custom shutdown logic (e.g. Prisma disconnect)
            if (options.onShutdown) {
                try {
                    await options.onShutdown();
                    logger_1.logger.info(`[${serviceName}] Custom shutdown hooks executed.`);
                }
                catch (hookErr) {
                    logger_1.logger.error({ err: hookErr }, `[${serviceName}] Error executing custom shutdown hooks`);
                }
            }
            logger_1.logger.info(`[${serviceName}] Graceful shutdown completed. Exiting.`);
            process.exit(0);
        });
        // Force shutdown after 10 seconds if not already exited
        setTimeout(() => {
            logger_1.logger.error(`[${serviceName}] Forcefully terminating after 10s timeout.`);
            process.exit(1);
        }, 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', async (error) => {
        logger_1.logger.error({ err: error }, `[${serviceName}] UNCAUGHT EXCEPTION`);
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(error);
        }
        await shutdown('uncaughtException');
    });
    process.on('unhandledRejection', async (reason) => {
        logger_1.logger.error({ err: reason }, `[${serviceName}] UNHANDLED REJECTION`);
        if (process.env.SENTRY_DSN) {
            Sentry.captureException(reason);
        }
        await shutdown('unhandledRejection');
    });
}
//# sourceMappingURL=resilience.js.map