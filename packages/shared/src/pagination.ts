export interface CursorPaginationOptions {
  limit: number;
  cursor?: string;
  cursorField?: string;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function parsePage(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function parseOffset(value: unknown): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function parseLimit(value: unknown, defaultLimit = 20, maxLimit = 200): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(parsed, maxLimit);
}

export function createCursorKey(
  baseKey: string,
  cursor: string | undefined,
  limit: number
): string {
  const cursorPart = cursor ? `:cursor:${cursor}` : '';
  return `${baseKey}:${limit}${cursorPart}`;
}

export function encodeCursor(id: string, timestamp: string): string {
  return Buffer.from(`${id}:${timestamp}`).toString('base64url');
}

export function decodeCursor(cursor: string): { id: string; timestamp: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const [id, timestamp] = decoded.split(':');
    if (!id || !timestamp) return null;
    return { id, timestamp };
  } catch {
    return null;
  }
}
