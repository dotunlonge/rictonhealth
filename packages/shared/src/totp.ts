import crypto from 'crypto';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode a Buffer into a Base32 string (RFC 4648)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode a Base32 string into a Buffer (RFC 4648)
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a cryptographically secure Base32 TOTP secret (20 bytes = 160 bits)
 */
export function generateTotpSecret(bytes = 20): string {
  const randomBuffer = crypto.randomBytes(bytes);
  return base32Encode(randomBuffer);
}

/**
 * Generate a 6-digit TOTP token (RFC 6238)
 */
export function generateTotpToken(
  secret: string,
  timeInSeconds = Math.floor(Date.now() / 1000),
  step = 30,
  digits = 6
): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timeInSeconds / step);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify a TOTP token against a secret with a time-step window tolerance (default ±1 = ±30s)
 */
export function verifyTotpToken(
  token: string,
  secret: string,
  window = 1,
  timeInSeconds = Math.floor(Date.now() / 1000),
  step = 30,
  digits = 6
): boolean {
  if (!token || !secret) return false;
  const cleanToken = token.trim();
  if (cleanToken.length !== digits || !/^\d+$/.test(cleanToken)) return false;

  try {
    for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
      const checkTime = timeInSeconds + errorWindow * step;
      const expectedToken = generateTotpToken(secret, checkTime, step, digits);

      if (
        crypto.timingSafeEqual(
          Buffer.from(cleanToken, 'utf-8'),
          Buffer.from(expectedToken, 'utf-8')
        )
      ) {
        return true;
      }
    }
  } catch (_err) {
    return false;
  }

  return false;
}

/**
 * Build otpauth:// URI for authenticator apps
 */
export function getTotpAuthUrl(label: string, secret: string, issuer = 'Ricton Health'): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

function getTotpEncryptionKey(): Buffer {
  const raw =
    process.env.TOTP_ENCRYPTION_KEY || process.env.OTP_SECRET || process.env.JWT_SECRET || '';
  if (!raw) {
    throw new Error('FATAL: TOTP_ENCRYPTION_KEY (or OTP_SECRET/JWT_SECRET fallback) is missing.');
  }
  // Derive a stable 32-byte key from arbitrary-length secret.
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a TOTP secret at rest (AES-256-GCM). Returns `enc:<iv>:<tag>:<data>`.
 */
export function encryptTotpSecret(secret: string): string {
  const key = getTotpEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/**
 * Decrypt a value produced by encryptTotpSecret. Transparently returns
 * legacy plaintext Base32 secrets so existing rows keep working until re-enrolled.
 */
export function decryptTotpSecret(stored: string): string {
  if (!stored.startsWith('enc:')) return stored;
  const parts = stored.split(':');
  if (parts.length !== 4) throw new Error('Malformed encrypted TOTP secret');
  const key = getTotpEncryptionKey();
  const iv = Buffer.from(parts[1], 'base64');
  const tag = Buffer.from(parts[2], 'base64');
  const data = Buffer.from(parts[3], 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
