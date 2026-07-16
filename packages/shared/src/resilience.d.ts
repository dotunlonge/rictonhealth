import { Application } from 'express';
import { Server } from 'http';
export interface ServerShutdownOptions {
    app?: Application;
    server: Server;
    serviceName: string;
    onShutdown?: () => Promise<void>;
}
/**
 * Initializes Sentry if the DSN is provided.
 */
export declare function initSentry(serviceName: string): void;
/**
 * Sets up graceful shutdown hooks for the server.
 * Intercepts SIGTERM, SIGINT, uncaughtException, and unhandledRejection.
 */
export declare function setupGracefulShutdown(options: ServerShutdownOptions): void;
