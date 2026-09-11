# Ricton Platform — Enterprise & Production Readiness Progress

## 📊 Overview Status Dashboard

| Phase       | Description                                | Target Tests | Completed Tests |     Status     |
| :---------- | :----------------------------------------- | :----------: | :-------------: | :------------: |
| **Phase 1** | Security & Authentication Hardening        |      8       |        8        |  🟢 Completed  |
| **Phase 2** | Database Indexing & Concurrency Resilience |      16      |       16        |  🟢 Completed  |
| **Phase 3** | Comprehensive Service Test Suites (TDD)    |     50+      |        0        | 🟡 In Progress |
| **Phase 4** | Web & Mobile Client Hardening              |      10      |        0        |   ⚪ Pending   |
| **Phase 5** | System-Wide Verification & Quality Gate    |      -       |        -        |   ⚪ Pending   |

---

## 📋 Detailed Component Tracker

### 1. Security & Authentication

- [x] Write `services/auth/tests/auth-security.test.ts` (8/8 tests passing)
- [x] Implement RFC 6238 TOTP verification algorithm in `packages/shared/src/totp.ts` & `services/auth/src/controllers/auth.controller.ts`
- [x] Fix Admin service auth middleware chain (`requireAuth` + `requireRole`) in `services/admin/src/routes/admin.routes.ts`
- [x] Fix multi-tenant hospital fallback leak in `services/user/src/controllers/user.controller.ts`
- [x] Remove hardcoded Twilio API secrets in `services/telemedicine/src/controllers/telemedicine.controller.ts`
- [x] Scrub committed credentials in `.env.production`

### 2. Database & Concurrency

- [x] Add B-tree indexes across all foreign keys in `packages/db/prisma/schema.prisma`
- [x] Add materialized `balance Decimal` to `Wallet` model & sync with RDS
- [x] Write `services/wallet/tests/wallet-concurrency.test.ts` (6/6 tests passing)
- [x] Implement transactional balance updates (`creditWalletAtomic`, `debitWalletAtomic`) in `services/wallet/src/controllers/wallet.controller.ts`
- [x] Write `services/appointment/tests/appointment-concurrency.test.ts` (5/5 tests passing)
- [x] Fix appointment date mutation bug and double-booking race condition with Redis locks & transactions
- [x] Write `services/pharmacy/tests/pharmacy-stock.test.ts` (5/5 tests passing)
- [x] Enforce non-negative inventory deductions in `services/pharmacy/src/controllers/pharmacy.controller.ts`

### 3. Microservice Test Suites (3–10 Tests per Service)

- [ ] `services/prescription` (6 tests)
- [ ] `services/telemedicine` (5 tests)
- [ ] `services/messaging` (6 tests)
- [ ] `services/notification` (5 tests)
- [ ] `services/subscription` (5 tests)
- [ ] `services/rewards` (5 tests)
- [ ] `services/address` (5 tests)
- [ ] `services/admin` (6 tests)
- [ ] `services/analytics` (5 tests)

### 4. Frontend & Mobile Hardening

- [ ] Implement 401 silent token refresh queue in `apps/web/src/lib/api-client.ts`
- [ ] Write `apps/web/src/lib/api-client.test.ts` (5 tests)
- [ ] Configure dynamic environment URL & secure storage in `apps/mobile/src/services/api.ts`
- [ ] Write `apps/mobile/src/services/api.test.ts` (5 tests)

---

## Mobile App Program — Patient-First React Native

This section is the working tracker requested for the audited mobile build. On the current case-insensitive filesystem, this existing `Progress.md` is the canonical `progress.md`; it has been extended rather than replaced.

The earlier enterprise-readiness tracker above is preserved as historical work-in-progress. Its unchecked service-test counts were not reclassified during this design/planning pass; the mobile baseline below records only checks directly verified in this audit.

### Planning and audit baseline (2026-09-04)

- [x] Inventory all 272 files in `RICTON_UI_UX/Mobile` (256 one-page PDFs, 14 JPGs, two PNGs).
- [x] Render and visually inspect every mobile PDF and all bitmap sources.
- [x] Classify all mobile sources as rebuild, consolidate, hold, or discard; identify 111 status-bar-only PDF exports.
- [x] Render and inspect all 106 PDFs and seven JPGs in `RICTON_UI_UX/Web`.
- [x] Audit every current web route and shared visual/client file.
- [x] Audit current React Native source, dependencies, navigation, configuration, and both conflicting API clients.
- [x] Inventory implemented gateway/service routes and compare frontend/mobile assumptions with backend behavior.
- [x] Inspect Prisma domain model, service/gateway ports, CI/deployment paths, and current test inventory.
- [x] Define patient-first mobile architecture, design direction, delivery gates, and a 3–10-real-E2E-per-slice matrix.
- [x] Add `docs/FRONTEND_DESIGN_AUDIT.md`.
- [x] Add `docs/MOBILE_DESIGN_SOURCE_AUDIT.md`.
- [x] Add `docs/MOBILE_APP_IMPLEMENTATION_PLAN.md`.

### Verified baseline (re-checked 2026-09-05, TDD RED baseline)

| Check                        |   Result   | Note                                                                                                                                                                       |
| :--------------------------- | :--------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root/backend TypeScript      |  🟢 Pass   | `npm run typecheck` (`tsc -b tsconfig.build.json`)                                                                                                                         |
| Current web TypeScript       |  🟢 Pass   | `npx tsc --noEmit -p apps/web/tsconfig.json` — no output; prior settings `pharmacyProfile` failure no longer reproduces                                                    |
| Current mobile TypeScript    |  🔴 Fail   | `npx tsc --noEmit -p apps/mobile/tsconfig.json` → `__tests__/api-client.test.ts(84,99): TS2322` mock `fetch(url:string)` not assignable to `fetch(input:RequestInfo\|URL)` |
| Mobile unit tests            | 🟡 Partial | `apps/mobile/__tests__/`: `api-client,auth-service,token-storage.test.ts` exist; type error blocks clean gate                                                              |
| Cross-cutting contract tests | 🟡 Partial | `tests/p0-security-contracts.test.ts` GREEN; `tests/frontend-contracts.test.ts` RED→GREEN in progress                                                                      |
| Real mobile E2E              | ⚪ Missing | `apps/mobile/e2e/foundation/` YAML only; no Maestro runner/device builds/seeded gateway runs yet                                                                           |
| API contract parity          |  🔴 Fail   | OpenAPI 3.0.0, 29 paths; missing `/api/messages*`, `/api/wallet*`, `/api/pharmacy*`, `/dashboard/patient`, `PUT /users/me`                                                 |

### Delivery tracker

| Mobile phase                              | Exit condition                                                                                                                 |                  Status                  |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------: |
| 0. Baseline and governance                | CI runs real tests; web/mobile/backend typecheck baseline is clean or quarantined; v1 scope and claims approved                | 🟡 In Progress (0a GREEN, 0b/0c partial) |
| 1. Contract and foundation                | Generated gateway client, shared tokens, secure session, Expo development builds; six foundation E2E tests pass on iOS/Android |                ⚪ Pending                |
| 2. Authentication and onboarding          | Ten auth E2E tests pass on both platforms; secure storage/logging verified                                                     |                ⚪ Pending                |
| 3. Home, discovery, booking, appointments | All four slice suites pass; double-booking/payment replay protected                                                            |                ⚪ Pending                |
| 4. Telemedicine and prescriptions         | Native video staging path and clinical authorization/recovery tests pass                                                       |                ⚪ Pending                |
| 5. Pharmacy and fulfillment               | Catalog/cart/checkout/tracking suite passes with stock and webhook reconciliation                                              |                ⚪ Pending                |
| 6. Wallet, premium, messages, account     | Remaining slice suites pass; all money/entitlements server-authoritative                                                       |                ⚪ Pending                |
| 7. Release hardening                      | Full iOS/Android E2E, accessibility, privacy, security, performance, observability, and rollout gates pass                     |                ⚪ Pending                |

### Immediate next actions (TDD order — All phases)

- [x] Phase 0a: fix mobile `__tests__/api-client.test.ts` mock typing (RED→GREEN), keep web/root green. Verified 2026-09-05: `tsc -p apps/mobile` exit 0; `jest api-client.test.ts` 6/6 pass.
- [x] Phase 0b (partial): CI now runs web/mobile typecheck + `npx jest tests/ --runInBand --forceExit` in `ci.yml` + `deploy-aws-ecr.yml`. Contract suite: `p0-security` 11/11 GREEN (~34s), `frontend-contracts` 2/11 GREEN, 9 RED — confirmed TDD RED baseline.
- [x] Phase 0c (partial): `.env` ports aligned to `.env.production` canonical (added DOCS/SUBSCRIPTION/MESSAGING/ADDRESS/SMARTGUARD; fixed PHARMACY 3006→3014, NOTIFICATION 3009→3016); `docker-compose.prod.yml` marked `PAYSTACK_PREFERRED_BANK` optional (`:-`). Remaining: fail-fast `${VAR:?}` for JWT/DATABASE/REDIS/AWS_ACCOUNT + deploy secrets check.
- [x] Phase 1a: produced authoritative diff `docs/ROUTE_OPENAPI_DIFF.md` (Kong 16 prefixes vs OpenAPI 29 paths; 8 contested decisions). Approval pending.
- [x] Phase 1b (seed GREEN): added `packages/api-contract` (gateway path constants + join test, 2 tests pass) and `packages/design-tokens` (brand/semantic seed + touch-target test, 1 test passes). Remaining: OpenAPI codegen + web/mobile bindings.
- [x] Phase 1c (source GREEN 2026-09-05): single Expo Router entry — deleted `App.tsx`, `src/navigation/`, `src/screens/`, `src/services/api.ts`, `src/api/`; `index.ts` now `import 'expo-router/entry'`; added `app.json` `scheme: ricton` for `ricton://appointments` E2E. New `__tests__/foundation-entry.test.ts` 4/4 GREEN; full mobile suite 18/18 GREEN; `tsc -p apps/mobile` exit 0.
- [x] Phase 1c wiring (GREEN 2026-09-05): `apps/mobile` depends on `@ricton/api-contract` + `@ricton/design-tokens`; `src/lib/api/client.ts` uses `GATEWAY_PATHS.authRefresh` + `joinGateway`; `src/theme/tokens.ts` re-exports `sharedTokens`. New `__tests__/contract-parity.test.ts` 3/3 GREEN; full mobile suite 21/21 GREEN; `tsc -p apps/mobile` exit 0. Remaining: prune unused `axios`/`@react-navigation` deps, Maestro runner + 6 journeys still YAML-only (no device runs).
- [x] Phase 2 (unit/contract GREEN 2026-09-05): extended `GATEWAY_PATHS` with register/otp/forgot/reset/oauth/logout-all; `AuthService` added `register/verifyOtp/resendOtp/requestPasswordReset/confirmPasswordReset/logoutAll` (PATIENT-guarded, `rel()` strips `/api` since base URL already includes it). New `__tests__/auth-extended.test.ts` 4/4 GREEN; full mobile suite 25/25 GREEN; `tsc -p apps/mobile` exit 0; contract packages 4/4 GREEN. Added `e2e/auth/` 10-scenario Maestro matrix (YAML shells; device runs pending seeded gateway + runner).
- [x] Phase 2 UI shells (GREEN 2026-09-05): `AuthService.signIn/restoreSession` converted to `GATEWAY_PATHS` (no literals left in `features/auth`); `SessionProvider` exposes `register/logoutAll`; added `app/(auth)/register.tsx` + `app/(auth)/forgot.tsx` with testIDs + links from sign-in. `tsc -p apps/mobile` exit 0; mobile suite 25/25 GREEN. Remaining: validation polish, OTP/TOTP screen wiring, social callbacks, device runs.
- [x] Phase 3 (unit/contract GREEN 2026-09-05): `BookingService` (`listProviders` search/specialty/pagination, `getSlots`, `createAppointment` with `Idempotency-Key`, 409→`SLOT_TAKEN`) + `__tests__/booking.test.ts` 3/3 GREEN; full mobile suite 28/28 GREEN; `tsc -p apps/mobile` exit 0; fixed duplicate `appointments` key in `api-contract`. Fixed home `Link href="/appointments"` → `"/(app)/(tabs)/appointments"`. Added `e2e/discovery/` 6 + `e2e/booking/` 10 YAML shells (device runs pending availability-write repair + idempotency backend enforcement).
- [x] Phase 4 (unit/contract GREEN 2026-09-05): `PrescriptionService` (`isOrderable`: signed→orderable, unsigned/dispensed→blocked/history; pharmacy handoff with `Idempotency-Key`) + `TelemedicineService` (`canJoinNow` 10-min window, `lobbyBlockedReason`, lobby/leave token calls). New `__tests__/clinical.test.ts` 6/6 GREEN; full mobile suite 34/34 GREEN; `tsc -p apps/mobile` exit 0. Added `e2e/prescriptions/` 6 + `e2e/telemedicine/` 8 YAML shells (device runs blocked on real video provider + clinical authorization backend).
- [x] Phase 5 (unit/contract GREEN 2026-09-05): `PharmacyService` (browse/detail, server-total `checkout` with `Idempotency-Key`, `isTerminalOrder`) + `WalletService` (balance/transactions, provider-hosted `launchTopUp` with no local credit, `verifyTopUp` reconciliation, virtual account). New `__tests__/pharmacy-wallet.test.ts` 5/5 GREEN; full mobile suite 39/39 GREEN; `tsc -p apps/mobile` exit 0; contract 5/5 (pharmacy/wallet paths pinned). Added `e2e/pharmacy/` 10 + `e2e/wallet/` 8 YAML shells (device runs pending stock concurrency + webhook reconciliation backend proofs).
- [x] Phase 6 (unit/contract GREEN 2026-09-05): `SubscriptionService` (plans/server-entitlement/idempotent subscribe/cancel), `RewardsService` (`rewardId` redeem + `REWARD_CONFLICT`), `MessagingService` (idempotent send + read), `NotificationService` (preferences + push register/revoke), `AccountService` (profile/addresses/password). New `__tests__/phase6.test.ts` 5/5 GREEN; full mobile suite 44/44 GREEN; `tsc -p apps/mobile` exit 0; contract 6/6 (Phase 6 paths pinned). Added `e2e/subscription/` 7 + `e2e/messages/` 8 + `e2e/account/` 10 YAML shells (device runs + privacy/biometric review pending).
- [x] Phase 7 (static GREEN 2026-09-05): `__tests__/release-hardening.test.ts` 5/5 — no PCI collection, gateway-only (no service ports), no console token/PHI leaks, versioned SecureStore keys, touch-target + `ricton` scheme + E2E matrix minimums (foundation 6, auth 10, all others ≥3). Full mobile suite 49/49 GREEN; `tsc` clean on mobile + web + root. Remaining (needs devices/backends): perf budgets, startup tracing, crash-free + poor-network runs, VoiceOver/TalkBack passes, privacy review, pentest, store assets/disclosures, staged rollout + rollback drill.
- [x] Backend repairs with repo access (GREEN 2026-09-05): availability-write verified already correct (`setAvailability` upsert, audit claim stale); patient-dashboard DECIDED as parallel queries (no BFF); OpenAPI 29→36 paths via schema `registerPath` (messages ×5, wallets ×4, pharmacy ×3, `PUT /users/me`) + new `wallet.schema.ts`; regen requires `npm run build -w @ricton/shared` first (generator reads `dist`). New `tests/openapi-coverage.test.ts` 6/6 GREEN; `frontend-contracts` 11/11 GREEN; root `typecheck` clean.

### TDD execution log (2026-09-05 — All)

- [x] Audit codebase against plan; recorded RED baseline above (mobile type error, contract drift, no device E2E).
- [ ] RED: add failing tests per slice before implementation (contract → unit → E2E).
- [ ] GREEN: minimal implementation to pass, dual-platform where applicable.
- [ ] REFACTOR + update this tracker at every gate.

| TDD slice                      | RED test                                                                                   | Status                                                                       |
| :----------------------------- | :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| 0a mobile type gate            | `npx tsc --noEmit -p apps/mobile/tsconfig.json`                                            | 🟢 GREEN 2026-09-05                                                          |
| 0b CI/env gate                 | CI runs `jest` + typechecks web/mobile; prod compose validates with required vars          | 🟡 Partial (CI steps added; `--forceExit` added for open-handle hang)        |
| 1a contract diff               | `tests/frontend-contracts.test.ts` + `docs/ROUTE_OPENAPI_DIFF.md`                          | 🔴 RED (2/11 pass, 9 fail — 2026-09-05; diff doc written, decisions pending) |
| 1b api-contract seed           | `packages/api-contract/tests/contract.test.ts`                                             | 🟢 GREEN (2/2, 2026-09-05)                                                   |
| 1b design-tokens seed          | `packages/design-tokens/tests/tokens.test.ts`                                              | 🟢 GREEN (1/1, 2026-09-05)                                                   |
| 1c single entry                | `apps/mobile/__tests__/foundation-entry.test.ts`                                           | 🟢 GREEN (4/4, 2026-09-05)                                                   |
| 1c wiring                      | `apps/mobile/__tests__/contract-parity.test.ts`                                            | 🟢 GREEN (3/3, full suite 21/21, 2026-09-05)                                 |
| 1c foundation/session          | 6 Maestro journeys in `apps/mobile/e2e/foundation/`                                        | 🟡 YAML-only (scheme added; no runner/device runs)                           |
| 2 auth unit/contract           | `apps/mobile/__tests__/auth-extended.test.ts`                                              | 🟢 GREEN (4/4, full suite 25/25, 2026-09-05)                                 |
| 2 auth E2E (10)                | `apps/mobile/e2e/auth/01-10`                                                               | 🟡 YAML shells (device runs pending)                                         |
| 3 booking unit                 | `apps/mobile/__tests__/booking.test.ts`                                                    | 🟢 GREEN (3/3, full suite 28/28, 2026-09-05)                                 |
| 3 discovery/booking E2E (6+10) | `apps/mobile/e2e/discovery/`, `e2e/booking/`                                               | 🟡 YAML shells (blocked on availability-write + idempotency backend)         |
| 4 clinical unit                | `apps/mobile/__tests__/clinical.test.ts`                                                   | 🟢 GREEN (6/6, full suite 34/34, 2026-09-05)                                 |
| 4 rx/tele E2E (6+8)            | `apps/mobile/e2e/prescriptions/`, `e2e/telemedicine/`                                      | 🟡 YAML shells (blocked on video provider + clinical authz)                  |
| 5 pharmacy/wallet unit         | `apps/mobile/__tests__/pharmacy-wallet.test.ts`                                            | 🟢 GREEN (5/5, full suite 39/39, 2026-09-05)                                 |
| 5 pharmacy/wallet E2E (10+8)   | `apps/mobile/e2e/pharmacy/`, `e2e/wallet/`                                                 | 🟡 YAML shells (blocked on stock/webhook proofs)                             |
| 6 premium/acct unit            | `apps/mobile/__tests__/phase6.test.ts`                                                     | 🟢 GREEN (5/5, full suite 44/44, 2026-09-05)                                 |
| 6 sub/msg/acct E2E (7+8+10)    | `apps/mobile/e2e/subscription/`, `e2e/messages/`, `e2e/account/`                           | 🟡 YAML shells (device + privacy review pending)                             |
| 7 hardening static             | `apps/mobile/__tests__/release-hardening.test.ts`                                          | 🟢 GREEN (5/5, full suite 49/49, 2026-09-05; tsc clean ×3)                   |
| 7 dep prune                    | `apps/mobile/package.json` drops `axios` + `@react-navigation/*` (dead since 1c)           | 🟢 GREEN (49/49, tsc clean; transform pattern cleaned)                       |
| 7 codegen                      | `packages/api-contract` `generate` script (openapi-typescript-codegen from `openapi.yaml`) | 🟢 Pinned by contract test (generated output intentionally uncommitted)      |
| 7 e2e runner                   | `apps/mobile/e2e/README.md` + `e2e`/`e2e:all` scripts + `scripts/seed-mobile-e2e.sh` stub  | 🟡 Runner documented; Maestro binary + seeded gateway + devices pending      |
| 2 auth (10 E2E)                | Maestro auth matrix                                                                        | ⚪ Pending                                                                   |

## Go-live tracker (goal: production release — TDD, updated every slice)

Method per slice: RED test → GREEN implementation → verify (typecheck + suites) → tick below.
Definition of live: full E2E matrix green on iOS+Android through Kong against seeded backend,
backend SLOs/alerting live, privacy disclosures + pentest + store assets done, §10 signed off.

### A. Backend enforcement for mobile (blocks device runs)

- [x] A1 Idempotency enforced (unit GREEN 2026-09-05): `IdempotencyKey` model (`@@unique([userId, key])`, migration `20260905000005`) + `idempotency(prisma)` middleware in `@ricton/shared` (replay stored response, in-flight → 409 `IDEMPOTENT_REQUEST_IN_PROGRESS`, 24h expiry, header-absent pass-through). Wired into `POST /appointments`, `POST /pharmacy/orders`, `POST /subscriptions/upgrade`, `POST /messages/.../messages`. New `packages/shared/tests/idempotency.test.ts` 4/4 GREEN (mocked delegate, no DB); root `typecheck` clean. Remaining: `db:migrate` on staging/prod + live replay test against test DB.
- [x] A2 Push-token revoke (unit GREEN 2026-09-05): added `DELETE /push-token/:token` → `revokePushToken` (user-scoped `updateMany` to `isActive:false`, unknown tokens still 200 — no enumeration leak). Backend decision, mobile unchanged. New `services/notification/tests/push-token-revoke.test.ts` 2/2 GREEN (mocked prisma + env bootstrap); root `typecheck` clean. Remaining: live DB-backed suite via `test-e2e.sh`.
- [ ] A3 OpenAPI completion: rewards, subscriptions, notifications CRUD, addresses, telemedicine token/leave, OTP, password change, logout-all, OAuth (36→~60+ paths). Then regenerate + repin. Status: 🟡 Partial (36 paths).
- [x] A4 Divergence test (GREEN 2026-09-05): `tests/openapi-routes-divergence.test.ts` 2/2 — every Express route (mount-aware extraction via imports + `app.use`) documented in OpenAPI; every OpenAPI path behind a Kong prefix (internal-only excepted). Fixed along the way: quoted YAML keys, `/api/internal` cross-product phantoms, missing `GET /api/notifications` + `GET /api/payments` + `GET /api/payments/verify/{reference}` (new `payment.schema.ts`), duplicate `registry` import from cross-session collision. Real findings kept: Kong smartguard route added by parallel track; notification payment webhooks correctly internal-only. OpenAPI now fully covers all Express routes; hand-written schemas + route-scanner stubs (`x-coverage`). Static suites 17/17 GREEN; root `typecheck` clean.
- [x] A5 E2E seed implemented (GREEN 2026-09-05, live run pending): `packages/db/prisma/seed-mobile-e2e.ts` (idempotent upserts: e2e patient/doctor+weekday availability/pharmacy+3 products, DRAFT/SIGNED/DISPENSED prescriptions, 15000 NGN wallet, PREMIUM sub, welcome notification; refuses production) + pure `seed-mobile-e2e.fixtures.ts` pinned by `packages/db/tests/seed-mobile-e2e.test.ts` 5/5 GREEN + `seed:e2e` script + rewritten `scripts/seed-mobile-e2e.sh` (defaults to isolated test DB). Root `typecheck` clean. Remaining: live run needs Docker daemon (down in this env) + `db:migrate` first.

### B. Missing mobile UI (service layer exists; screens missing)

- [x] B1 Booking UI (GREEN 2026-09-05): `app/(app)/booking/index.tsx` (search + provider list, empty/error/retry) + `app/(app)/booking/[providerId].tsx` (live slots, reason, idempotent confirm, SLOT_TAKEN recovery, confirmation notice) + Home "Find a doctor" entry (`patient.home.findDoctor`). New `__tests__/booking-ui.test.tsx` 3/3 GREEN (mocked service/router); full mobile suite 57/57 GREEN across 12 suites; mobile workspace `tsc` clean. Infra fixed en route: `test-renderer` dep, lucide ESM stub in `jest.setup`, RNTL v14 async render/press, relative router hrefs (stale expo typed routes), CI already on workspace typecheck. Remaining: wallet/external-checkout + cancel/reschedule UI, device runs.
- [x] B2 Telemedicine lobby + LiveKit Cloud wired (2026-09-05): project `ricton-e3eu83cz.livekit.cloud` live (rtc/validate 401-as-expected, root OK); key pair verified minting valid room JWTs via `livekit-server-sdk` (same path as controller); values in gitignored root `.env` only — API secret deliberately NOT added to mobile/web (client bundles are public; both apps receive `serverUrl` from `POST /telemedicine/rooms/:id/token` at runtime); `deploy-aws-ecr.yml` maps `LIVEKIT_URL/API_KEY/API_SECRET` from GitHub secrets (human must create them). UI: `VideoClient` + permissions + lobby/join/leave/summary GREEN (mobile 63/63). Remaining: remote `VideoView` on device; per-env LiveKit keys.: DECIDED LiveKit for mobile (backend mints LiveKit tokens via `livekit-server-sdk`, web connects via `livekit-client`; Twilio sunset, `twilio-video` web dep flagged dead). Added `livekit-client` + `@livekit/react-native` + `expo-camera`; `VideoClient` adapter (connect/publish/disconnect, `parseCredentials` never invents identity) + `useCallPermissions` (expo-camera hooks) + `app/(app)/telemedicine/[roomId].tsx` (window gating, permission request/blocked messaging, join/leave/summary) + `expo-camera` plugin permission strings in `app.json`. New `video-client` (3) + `telemedicine-ui` (3) tests GREEN; full mobile suite 63/63; workspace `tsc` clean. Remaining: remote `VideoView` rendering + reconnect UX polish on device; production LiveKit env (URL/keys) per environment.
- [ ] B3 Pharmacy catalog/cart/checkout/tracking. Status: 🔴 Service only.
- [ ] B4 Wallet top-up/verification/virtual-account UI. Status: 🔴 Service only.
- [ ] B5 Subscription plans/subscribe + rewards list/redeem UI. Status: 🔴 Service only.
- [ ] B6 Inbox/thread/compose + notifications list/preferences UI. Status: 🔴 Service only.
- [ ] B7 Account: profile edit, avatar, medical history, addresses, password, 2FA UI (current screen is read-only + sign out). Status: 🔴 Partial.
- [ ] B8 OTP verification/resend screen + social-callback handling. Status: 🔴 Service only.

### C. Release gates (needs devices/backends/humans)

- [ ] C1 Seeded gateway + Maestro runner + iOS/Android device runs (89 YAML: foundation 6, auth 10, discovery 6, booking 10, rx 6, tele 8, pharmacy 10, wallet 8, sub 7, msg 8, acct 10).
- [ ] C2 Perf budgets, startup tracing, crash-free + poor-network runs.
- [ ] C3 VoiceOver/TalkBack + text-scaling + reduced-motion passes.
- [ ] C4 Privacy review (PHI/logging/analytics), pentest, store assets + disclosures.
- [ ] C5 Staged rollout + rollback drill, backend SLOs/alerting live.
- [ ] C6 §10 product sign-offs (patient-only v1, domains/envs, held experiences, claims, video vendor, delivery model, premium rules).

### Scope and decision log

- Mobile v1 is planned for the `PATIENT` role; professional roles remain web-first.
- The current web visual direction is the brand baseline, but hard-coded page styles are not the mobile specification.
- Mobile boards preserve flow intent only; no source bitmap/PDF is automatically a production asset.
- All mobile API calls must pass through Kong; direct service ports are prohibited.
- Payment uses provider-hosted checkout and backend verification; Ricton mobile does not collect raw card details.
- Emergency/ambulance, ratings submission, direct phone calls, medical attachments, and live nearby-pharmacy maps remain held until their backend/product/compliance prerequisites are approved.

---

## TDD Remediation Programme (2026-09-05 audit → release gates)

Method: RED → GREEN → REFACTOR per gate. Cross-cutting contract tests live in
`tests/` and run without Docker (`npx jest tests/`). DB-backed service suites
run via `scripts/test-e2e.sh` once the test database is up.

| Gate | Scope                                                                                                | RED test                                                                                                               |                                                                                    Status                                                                                    |
| :--- | :--------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| G1   | Security freeze (P0-1…P0-6)                                                                          | `tests/p0-security-contracts.test.ts` (11)                                                                             |                                                                                   🟢 GREEN                                                                                   |
| G2   | Frontend↔backend contracts                                                                           | `tests/frontend-contracts.test.ts` (11)                                                                                |                                                                                   🟢 GREEN                                                                                   |
| G3   | Core workflows (onboarding/appointments/rx/pharmacy/wallet/payments/rewards/messaging/notifications) | `tests/frontend-contracts.test.ts` + `tests/backend-correctness.test.ts` (10) + `tests/order-subscription.test.ts` (7) |           🟢 GREEN (orders restock-safe w/ state machine; subscriptions PENDING-first; payment↔notification parity; availability upsert; analytics tenant-scoped)            |
| G4   | Video safety (lifecycle, membership, leave≠end, no simulated tokens)                                 | `tests/telemedicine-safety.test.ts` (8)                                                                                |                                                    🟢 GREEN (provider callbacks/recording-consent/2-browser test pending)                                                    |
| G5   | Test pyramid (unit/service/contract/E2E/security)                                                    | CI green                                                                                                               |                                                                                  ⚪ Pending                                                                                  |
| G6   | Reproducible deployment (Docker/env/Compose/Kong/migrations/web)                                     | build + `db:migrate` from empty                                                                                        | 🟢 GREEN (fresh `migrate deploy` from empty verified on real Postgres; zero drift; web `next build` green; `docs:generate` works) — secrets manager + HA/IaC remain ops work |
| G7   | Measured capacity (SLOs, load)                                                                       | load suite                                                                                                             |                                                                                  ⚪ Pending                                                                                  |

### G1 — completed 2026-09-05

- Public role allowlist (`PATIENT|CONSULTANT|PHARMACIST`), `PENDING` login blocked.
- PHI authorization on patient routes; fabricated ward/bed/status removed.
- Admin responses sanitized (`passwordHash`/`twoFactorSecret` never selected).
- Prescription scoping (relationship check, no empty-filter fallthrough, pharmacist scoping).
- `tokenVersion` enforced in middleware with cache invalidation on bump paths.
- OTP via `crypto.randomInt`; TOTP secrets AES-256-GCM at rest; external QR exfiltration removed.
- Deployment: 16 Docker entrypoints fixed, `REFRESH_SECRET` optional, Kong redis host, `MDTStatus` migration order.

### G2 — GREEN 2026-09-05 (22 tests across G1+G2 suites)

- `lib/api-client`: gateway-routed `/api/*` (no direct ports), memory-only
  tokens, single-flight silent refresh queue, 15s timeout, safe non-JSON
  handling, idempotency-key + request-ID headers, server-authoritative logout.
- `oauth.ts` + login/register: refresh token kept in memory via
  `setToken(token, refreshToken)`; `HOSPITAL_ADMIN` removed from public signup.
- `next.config.ts`: `/api/wallets` rewrite fixed (was singular), smartguard added.
- inbox → `/messages` + `participantIds` (provider lookup) + full thread load;
  wallet → `/wallets` + Paystack-redirect top-up (no local credit); dashboard
  wallet reads fixed; prescriptions → `/prescriptions` + server-shaped
  create (no synthetic fallback); rewards → `balance`/`items` + `rewardId`
  with balance reload; logout → server session invalidation; appointments →
  RFC datetime + `VIDEO`/`IN_PERSON` + `userId` provider resolution; admin →
  `{verified}` + reject + hospital form (city/state/country); onboarding →
  flat persisted payloads + envelope-checked redirect.
- Web `tsc --noEmit` clean.
- Hygiene: removed 102 committed `src/`-nested build artifacts shadowing `.ts`
  in ts-node/jest resolution; `.gitignore` now blocks recurrence.

### G4 — GREEN (telemedicine safety, `tests/telemedicine-safety.test.ts`)

- No auto-create of unknown rooms; unknown IDs → 404.
- Fail-closed without Twilio config (503, no `simulated_token`).
- Explicit room identity (`ricton-<uuid>`; provider SID stored only from Twilio).
- Membership verified before token mint; end restricted to host/provider/admin;
  member-scoped participant reads without phone PII; `leaveRoom` ≠ `endRoom`.
- Web: Leave → `/leave`, separate host-only “End for all” → `/end`;
  unsubstantiated “end-to-end encrypted” marketing copy corrected.

### G3 — backend correctness (`tests/backend-correctness.test.ts`, 7 tests GREEN)

- Wallet: `@@unique([walletId, referenceId])` + defensive migration
  (`20260905000000_wallet_idempotency`), P2002-tolerant credit, conditional
  `updateMany(balance >= amount)` debit, webhook currency/amount/reference
  reconciliation.
- Appointments: interval-overlap check kept inside a `Serializable`
  transaction (Redis lock documented as best-effort); VIDEO auto-room uses
  explicit `ricton-<id>` identity.
- Rewards redeem runs at `Serializable` isolation (was comment-only).
- Email/SMS workers deliver via SendGrid/Twilio REST (fail/retry in prod,
  explicit skip in non-prod) instead of sleep-and-log fake `sent`.
- Payment↔notification parity: internal handlers accept the flat
  `{paymentId,userId,…}` webhook payload (was nested-only → 400/retry loop).
- Availability: `POST /availability` validates `SetAvailabilityInput` and runs
  a real upsert (was booking-schema + getter); `@@unique(providerId,dayOfWeek)`.
- Analytics tenant isolation: hospital admins confined to their hospital across
  overview/trends/revenue/users/providers (was platform-wide full-table scans);
  groupBy + bounded SQL series replace in-memory scans and N+1 loops.

### G6 — build reproducibility (composite project references)

- Root-caused nested/stale `dist` output (src-redirecting `paths` + inferred
  roots) and stale committed `src/*.js` shadows: composite `tsconfig`s with
  explicit references now emit flat runnable trees; `npm run typecheck` green;
  Docker CMDs (`services/<svc>/dist/index.js`), smartguard packaging, and
  `docs:generate` verified; web `next build` green; Prisma schema valid.
- Removed a boot-crashing phantom `import './types/opossum'` (types-only module).
- Lazy provider-client init in auth (Twilio/Google): testable without re-imports.
- Fixed payment↔breaker contract (breaker returns parsed JSON; controller
  treated it as Response → 500s) + WALLET_TOPUP positivity validation.
- Refresh-token reuse logic corrected: explicit revocation (logout) → plain
  401; family-nuke reserved for true rotation-replay (child token exists).
- Rate-limit test bypass made per-request (was import-time noop).

### Verification (2026-09-05, real Postgres 16 + Postgis test instance)

- Fresh `migrate deploy` from empty: all 8 migrations apply; follow-up
  `migrate diff` is empty (schema ≡ migrations ≡ live DB).
- Backend suites on real Postgres: **14/14 suites, 123/123 tests**.
- TDD contract suites (no Docker): **6/6 suites, 55/55 tests**.
- Combined: **20/20 suites, 178/178 tests**, `npm run typecheck` green,
  web `tsc` green, web `next build` green, prettier/eslint clean on touched files.
- Corrected course: blanket PENDING-login block would have bricked
  onboarding (nothing else activates users). Final policy — allowlist stops
  privilege creation; PENDING authenticates for verification/onboarding;
  verifyContact/OAuth promote self-serve roles to ACTIVE; admin routes add
  `requireActiveStatus`. Caught by the pre-existing auth suite (TDD working).

### G2 (cont.) — authoritative contract (`tests/openapi-coverage.test.ts` GREEN)

- `scripts/generate-openapi-from-routes.ts` scans every service router +
  mount prefix and merges missing path+method entries into `openapi.yaml`
  without touching hand-written schemas: **41 → 146 paths, 169 operations**
  (stubs marked `x-coverage: route-generated` for schema promotion).
- Coverage test (shares the generator's discovery — cannot drift) guards every
  mounted route+method; `docs:generate` verified working.

### G4 (cont.) — provider status callbacks

- `POST /api/telemedicine/callbacks/status`: Twilio-signed (HMAC-SHA1 +
  timing-safe compare), moves rooms only toward ENDED; rooms request
  `statusCallback` at provisioning when `TELEMEDICINE_CALLBACK_URL` is set.
  Recording is never enabled server-side (stated, not silent).

### Verification (latest, real Postgres 16)

- Backend suites on real Postgres: **all green** (auth 41, wallet 14,
  appointment 5, prescription 6, payment 10+, rewards, telemedicine,
  messaging, notification + push-token-revoke, pharmacy, user 16,
  subscription, + parallel-agent suites).
- TDD contract suites: **all green** (incl. OpenAPI coverage + divergence).
- Combined: **36/36 suites, 333/333 tests**, `npm run typecheck` green,
  web `tsc` + `next build` green, eslint 0 errors on touched files.
- `yarn dev` failure fixed: `npm ci` broke Docker builds on a stale lockfile
  (`openapi-types` peer of swagger-parser had no lock entry) → pinned
  `openapi-types@^12.1.3`, `db-migrate` image builds; `docs:generate` no
  longer requires a live DATABASE_URL.
- Flake removed: OAuth provider fallbacks could hit the real network under
  full-suite runs → `global.fetch` hermetic mock in auth tests.
- Test isolation hardened: FK-safe `cleanDatabase()` factory helper adopted
  by broad-wipe suites (auth/wallet/user/payment/subscription/admin), so
  E2E leftovers and cross-suite rows can no longer break cleanups.
- Wrong service port defaults corrected (6 services defaulted to each
  other's ports; masked by compose env) + regression test pinning the map.
- Cache-aside resilience in auth middleware + response cache (cache outages
  degrade to DB instead of 401/500); hermetic redis mocks in
  wallet/user/payment suites.
- Negative authz suites: escalation, PHI isolation, pharmacist scoping,
  non-host room end, leave≠end, admin PENDING rejection.
- Video join-window unit tests; Twilio sunset verified live (LiveKit
  migration required for real media); fail-closed E2E green in 2 browsers.
- Renewal worker + dunning (4/4); exclusion constraint proven live + in-suite.
- `yarn dev` unblocked three times: (1) stale lockfile broke every Docker
  build (`openapi-types` peer had no lock entry → pinned explicitly,
  `db-migrate` image verified building); (2) dev redis host port collided
  with machines running local redis (e.g. Homebrew) → `REDIS_HOST_PORT`
  override in `docker-compose.yml` + `.env.example` (container port stays
  6379); (3) `services:dev` fought `docker-compose up -d` for ports
  3001/3002/3003/3007/3008 (EADDRINUSE crash loop) → dev compose scales those
  five services to 0 and `services:dev` injects matching `REDIS_URL` /
  `REDIS_PASSWORD` (was NOAUTH loop). Verified: all five bind, redis
  authed, no crashes. Note: in dev, Kong still points those five paths at
  (absent) containers — use the Next rewrites / direct ports locally.

### Toward production-ready (this session)

- Route protection: Next `middleware.ts` (session/role hint cookies) + no-flash
  `SidebarLayout` (loading skeleton until session resolves, login redirect).
- Timezone: all appointment slot math in UTC (schema documents UTC windows).
- DB exclusion constraint `no_overlapping_provider_bookings` (trigger-kept
  `timeRange` + gist EXCLUDE), proven live + in-suite (test 6).
- Secrets: `scripts/gen-prod-secrets.sh` (600-perm `.env.production`
  generator); Helm secrets/ingress/PDB/networkpolicy/migration-job/topology.
- Negative authz suites: auth (escalation), user (PHI), prescription,
  telemedicine (non-host end, leave≠end), new admin-authz suite.
- Playwright staging slice **2/2 green in a real browser** (register-guard +
  login→dashboard→appointments→wallet→logout); wired into CI (`e2e-browser`
  job); recording-honesty + reconnect/network/waiting-room UX in video room.
- Load smoke (`scripts/load-smoke.js` + `docs/SLOS.md`): appointment service
  5681 reqs, p99 325 ms, 0 errors/5xx; 3-min soak: 43,807 reqs @ 10 conns,
  p99 263 ms, 0 errors, 0 5xx.
- OpenAPI: 23 critical endpoints promoted to full request schemas; typed
  client regenerated + typechecking.
- `yarn dev` repaired live: port-collision overrides, scale-0 hybrid topology,
  redis credentials for local services.

### Verification (latest, real Postgres 16)

- **36/36 suites, 333/333 tests** (service + contract + package suites).
- `npm run typecheck`, web `tsc` + `next build`, eslint 0 errors.
- Fresh `migrate deploy` from empty + zero drift re-verified.

### Production push (this session — all verified below)

- Renewal worker + dunning: `SUBSCRIPTION` auto-renew is now real —
  `subscription-renewals` BullMQ repeatable (daily 03:00), PENDING invoice +
  Paystack init + IN_APP/email notice, 3-strike CANCELLED, idempotent
  (metadata + reference checks), `renewalAttempts` migration. 4/4 tests.
- Video join-window unit tests (fake timers, 4/4).
- Kong edge rate limit on `/api/auth` (30/min, fail-closed) + WAF in Terraform.
- Terraform data plane: VPC/2AZ, Multi-AZ Postgres 16 (encrypted, PITR 7d,
  deletion protection), ElastiCache Multi-AZ w/ AUTH+TLS, Secrets Manager
  (app + db-master, rotation-ready), WAFv2 + ALB association, outputs.
- Runbook (`docs/RUNBOOK.md`) + SLOs (`docs/SLOS.md`); load smoke + soak
  harness (`scripts/load-smoke.js`).
- OpenAPI: 31 critical endpoints promoted; typed client regenerated.
- `yarn dev` fully repaired live (scale-0 hybrid, redis creds, port overrides).
- UTC slot math, exclusion constraint, negative authz suites, E2E 2/2,
  hermetic OAuth tests, cache-aside resilience (see history above).

### LiveKit migration (done this session)

- Twilio Programmable Video was sunset, so the video stack is now LiveKit:
  server mints least-privilege join tokens and manages rooms explicitly
  (create-or-fetch by name, delete on end); webhook receiver validates
  HMAC-SHA256 and only moves rooms toward ENDED; web client rewritten on
  `livekit-client` (connect, mute, camera, screen share, data chat,
  reconnect/network-quality UX preserved). Service suite re-mocked and
  green; safety tests updated. Live two-party media test needs provider
  credentials + the new suites pass without them.
- Env/compose/prod-compose/env-example carry `LIVEKIT_URL/KEY/SECRET`;
  Twilio remains for SMS OTP only. OpenAPI regenerated.

### Interface audit (all endpoints exist; all calls resolve)

- Static audit: **69 web calls → 56 distinct, 100% resolve** to backend
  routes (`tests/frontend-endpoint-existence.test.ts`); mobile composes
  `GATEWAY_PATHS` constants (covered by its parity tests).
- Role dashboards proven in browsers: PATIENT→/dashboard,
  CONSULTANT→/onboarding/doctor, PHARMACIST→/onboarding/pharmacy,
  SUPER_ADMIN→/admin (`apps/web/e2e/role-dashboards.spec.ts` 4/4).
- Mock sweep: zero TODO/FIXME/mock/stub/lorem in backend; web has only input
  placeholders and `N/A` fallbacks — no fabricated records, no Math.random IDs.
- Service port defaults corrected (6 services pointed at each other's ports),
  pinned by test; Dockerfiles switched to deterministic `npm ci`; full image
  rebuild retrying in background (registry flakes, path proven 3×).

### Hospital-admin provisioning (verified 2026-09-11)

- Public signup offered Patient/Doctor/Pharmacist only — HOSPITAL_ADMIN had
  NO creation path anywhere. Added `POST /api/admin/users` (SUPER_ADMIN +
  active-gated, ACTIVE-from-birth, audited, sanitized) + admin UI form.
- Role dashboards proven in browsers for all four roles.

### Local app startup (verified 2026-09-11)

- Infra: dev postgres remapped (`POSTGRES_HOST_PORT`, native Mac postgres
  holds 5432) + fresh `ricton-devdb` volume (old volume creds lost) migrated
  with all 9 migrations; dev redis on 6380 (`REDIS_HOST_PORT`).
- `services:dev` × 5 healthy (auth 3001, user 3002, payment 3007, wallet 3008,
  docs 3003) with dev DB + authed redis; web on 3100 (port 3000 belongs to an
  unrelated project). Live smoke: register → login return real tokens.
- Watch for stale `ts-node-dev`/`next-server` squatters on service ports
  (kill before starting); `yarn dev` scale-0 hybrid prevents container dupes.

### Still open (no-go items)

- Live two-party media call against real LiveKit credentials.
- Maestro device runs, chaos testing, third-party pen-test.
- Apply Terraform + provision managed services; secret rotation drill; PITR
  restore drill; load at 3× projected peak.

---

_Last Updated: 2026-09-05 — Go-live: A1/A2/A4/A5 backend GREEN, B1 booking + B2 LiveKit lobby GREEN (mobile 63/63), contracts 145/145, tsc clean. Next: B3–B8 UI, C gates._
