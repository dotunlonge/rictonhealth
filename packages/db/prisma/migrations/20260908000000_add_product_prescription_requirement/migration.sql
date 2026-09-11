ALTER TABLE "products"
ADD COLUMN "requiresPrescription" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "products_pharmacyId_name_idx" ON "products"("pharmacyId", "name");
