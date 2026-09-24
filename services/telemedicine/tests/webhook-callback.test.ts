// Load the repo .env first (same DATABASE_URL the other suites use via
// Prisma), then pin test secrets. Runs before the @ricton/shared mock
// factory below, which validates env at import time.
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.LIVEKIT_URL = 'https://test.livekit.local';
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-32-chars-minimum-xxxx';

import crypto from 'crypto';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import { errorResponse } from '@ricton/shared';
import telemedicineRoutes from '../src/routes/telemedicine.routes';

jest.mock('@ricton/shared', () => {
  const actual = jest.requireActual('../../../packages/shared/src/index');
  const { createRedisMock } = jest.requireActual(
    '../../../packages/shared/src/__tests__/helpers/redis-mock'
  );
  return {
    __esModule: true,
    ...actual,
    redis: createRedisMock(),
  };
});

jest.mock('livekit-server-sdk', () => ({
  __esModule: true,
  AccessToken: jest.fn(),
  RoomServiceClient: jest.fn(),
}));

/** Mirror of services/telemedicine/src/index.ts middleware order. */
function buildWebhookApp(rawType: string | ((req: Request) => boolean)): Express {
  const app = express();
  app.use(
    '/api/telemedicine/callbacks/status',
    express.raw({ type: rawType as never, limit: '1mb' })
  );
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/telemedicine', telemedicineRoutes);
  app.use(
    (
      err: Error & { statusCode?: number; code?: string },
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
    }
  );
  return app;
}

const SECRET = 'test-secret-32-chars-minimum-xxxx';
const payload = JSON.stringify({
  event: 'room_finished',
  room: { name: 'room-that-does-not-exist' },
});
const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64');

describe('LiveKit status callback webhook (TDD RED)', () => {
  it('accepts a valid signature', async () => {
    const app = buildWebhookApp('application/json');
    const res = await request(app)
      .post('/api/telemedicine/callbacks/status')
      .set('Content-Type', 'application/json')
      .set('Authorization', signature)
      .send(payload);
    expect(res.status).toBe(200);
  });

  it('rejects an invalid signature', async () => {
    const app = buildWebhookApp('application/json');
    const res = await request(app)
      .post('/api/telemedicine/callbacks/status')
      .set('Content-Type', 'application/json')
      .set('Authorization', 'bogus-signature')
      .send(payload);
    expect(res.status).toBe(403);
  });

  it('rejects a missing signature', async () => {
    const app = buildWebhookApp('application/json');
    const res = await request(app)
      .post('/api/telemedicine/callbacks/status')
      .set('Content-Type', 'application/json')
      .send(payload);
    expect(res.status).toBe(403);
  });

  it('accepts a valid signature with a charset content-type suffix', async () => {
    // LiveKit/proxies may send `application/json; charset=utf-8`. The raw
    // body parser must still capture bytes, or HMAC false-rejects.
    const app = buildWebhookApp('application/json');
    const res = await request(app)
      .post('/api/telemedicine/callbacks/status')
      .set('Content-Type', 'application/json; charset=utf-8')
      .set('Authorization', signature)
      .send(payload);
    expect(res.status).toBe(200);
  });
});
