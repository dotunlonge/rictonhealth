# Mobile E2E (Maestro, black-box, real gateway)

No mocked application API inside device builds. All flows run against a seeded
isolated backend through Kong (`EXPO_PUBLIC_API_URL` → gateway).

## Prereqs

- Maestro CLI: `brew install maestro` (macOS) or see https://maestro.mobile.dev/
- iOS Simulator / Android Emulator with a development build (`npx expo run:ios`, `npx expo run:android`)
- Reseed before every full-suite run (flows book/cancel/redeem for real):
  `DATABASE_URL=<dev-db> ./scripts/seed-mobile-e2e.sh` — deterministic patient,
  providers, slots, products, prescriptions, wallet 15000 NGN, PREMIUM sub,
  welcome notification, in-window VIDEO visit + room, clinician thread,
  reward voucher + 500 pts, OTP-registration identities (2FA cleared, virtual
  account cleared, E2E-marked bookings removed)
- Env: `E2E_PATIENT_EMAIL`, `E2E_PATIENT_PASSWORD`, `EXPO_PUBLIC_API_URL`
- LiveKit: dev `LIVEKIT_URL/API_KEY/API_SECRET` in backend env (token minting is
  server-side; two-party media itself is a manual sandbox step)
- Paystack sandbox keys for top-up/subscribe/virtual-account handoffs
  (browser completion + webhook delivery are the manual steps there)
- Pre-grant camera/mic on the simulator so join steps never block on an OS
  dialog: `xcrun simctl privacy booted grant camera com.ricton.health &&
xcrun simctl privacy booted grant microphone com.ricton.health`
  (camera/mic-denied permutations: set these to `deny` first, expect
  `tele.blocked`)

## Suites (89 flows, all executable — no drafts)

| Command                     | Flows | Notes                                                  |
| --------------------------- | ----- | ------------------------------------------------------ |
| `npm run e2e`               | 8     | foundation 6 + password/invalid login (CI default)     |
| `npm run e2e:auth`          | 10    | incl. OTP register (reseed), OAuth buttons, logout-all |
| `npm run e2e:discovery`     | 6     | home, search, specialty, empty, relaunch               |
| `npm run e2e:booking`       | 10    | search → slots → PENDING book → 409 → video link       |
| `npm run e2e:prescriptions` | 6     | 3 states, unsigned blocked, rx → checkout              |
| `npm run e2e:telemedicine`  | 8     | lobby, reconnect controls, leave, invalid room         |
| `npm run e2e:pharmacy`      | 10    | catalog → cart → pickup/delivery → tracking+cancel     |
| `npm run e2e:wallet`        | 8     | balance, virtual acct, handoff, min-guard, redaction   |
| `npm run e2e:subscription`  | 7     | plans, cancel→FREE, rewards voucher redeem             |
| `npm run e2e:messages`      | 8     | inbox, send, history, deep link, prefs                 |
| `npm run e2e:account`       | 10    | profile, history, address, 2FA secret, sign-outs       |

Within-suite order matters where noted in the YAML headers (e.g. booking
05 before 08/09, subscription 02 before 03–05): suites run alphabetically,
so always run the whole slice after a reseed.

## Manual sandbox steps (cannot be scripted)

OS account sheets (Google/Apple), photo library + S3 avatar upload, Paystack
browser payment + webhook delivery, LiveKit two-party media, OS permission
denials, biometric enrollment. Each affected flow asserts everything up to
the handoff and names the manual step in its header.

## Web E2E (Playwright, real browser)

`apps/web/e2e/`: role dashboards (4 roles), staging slice
(register → dashboard → appointments → wallet → logout), video two-party
(needs LiveKit creds), Google sign-in. Run from `apps/web` with the backend
up: `npx playwright install && npx playwright test`.
