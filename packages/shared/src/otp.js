"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashOtp = hashOtp;
exports.verifyOtp = verifyOtp;
const crypto_1 = __importDefault(require("crypto"));
const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET;
if (!OTP_SECRET) {
    throw new Error('FATAL: OTP_SECRET or JWT_SECRET environment variable is missing.');
}
const HMAC_SECRET = OTP_SECRET;
function hashOtp(otp) {
    return crypto_1.default.createHmac('sha256', HMAC_SECRET).update(otp).digest('hex');
}
function verifyOtp(storedHash, otp) {
    const inputHash = hashOtp(otp);
    if (storedHash.length !== inputHash.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(Buffer.from(storedHash), Buffer.from(inputHash));
}
//# sourceMappingURL=otp.js.map