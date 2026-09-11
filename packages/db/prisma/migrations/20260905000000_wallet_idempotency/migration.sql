-- Wallet webhook idempotency: collapse duplicate (walletId, referenceId) credits
-- keeping the earliest row, then enforce uniqueness so concurrent webhook
-- deliveries cannot double-credit. NULL referenceIds are unaffected (Postgres
-- treats NULLs as distinct in unique constraints).

DELETE FROM "wallet_transactions" a
USING "wallet_transactions" b
WHERE a."walletId" = b."walletId"
  AND a."referenceId" IS NOT NULL
  AND a."referenceId" = b."referenceId"
  AND a."createdAt" > b."createdAt";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_walletId_referenceId_key"
  ON "wallet_transactions"("walletId", "referenceId");
