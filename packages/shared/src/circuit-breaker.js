"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioBreaker = exports.paystackBreaker = void 0;
exports.createCircuitBreaker = createCircuitBreaker;
// @ts-ignore
const opossum_1 = __importDefault(require("opossum"));
const logger_1 = require("./logger");
function createCircuitBreaker(action, options = {}) {
    const { timeout = 5000, errorThresholdPercentage = 50, resetTimeout = 30000, volumeThreshold = 10, } = options;
    const breaker = new opossum_1.default(action, {
        timeout,
        errorThresholdPercentage,
        resetTimeout,
        volumeThreshold,
    });
    breaker.on('open', () => {
        logger_1.logger.warn('Circuit breaker opened - service unavailable');
    });
    breaker.on('halfOpen', () => {
        logger_1.logger.info('Circuit breaker half-open - testing service');
    });
    breaker.on('close', () => {
        logger_1.logger.info('Circuit breaker closed - service recovered');
    });
    breaker.on('failure', (error) => {
        logger_1.logger.error({ err: error }, 'Circuit breaker recorded failure');
    });
    return breaker;
}
exports.paystackBreaker = createCircuitBreaker(async (url, options) => {
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
}, { timeout: 10000, errorThresholdPercentage: 60, resetTimeout: 30000 });
exports.twilioBreaker = createCircuitBreaker(async (url, options) => {
    const res = await fetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
}, { timeout: 10000, errorThresholdPercentage: 60, resetTimeout: 30000 });
//# sourceMappingURL=circuit-breaker.js.map