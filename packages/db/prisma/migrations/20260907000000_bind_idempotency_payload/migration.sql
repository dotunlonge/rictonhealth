-- Bind every new idempotent command to its canonical request payload. Existing
-- rows remain nullable and expire naturally after the middleware's 24-hour TTL.
ALTER TABLE "idempotency_keys" ADD COLUMN IF NOT EXISTS "requestHash" TEXT;
