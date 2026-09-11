import cors from 'cors';

const isProduction = process.env.NODE_ENV === 'production';

function getDefaultOrigins(): string[] {
  if (isProduction) {
    return [];
  }
  return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:19006'];
}

export function createCors() {
  const rawOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
    : getDefaultOrigins();

  const allowedOrigins = rawOrigins.filter(Boolean);

  if (isProduction) {
    if (allowedOrigins.length === 0) {
      throw new Error('ALLOWED_ORIGINS must be set in production');
    }

    for (const origin of allowedOrigins) {
      if (origin === '*' || origin === 'null') {
        throw new Error(`Insecure origin "${origin}" is not allowed in production`);
      }
      try {
        const url = new URL(origin);
        if (url.protocol !== 'https:') {
          throw new Error(`Insecure protocol in production origin: ${origin}`);
        }
      } catch (err) {
        throw new Error(`Invalid origin format: ${origin}`);
      }
    }
  }

  return cors({
    origin: allowedOrigins,
    credentials: true,
  });
}
