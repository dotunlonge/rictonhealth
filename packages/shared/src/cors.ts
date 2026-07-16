import cors from 'cors';

const isProduction = process.env.NODE_ENV === 'production';

function getDefaultOrigins(): string[] {
  if (isProduction) {
    return [];
  }
  return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:19006'];
}

export function createCors() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : getDefaultOrigins();

  if (isProduction && allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be set in production');
  }

  return cors({
    origin: allowedOrigins,
    credentials: true,
  });
}
