-- Compliance + staffing adds (#P2 NAFDAC, #P3 schedule, #C1 leave,
-- #C2 follow-up, #F2 referral, #L4 Rx snapshot). All statements are
-- IF NOT EXISTS / guarded so reruns are safe.

-- #P2 / #P3 Product compliance columns
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "nafdacRegNo" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "schedule" TEXT;

-- #C2 Appointment follow-up chain
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "parentAppointmentId" UUID;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMPTZ(6);

-- #L4 Prescription snapshot columns
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "prescriberLicense" TEXT;
ALTER TABLE "prescriptions" ADD COLUMN IF NOT EXISTS "signatureHash" TEXT;

-- #C1 Provider leave table
CREATE TABLE IF NOT EXISTS "provider_leaves" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_leaves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "provider_leaves_providerId_date_key" ON "provider_leaves"("providerId", "date");
CREATE INDEX IF NOT EXISTS "provider_leaves_providerId_idx" ON "provider_leaves"("providerId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_leaves_providerId_fkey') THEN
    ALTER TABLE "provider_leaves" ADD CONSTRAINT "provider_leaves_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- #F2 Referral table
CREATE TABLE IF NOT EXISTS "referrals" (
    "id" UUID NOT NULL,
    "fromProviderId" UUID NOT NULL,
    "toProviderId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "reason" TEXT,
    "consentAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "referrals_fromProviderId_idx" ON "referrals"("fromProviderId");
CREATE INDEX IF NOT EXISTS "referrals_toProviderId_idx" ON "referrals"("toProviderId");
CREATE INDEX IF NOT EXISTS "referrals_patientId_idx" ON "referrals"("patientId");
