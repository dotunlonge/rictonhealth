import { z } from 'zod';

const DAY_MS = 24 * 60 * 60 * 1000;

const AnalyticsRangeQuerySchema = z
  .object({
    range: z.enum(['7d', '30d', '90d', '12m', 'all']).default('30d'),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && new Date(value.from) > new Date(value.to)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: '`to` must be on or after `from`',
      });
    }
  });

export type AnalyticsTimeWindow = {
  since?: Date;
  until?: Date;
  createdAt?: { gte?: Date; lte?: Date };
};

export function parseAnalyticsTimeWindow(
  query: unknown,
  now: Date = new Date()
): AnalyticsTimeWindow {
  const parsed = AnalyticsRangeQuerySchema.parse(query);
  const until = parsed.to ? new Date(parsed.to) : undefined;
  const anchor = until ?? now;
  const days = { '7d': 7, '30d': 30, '90d': 90, '12m': 365, all: 0 }[parsed.range];
  const since = parsed.from
    ? new Date(parsed.from)
    : days
      ? new Date(anchor.getTime() - days * DAY_MS)
      : undefined;
  const createdAt =
    since || until
      ? { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) }
      : undefined;

  return { since, until, createdAt };
}
