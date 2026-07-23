"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const shared_1 = require("@ricton/shared");
const db_1 = require("@ricton/db");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}
const requireAuth = async (req, _res, next) => {
    // If request comes through Kong and Kong handles JWT validation, Kong will set specific headers.
    // We can either rely on Kong or do a local check. For safety, we verify here as well or read Kong headers.
    // For MVP, we check the Authorization header directly here.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new shared_1.UnauthorizedError('Missing or invalid Authorization header'));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.iss !== 'ricton-issuer') {
            return next(new shared_1.UnauthorizedError('Invalid issuer'));
        }
        // 1. Check if token is explicitly blacklisted (e.g. from logout)
        const isBlacklisted = await shared_1.redis.get(`blacklist:token:${token}`);
        if (isBlacklisted) {
            return next(new shared_1.UnauthorizedError('Token has been revoked'));
        }
        // 2. Check for live user status override (for instant suspension)
        const liveStatus = await shared_1.redis.get(`user:status:${decoded.userId}`);
        if (liveStatus === db_1.UserStatus.SUSPENDED || liveStatus === db_1.UserStatus.DEACTIVATED) {
            return next(new shared_1.ForbiddenError('Account is suspended or deactivated'));
        }
        // 3. Fallback to token payload status if no live status override exists
        if (!liveStatus &&
            (decoded.status === db_1.UserStatus.SUSPENDED || decoded.status === db_1.UserStatus.DEACTIVATED)) {
            return next(new shared_1.ForbiddenError('Account is suspended or deactivated'));
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        next(new shared_1.UnauthorizedError('Invalid or expired token'));
    }
};
exports.requireAuth = requireAuth;
const requireRole = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new shared_1.UnauthorizedError('Authentication required'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new shared_1.ForbiddenError('You do not have permission to perform this action'));
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=index.js.map