"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCursorKey = createCursorKey;
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
function createCursorKey(baseKey, cursor, limit) {
    const cursorPart = cursor ? `:cursor:${cursor}` : '';
    return `${baseKey}:${limit}${cursorPart}`;
}
function encodeCursor(id, timestamp) {
    return Buffer.from(`${id}:${timestamp}`).toString('base64url');
}
function decodeCursor(cursor) {
    try {
        const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
        const [id, timestamp] = decoded.split(':');
        if (!id || !timestamp)
            return null;
        return { id, timestamp };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=pagination.js.map