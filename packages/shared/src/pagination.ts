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
