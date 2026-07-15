"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function successResponse(data, meta) {
    return {
        success: true,
        data,
        ...(meta ? { meta } : {}),
    };
}
function errorResponse(message, code = 'INTERNAL_ERROR', details) {
    return {
        success: false,
        error: {
            code,
            message,
            ...(details ? { details } : {}),
        },
    };
}
//# sourceMappingURL=response.js.map