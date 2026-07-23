import { Queue } from 'bullmq';
export declare const emailQueue: Queue<any, any, string, any, any, string>;
export declare const smsQueue: Queue<any, any, string, any, any, string>;
export declare const notificationQueue: Queue<any, any, string, any, any, string>;
export declare const webhookQueue: Queue<any, any, string, any, any, string>;
