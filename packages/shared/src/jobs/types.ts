export interface EmailJob {
  to: string;
  templateId?: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SmsJob {
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationJob {
  userId: string;
  type: string;
  title: string;
  body: string;
  channel: 'IN_APP' | 'PUSH' | 'SMS' | 'EMAIL';
  metadata?: Record<string, unknown>;
}

export interface WebhookJob {
  url: string;
  payload: unknown;
  secret?: string;
  headers?: Record<string, string>;
}
