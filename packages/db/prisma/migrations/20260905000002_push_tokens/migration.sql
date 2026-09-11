-- Push-token persistence: registered device tokens are stored (upserted) so
-- push delivery has something to send to. Previously registration only logged.

-- CreateTable
CREATE TABLE IF NOT EXISTS "push_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'mobile',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "push_tokens_userId_token_key" ON "push_tokens"("userId", "token");
CREATE INDEX IF NOT EXISTS "push_tokens_userId_isActive_idx" ON "push_tokens"("userId", "isActive");
