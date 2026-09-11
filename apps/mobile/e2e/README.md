# Mobile E2E (Maestro, black-box, real gateway)

No mocked application API inside device builds. All flows run against a seeded
isolated backend through Kong (`EXPO_PUBLIC_API_URL` → gateway).

## Prereqs

- Maestro CLI: `brew install maestro` (macOS) or see https://maestro.mobile.dev/
- iOS Simulator / Android Emulator with a development build (`npx expo run:ios`, `npx expo run:android`)
- Seeded backend: `npm run db:seed` + `./scripts/seed-mobile-e2e.sh` (deterministic
  patient, providers, slots, products, prescriptions, wallet balances, orders)
- Env: `E2E_PATIENT_EMAIL`, `E2E_PATIENT_PASSWORD`, `EXPO_PUBLIC_API_URL`

## Current status

- `npm run e2e` runs the eight executable black-box flows: six foundation
  flows plus password-login and invalid-login.
- The other 81 YAML files are scenario drafts with explicit `TODO` markers.
  They are not tests and are intentionally excluded from the runnable command.
- `npm run e2e:audit` prevents draft counts from being presented as executed
  coverage. A release remains blocked until the relevant drafts are implemented
  and a device/simulator job runs them against the seeded gateway.

## Planned suites

foundation 6, auth 10, discovery 6, booking 10, prescriptions 6, telemedicine 8,
pharmacy 10, wallet 8, subscription 7, messages 8, account 10.

The filenames describe the intended matrix, not current coverage. Third-party
sandboxes (Paystack, OAuth, video) also need deterministic adapter tests so
provider downtime never masks Ricton regressions.
