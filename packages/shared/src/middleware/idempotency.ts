import type { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';

const IN_PROGRESS_STATUS = 0;
const KEY_TTL_MS = 24 * 60 * 60 * 1000;

interface IdempotencyDelegate {
  create(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<{
    statusCode: number;
    response: unknown;
    method?: string;
    path?: string;
    requestHash?: string | null;
    createdAt?: Date;
  } | null>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

interface PrismaLike {
  idempotencyKey: IdempotencyDelegate;
}

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(',')}}`;
}

function requestFingerprint(body: unknown): string {
  return crypto
    .createHash('sha256')
    .update(stableJson(body ?? null))
    .digest('hex');
}

/**
 * Enforce `Idempotency-Key` on replay-sensitive commands.
 *
 * - No header → pass through (web clients migrate separately; mobile always sends).
 * - First sight of key → create in-progress row, wrap `res.json` to store the
 *   response for replay, then run the handler.
 * - Repeated key with stored response → replay identical status + body.
 * - Repeated key while first request is in flight → 409 IDEMPOTENT_REQUEST_IN_PROGRESS.
 * - Rows older than 24h are treated as expired (deleted, request runs fresh).
 */
export function idempotency(prisma: PrismaLike) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const res = _res as Response & { json: (body: unknown) => Response };
    const raw = req.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || typeof key !== 'string' || key.length === 0 || key.length > 255) {
      next();
      return;
    }

    const user = (req as unknown as { user?: { userId?: string } }).user;
    const userId = user?.userId;
    if (!userId) {
      next();
      return;
    }

    const where = { userId_key: { userId, key } };
    const method = req.method.toUpperCase();
    const path = `${req.baseUrl || ''}${req.path}` || req.path;
    const requestHash = requestFingerprint(req.body);

    let registered = false;
    for (let attempt = 0; attempt < 2 && !registered; attempt += 1) {
      try {
        await prisma.idempotencyKey.create({
          data: { userId, key, method, path, requestHash, statusCode: IN_PROGRESS_STATUS },
        });
        registered = true;
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const existing = await prisma.idempotencyKey.findUnique({ where });

        if (existing && isExpired(existing)) {
          await prisma.idempotencyKey.delete({ where });
          continue;
        }

        if (existing && (existing.method !== method || existing.path !== path)) {
          res.status(409).json({
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: 'This Idempotency-Key was already used for a different endpoint.',
            },
          });
          return;
        }

        if (existing?.requestHash && existing.requestHash !== requestHash) {
          res.status(409).json({
            success: false,
            error: {
              code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
              message: 'This Idempotency-Key was already used with a different request payload.',
            },
          });
          return;
        }

        if (!existing || existing.response == null || existing.statusCode === IN_PROGRESS_STATUS) {
          res.status(409).json({
            success: false,
            error: {
              code: 'IDEMPOTENT_REQUEST_IN_PROGRESS',
              message: 'The original request is still processing. Retry with the same key.',
            },
          });
          return;
        }

        res.status(existing.statusCode).json(existing.response);
        return;
      }
    }

    if (!registered) {
      res.status(409).json({
        success: false,
        error: {
          code: 'IDEMPOTENT_REQUEST_IN_PROGRESS',
          message: 'The request could not acquire its idempotency key. Please retry.',
        },
      });
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      void prisma.idempotencyKey
        .update({ where, data: { statusCode: res.statusCode, response: (body ?? null) as never } })
        .then(() => originalJson(body))
        .catch(async () => {
          await prisma.idempotencyKey.delete({ where }).catch(() => undefined);
          return originalJson(body);
        });
      return res;
    }) as Response['json'];

    next();
  };
}

function isExpired(row: { createdAt?: unknown }): boolean {
  if (!row.createdAt) return false;
  const created = new Date(row.createdAt as string | number | Date).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created > KEY_TTL_MS;
}
