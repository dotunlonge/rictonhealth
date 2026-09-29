-- Compliance finale (#L1 consent history, #L3 erasure queue).
-- All statements are IF NOT EXISTS / guarded so reruns are safe.

-- #L1 Consent history table
CREATE TABLE IF NOT EXISTS "consent_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "consentedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "consent_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "consent_history_userId_consentedAt_idx" ON "consent_history"("userId", "consentedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consent_history_userId_fkey') THEN
    ALTER TABLE "consent_history" ADD CONSTRAINT "consent_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- #L3 Erasure queue table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ErasureStatus') THEN
    CREATE TYPE "ErasureStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "erasure_requests" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "ErasureStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erasure_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "erasure_requests_userId_key" ON "erasure_requests"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'erasure_requests_userId_fkey') THEN
    ALTER TABLE "erasure_requests" ADD CONSTRAINT "erasure_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
