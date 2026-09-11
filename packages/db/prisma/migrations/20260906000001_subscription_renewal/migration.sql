-- Renewal worker state: dunning attempts drive ACTIVE(autoRenew) →
-- invoice → (3 ignored invoices past expiry) → CANCELLED transitions.

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "renewalAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastRenewalAttemptAt" TIMESTAMPTZ(6);
