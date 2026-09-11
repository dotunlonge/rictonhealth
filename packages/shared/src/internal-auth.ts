import crypto from 'crypto';

const MIN_INTERNAL_SECRET_LENGTH = 32;

type InternalAuthEnvironment = Record<string, string | undefined>;

export function getInternalApiSecret(environment: InternalAuthEnvironment = process.env): string {
  const secret = environment.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    throw new Error('INTERNAL_API_SECRET is not configured');
  }
  if (secret.length < MIN_INTERNAL_SECRET_LENGTH) {
    throw new Error(
      `INTERNAL_API_SECRET must be at least ${MIN_INTERNAL_SECRET_LENGTH} characters`
    );
  }
  return secret;
}

export function internalSecretMatches(
  presented: string | string[] | undefined,
  expected: string
): boolean {
  if (Array.isArray(presented) || !presented) return false;
  const candidate = presented.startsWith('Bearer ') ? presented.slice(7) : presented;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return (
    candidateBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
  );
}
