"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCors = createCors;
const cors_1 = __importDefault(require("cors"));
const isProduction = process.env.NODE_ENV === 'production';
function getDefaultOrigins() {
    if (isProduction) {
        return [];
    }
    return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:19006'];
}
function createCors() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : getDefaultOrigins();
    if (isProduction && allowedOrigins.length === 0) {
        throw new Error('ALLOWED_ORIGINS must be set in production');
    }
    return (0, cors_1.default)({
        origin: allowedOrigins,
        credentials: true,
    });
}
//# sourceMappingURL=cors.js.map