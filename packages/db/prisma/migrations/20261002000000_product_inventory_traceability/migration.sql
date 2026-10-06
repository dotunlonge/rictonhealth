-- Pharmacy catalogue traceability. Existing products remain reviewable, but
-- new pharmacy-created stock must include these values before approval.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "batchNumber" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "supplierName" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "expiryDate" DATE;
CREATE INDEX IF NOT EXISTS "products_expiryDate_idx" ON "products"("expiryDate");
