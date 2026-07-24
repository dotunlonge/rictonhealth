"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timingSafeEqual = timingSafeEqual;
const crypto_1 = __importDefault(require("crypto"));
function timingSafeEqual(a, b) {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
        // Still do a comparison to prevent timing attack on length
        crypto_1.default.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
//# sourceMappingURL=timing-safe-equal.js.map