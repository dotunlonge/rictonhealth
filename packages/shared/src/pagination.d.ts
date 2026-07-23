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
export declare function createCursorKey(baseKey: string, cursor: string | undefined, limit: number): string;
export declare function encodeCursor(id: string, timestamp: string): string;
export declare function decodeCursor(cursor: string): {
    id: string;
    timestamp: string;
} | null;
