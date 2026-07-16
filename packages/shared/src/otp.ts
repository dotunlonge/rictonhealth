import crypto from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET;

if (!OTP_SECRET) {
  throw new Error('FATAL: OTP_SECRET or JWT_SECRET environment variable is missing.');
}

const HMAC_SECRET: string = OTP_SECRET;

export function hashOtp(otp: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(otp).digest('hex');
}

export function verifyOtp(storedHash: string, otp: string): boolean {
  const inputHash = hashOtp(otp);
  if (storedHash.length !== inputHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(inputHash));
}
