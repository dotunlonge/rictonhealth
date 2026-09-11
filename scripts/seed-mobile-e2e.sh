#!/usr/bin/env bash
# Deterministic mobile E2E fixtures (idempotent upserts by fixed e2e emails).
# Usage: ./scripts/seed-mobile-e2e.sh
# Env: DATABASE_URL (defaults to the isolated test DB), NODE_ENV!=production.
set -Eeuo pipefail

export NODE_ENV="${NODE_ENV:-test}"
export DATABASE_URL="${DATABASE_URL:-postgresql://ricton_test_user:ricton_test_password@127.0.0.1:5433/ricton_test_db?schema=public}"

echo "Seeding mobile E2E fixtures into ${DATABASE_URL%%@*}@..."
npm run seed:e2e --workspace=@ricton/db
echo "Seeded: e2e.patient / e2e.doctor (+availability) / e2e.pharmacy (+products),"
echo "3 prescriptions (DRAFT/SIGNED/DISPENSED), wallet 15000 NGN, PREMIUM sub, welcome notification."
echo "E2E credentials: E2E_PATIENT_EMAIL=e2e.patient@ricton.health E2E_PATIENT_PASSWORD=E2ePass123!"
