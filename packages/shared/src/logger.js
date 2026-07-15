"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const pino_http_1 = __importDefault(require("pino-http"));
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
// In production, we output raw JSON for Datadog.
// In development, we use pino-pretty for readable console output.
exports.logger = (0, pino_1.default)({
    level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
    transport: !isProduction && !isTest
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
exports.httpLogger = (0, pino_http_1.default)({
    logger: exports.logger,
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
        }
        else if (res.statusCode >= 500 || err) {
            return 'error';
        }
        return 'info';
    },
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} completed with status ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} failed with status ${res.statusCode}: ${err.message}`;
    },
});
//# sourceMappingURL=logger.js.map