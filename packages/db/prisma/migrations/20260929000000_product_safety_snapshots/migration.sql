ALTER TABLE "appointments"
  ADD COLUMN "waivedReason" TEXT,
  ADD COLUMN "feeSnapshot" DECIMAL(10,2),
  ADD COLUMN "telemedicineConsentAt" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "provider_earnings_appointmentId_providerId_key"
  ON "provider_earnings" ("appointmentId", "providerId");
