-- Catch-up migration: align the database with schema.prisma.
-- Generated via `prisma migrate diff` (from-migrations → schema) and reviewed.
-- Covers: wallets.balance, audit/hospital/pharmacy/provider drift columns,
-- missing FK/index coverage, the reward M2M rename (rows preserved), and the
-- push_tokens FK. Replaces ad-hoc `db push --accept-data-loss` usage.

-- DropForeignKey
ALTER TABLE "_RewardCatalogToUser" DROP CONSTRAINT "_RewardCatalogToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_RewardCatalogToUser" DROP CONSTRAINT "_RewardCatalogToUser_B_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "hospitals" ADD COLUMN     "departments" JSONB,
ADD COLUMN     "documents" JSONB,
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationNumber" TEXT;

-- AlterTable
ALTER TABLE "pharmacy_profiles" ADD COLUMN     "bankDetails" JSONB,
ADD COLUMN     "documents" JSONB,
ADD COLUMN     "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "documents" JSONB,
ADD COLUMN     "idVerifiedAt" TIMESTAMPTZ(6),
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "_RewardRedeemedBy" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- MoveTableData: preserve redemptions across the implicit M2M rename
INSERT INTO "_RewardRedeemedBy" ("A", "B")
SELECT "A", "B" FROM "_RewardCatalogToUser"
ON CONFLICT DO NOTHING;

-- DropTable
DROP TABLE "_RewardCatalogToUser";

-- CreateIndex
CREATE UNIQUE INDEX "_RewardRedeemedBy_AB_unique" ON "_RewardRedeemedBy"("A", "B");

-- CreateIndex
CREATE INDEX "_RewardRedeemedBy_B_index" ON "_RewardRedeemedBy"("B");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_providerId_scheduledAt_idx" ON "appointments"("providerId", "scheduledAt");

-- CreateIndex
CREATE INDEX "appointments_hospitalId_idx" ON "appointments"("hospitalId");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_threadId_createdAt_idx" ON "chat_messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- CreateIndex
CREATE INDEX "payments_providerReference_idx" ON "payments"("providerReference");

-- CreateIndex
CREATE INDEX "pharmacy_orders_patientId_idx" ON "pharmacy_orders"("patientId");

-- CreateIndex
CREATE INDEX "pharmacy_orders_pharmacyId_idx" ON "pharmacy_orders"("pharmacyId");

-- CreateIndex
CREATE INDEX "pharmacy_orders_status_idx" ON "pharmacy_orders"("status");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_providerId_idx" ON "prescriptions"("providerId");

-- CreateIndex
CREATE INDEX "prescriptions_pharmacyId_idx" ON "prescriptions"("pharmacyId");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE INDEX "products_pharmacyId_idx" ON "products"("pharmacyId");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_isActive_idx" ON "products"("isActive");

-- CreateIndex
CREATE INDEX "provider_availability_providerId_dayOfWeek_isActive_idx" ON "provider_availability"("providerId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "provider_earnings_providerId_idx" ON "provider_earnings"("providerId");

-- CreateIndex
CREATE INDEX "provider_earnings_status_idx" ON "provider_earnings"("status");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_isActive_idx" ON "refresh_tokens"("userId", "isActive");

-- CreateIndex
CREATE INDEX "refresh_tokens_deviceId_idx" ON "refresh_tokens"("deviceId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "telemedicine_participants_roomId_idx" ON "telemedicine_participants"("roomId");

-- CreateIndex
CREATE INDEX "telemedicine_participants_userId_idx" ON "telemedicine_participants"("userId");

-- CreateIndex
CREATE INDEX "telemedicine_rooms_providerId_idx" ON "telemedicine_rooms"("providerId");

-- CreateIndex
CREATE INDEX "telemedicine_rooms_status_idx" ON "telemedicine_rooms"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transactions_referenceId_idx" ON "wallet_transactions"("referenceId");

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RewardRedeemedBy" ADD CONSTRAINT "_RewardRedeemedBy_A_fkey" FOREIGN KEY ("A") REFERENCES "reward_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RewardRedeemedBy" ADD CONSTRAINT "_RewardRedeemedBy_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

