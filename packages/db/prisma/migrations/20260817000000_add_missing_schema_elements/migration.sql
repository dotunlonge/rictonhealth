-- Catch-up migration: brings the database schema in line with schema.prisma.
-- Adds columns/enums/tables that were defined in the Prisma schema but never
-- captured by the two earlier migrations.

-- CreateEnum
CREATE TYPE "RewardTransactionType" AS ENUM ('EARN', 'REDEEM');

-- CreateEnum
CREATE TYPE "RewardSource" AS ENUM ('APPOINTMENT', 'PRESCRIPTION', 'PHARMACY_ORDER', 'REFERRAL', 'SIGNUP', 'PROMOTION', 'REDEMPTION');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'REDEEMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RewardTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum (must precede mdts table which defaults to MDTStatus 'OPEN')
CREATE TYPE "MDTStatus" AS ENUM ('DRAFT', 'OPEN', 'ACTIVE', 'CLOSED');

-- AlterTable: users (security / audit fields)
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMPTZ(6),
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "bankDetails" JSONB,
ADD COLUMN "deletedAt" TIMESTAMPTZ(6);

-- AlterTable: refresh_tokens (rotation / device tracking)
ALTER TABLE "refresh_tokens" ADD COLUMN "deviceId" TEXT,
ADD COLUMN "deviceFingerprint" TEXT,
ADD COLUMN "isRevoked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "revokedAt" TIMESTAMPTZ(6),
ADD COLUMN "revokeReason" TEXT,
ADD COLUMN "parentTokenId" UUID,
ADD COLUMN "tokenFamily" TEXT,
ADD COLUMN "lastUsedAt" TIMESTAMPTZ(6),
ADD COLUMN "usageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: appointments (clinical audit fields)
ALTER TABLE "appointments" ADD COLUMN "reason" TEXT,
ADD COLUMN "cancelledBy" "UserRole",
ADD COLUMN "reminderSentAt" TIMESTAMPTZ(6);

-- AlterTable: telemedicine_rooms (MDT rooms)
ALTER TABLE "telemedicine_rooms" ADD COLUMN "mdtId" UUID;

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "postalCode" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "body" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_receipts" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "readAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdts" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "patientId" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "status" "MDTStatus" NOT NULL DEFAULT 'OPEN',
    "complaint" TEXT NOT NULL,
    "history" TEXT,
    "pastHistory" TEXT,
    "diagnosis" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mdts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mdt_participants" (
    "id" UUID NOT NULL,
    "mdtId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mdt_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "pharmacyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_catalogs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "imageUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tierRequired" "RewardTier",
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "RewardTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "source" "RewardSource" NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "rewardCatalogId" UUID,
    "shippingAddress" JSONB,
    "deliveredAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_participants_threadId_userId_key" ON "chat_participants"("threadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_receipts_messageId_userId_key" ON "chat_message_receipts"("messageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "mdt_participants_mdtId_userId_key" ON "mdt_participants"("mdtId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "reward_transactions_userId_source_referenceId_type_key" ON "reward_transactions"("userId", "source", "referenceId", "type");

-- CreateTable: implicit many-to-many join table (RewardCatalog <-> User via "RewardRedeemedBy")
CREATE TABLE "_RewardCatalogToUser" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_RewardCatalogToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "_RewardCatalogToUser_AB_unique" ON "_RewardCatalogToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_RewardCatalogToUser_B_index" ON "_RewardCatalogToUser"("B");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_parentTokenId_fkey" FOREIGN KEY ("parentTokenId") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemedicine_rooms" ADD CONSTRAINT "telemedicine_rooms_mdtId_fkey" FOREIGN KEY ("mdtId") REFERENCES "mdts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_receipts" ADD CONSTRAINT "chat_message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_receipts" ADD CONSTRAINT "chat_message_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdts" ADD CONSTRAINT "mdts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdts" ADD CONSTRAINT "mdts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdt_participants" ADD CONSTRAINT "mdt_participants_mdtId_fkey" FOREIGN KEY ("mdtId") REFERENCES "mdts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mdt_participants" ADD CONSTRAINT "mdt_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_rewardCatalogId_fkey" FOREIGN KEY ("rewardCatalogId") REFERENCES "reward_catalogs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey (implicit many-to-many: RewardCatalog <-> User)
ALTER TABLE "_RewardCatalogToUser" ADD CONSTRAINT "_RewardCatalogToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "reward_catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_RewardCatalogToUser" ADD CONSTRAINT "_RewardCatalogToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
