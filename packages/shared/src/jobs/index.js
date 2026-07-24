"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookQueue = exports.notificationQueue = exports.smsQueue = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
const defaultJobOptions = {
    removeOnComplete: 100,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000,
    },
};
exports.emailQueue = new bullmq_1.Queue('email', { connection: redis_1.redis, defaultJobOptions });
exports.smsQueue = new bullmq_1.Queue('sms', { connection: redis_1.redis, defaultJobOptions });
exports.notificationQueue = new bullmq_1.Queue('notification', {
    connection: redis_1.redis,
    defaultJobOptions,
});
exports.webhookQueue = new bullmq_1.Queue('webhook', { connection: redis_1.redis, defaultJobOptions });
//# sourceMappingURL=index.js.map