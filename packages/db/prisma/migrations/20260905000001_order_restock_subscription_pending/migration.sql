-- Order restock + subscription pre-payment status.
-- 1. OrderItem.productId retains the catalog reference so cancelled orders
--    can safely restock the exact products decremented at placement.
-- 2. SubscriptionStatus.PENDING lets upgrades exist before Paystack confirms
--    payment (no more ACTIVE-before-payment).

-- AlterEnum (guarded for partial/failed prior application)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'SubscriptionStatus' AND e.enumlabel = 'PENDING'
  ) THEN
    ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';
  END IF;
END
$$;

-- AlterTable: order_items
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productId" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");
