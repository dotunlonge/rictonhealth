# Ricton Mobile App — Audited Implementation Plan

**Status:** Proposed planning baseline; implementation has not started  
**Updated:** 2026-09-04  
**Primary design reference:** `RICTON_UI_UX/Mobile` for product flows, current `apps/web` for visual quality and brand direction  
**Target:** Patient-first React Native application for iOS and Android

## 1. Outcome and product boundary

Build one cross-platform React Native app that feels like the same product as the current Ricton web experience, uses the API gateway as its only backend entry point, and proves every product slice with real iOS and Android end-to-end tests.

The supplied mobile exports are not production-ready specifications. They remain valuable as an inventory of intended flows and states, but they must not be copied literally. The implementation will preserve their product intent while rebuilding hierarchy, navigation, spacing, typography, accessibility, failure states, and platform behavior around the more professional direction established by the current web frontend.

The first release is for the `PATIENT` role. Consultant, pharmacist, hospital-admin, and super-admin workflows remain web-first. Mobile code will be role-capability aware so that a later clinician app can reuse foundations without exposing unfinished professional workflows in v1.

## 2. Audit verdict

### Current web frontend

The new web frontend is materially more professional than the original web reference boards. Its navy/blue/slate palette, restrained gradients, white card surfaces, Lucide iconography, and calmer information hierarchy should define the mobile brand direction.

It is not yet a complete design system or a reliable API reference:

- Visual values are repeatedly hard-coded; there is no authoritative token package.
- The fixed desktop sidebar does not collapse cleanly for smaller screens.
- `text-[9px]` and `text-[10px]` appear too often for an accessible clinical product.
- Search and several calls to action are visually present but non-functional.
- Role guards are inconsistent on privileged pages.
- `/forgot-password`, `/pharmacy/products/new`, and `/pharmacy/products/[id]` are linked but missing.
- Several pages silently convert request failures into believable zero/empty states.
- Public compliance and scale claims require legal/evidence review before reuse.
- The current web TypeScript baseline fails in `settings/page.tsx` because profile types do not match the UI.

The mobile app should inherit the web's visual language, not its implementation shortcuts.

### Mobile source boards

The mobile folder contains 272 files: 256 single-page PDFs, 14 JPGs, and two PNGs. It does **not** contain 256 distinct screens. At least 111 PDFs are 390×46 operating-system status-bar strips; many others are isolated keyboards, buttons, overlays, or duplicate states.

The boards provide enough product intent for authentication, home, booking, appointments, telemedicine, prescriptions, pharmacy orders, wallet, subscriptions, and account settings. They do not provide a coherent production system:

- Blue, green, and purple compete as primary brand colors.
- Typography, spacing, radii, shadows, icons, and bottom navigation vary by flow.
- Several screens are desktop-like long canvases rather than mobile layouts.
- Tiny labels and controls do not meet mobile readability or touch-target expectations.
- Loading, empty, error, permission-denied, offline, retry, and recovery states are incomplete.
- Raw card-entry screens would unnecessarily expand PCI scope.
- Map, video, calling, uploads, reviews, and emergency features assume backend capabilities that do not yet exist or are not production-ready.
- Copy contains typos and inconsistent terminology.

Detailed disposition of every source family is in `docs/MOBILE_DESIGN_SOURCE_AUDIT.md`.

### Backend and client alignment

The backend has broad domain coverage—approximately 146 implemented HTTP routes across 16 services—but the published OpenAPI document covers only a fraction of them. The clients already demonstrate contract drift:

| Concern            | Current client assumption             | Implemented gateway contract                                     | Required decision                             |
| ------------------ | ------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Messages           | `/api/messaging/...`                  | `/api/messages/...`                                              | Standardize on `/api/messages`                |
| Wallet             | singular `/api/wallet` and `/balance` | `/api/wallets/me`, `/transactions`, `/topup`, `/virtual-account` | Standardize on plural routes                  |
| Appointments       | `/api/appointments/me`                | `GET /api/appointments` with `{ appointments, meta }`            | Fix client and schema                         |
| Prescriptions      | `/api/pharmacy/prescriptions`         | `/api/prescriptions`                                             | Use prescription service                      |
| User update        | `PATCH /api/users/me`                 | `PUT /api/users/me`                                              | Pick and document one method                  |
| Patient dashboard  | `/api/users/dashboard/patient`        | no such route                                                    | Add BFF endpoint or aggregate existing routes |
| Admin role         | frontend includes `ADMIN`             | backend uses `HOSPITAL_ADMIN` and `SUPER_ADMIN`                  | Remove ambiguous role                         |
| Availability write | UI expects saved provider hours       | current `POST /availability` behaves like a read                 | Repair backend before clinician scheduling    |

The mobile app must never call individual service ports. All traffic goes through the gateway and a generated, typed client. The existing mobile `fetch` and Axios clients use different hosts and token keys and will be replaced together.

## 3. Product and design principles

1. **Calm clinical confidence.** Navy anchors trust; blue is the primary action; semantic green, amber, and rose communicate status only.
2. **One hierarchy.** A screen has one primary action, clear section headings, and progressive disclosure for secondary detail.
3. **Native behavior.** Respect safe areas, keyboards, platform back behavior, dynamic type, haptics, reduced motion, dark-mode readiness, and system permission patterns.
4. **Accessible by default.** Minimum 44×44 pt touch targets, scalable text, visible focus, 4.5:1 body-text contrast, labeled controls, no status encoded by color alone.
5. **Truthful states.** Loading, empty, error, offline, stale, permission-denied, and retry states are explicit. Network failure never masquerades as an empty account.
6. **Backend-authoritative money and medicine.** The server calculates prices, balances, stock, entitlements, booking availability, and prescription status.
7. **Least sensitive client.** Tokens use secure storage; health data is not persisted unless explicitly justified; payment card details are never collected by Ricton UI.

## 4. Proposed experience architecture

### Navigation

Use Expo managed workflow with development builds and file-based, typed routing. The app structure is:

```text
Boot
├── update / maintenance gate
├── session restore
├── unauthenticated → Auth
└── authenticated PATIENT → Patient app

Auth
├── welcome
├── sign in
├── create account
├── verify email or phone
├── forgot/reset password
└── social sign-in callback

Patient tabs
├── Home
├── Appointments
├── Prescriptions
└── Account

Modal or nested journeys
├── provider discovery → profile → slot → review → payment → confirmation
├── pharmacy → product/prescription → cart → fulfillment → checkout → tracking
├── telemedicine lobby → permission check → room → summary
├── wallet → fund → external checkout → verification → receipt
├── subscription → plan → external checkout → status
├── messages
└── notifications
```

Do not combine a persistent drawer with bottom tabs. Four stable patient tabs and focused nested journeys are sufficient.

### Visual system

Create a shared source of truth in `packages/design-tokens`, consumed by web and mobile. Initial token direction:

| Token family | Direction                                                              |
| ------------ | ---------------------------------------------------------------------- |
| Brand        | navy foundation, Ricton blue action, sky accent                        |
| Neutrals     | slate scale and white surfaces                                         |
| Semantics    | emerald success, amber warning, rose danger, blue information          |
| Type         | one cross-platform sans family; mobile styles mapped to Dynamic Type   |
| Spacing      | 4-point scale; 16–24 px page gutters depending on width                |
| Shape        | small controls, medium inputs, large cards; avoid arbitrary pill usage |
| Elevation    | border-first hierarchy; subtle shadow only for floating surfaces       |
| Motion       | 150–250 ms purposeful transitions, reduced-motion alternative          |

Build and document primitives before feature screens: `Screen`, `TopBar`, `Text`, `Button`, `IconButton`, `TextField`, `Select`, `Card`, `ListRow`, `Badge`, `Tabs`, `Sheet`, `Dialog`, `Toast`, `Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner`, and `Money`.

### Client architecture

```text
apps/mobile
├── app/                  route files and layout boundaries
├── src/components/       shared accessible primitives
├── src/features/         auth, home, booking, appointments, etc.
├── src/lib/api/          generated client wrapper, auth refresh, errors
├── src/lib/storage/      secure and non-sensitive storage adapters
├── src/lib/telemetry/    privacy-filtered events and crash reporting
├── src/theme/            generated mobile token bindings
└── e2e/                  Maestro journeys and fixtures

packages
├── api-contract/         authoritative OpenAPI and generated TypeScript types
├── design-tokens/        semantic cross-platform tokens
└── domain/               pure validation/formatting where safe to share
```

Recommended application choices:

- Expo + React Native + TypeScript, using development builds for native integrations.
- Expo Router for typed routes and deep links.
- TanStack Query for server state; no duplicate global cache.
- React Hook Form with shared Zod schemas generated/aligned from the API contract.
- `expo-secure-store` for access and refresh tokens; AsyncStorage only for non-sensitive preferences/cache metadata.
- A single request client with timeout, cancellation, structured errors, correlation IDs, one-flight refresh, retry rules, and logout-on-terminal-refresh-failure.
- Zustand only if a small amount of transient client state cannot be expressed through navigation, forms, or the server cache.
- Maestro for black-box device E2E; React Native Testing Library for component behavior.

## 5. Contract-first backend work

Complete this work before feature UI depends on it:

1. Inventory all gateway-exposed routes and make one OpenAPI 3.1 contract authoritative.
2. Correct stale paths, methods, envelopes, enums, pagination, error shapes, and auth requirements.
3. Add contract tests that fail when Express/Kong routes and OpenAPI diverge.
4. Generate TypeScript types/client code for both web and mobile; prohibit feature-local URL strings.
5. Standardize response envelopes and error codes, including validation fields and request IDs.
6. Add idempotency keys to money movement, appointment creation, order creation, and other replay-sensitive commands.
7. Define webhook state transitions and a client verification/reconciliation endpoint for Paystack returns.
8. Repair provider-availability writes and appointment slot contracts.
9. Decide whether home uses one patient-summary BFF endpoint or documented parallel queries.
10. Seed deterministic E2E users, providers, slots, products, prescriptions, wallet balances, and orders.

Backend gaps that block or reduce v1 scope:

| Desired experience  | Current gap                                         | v1 treatment                                                    |
| ------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Nearby pharmacy map | no verified geospatial pharmacy-search contract     | add endpoint or ship list search without map                    |
| Ratings/reviews     | no review model/API                                 | omit rating submission; display only verified backend data      |
| Emergency/ambulance | no emergency domain/service                         | exclude from v1 and marketing until clinically governed         |
| Medical attachments | history is JSON; no document API                    | text history first or add secure document model/upload flow     |
| Direct phone call   | telemedicine covers rooms, not private PSTN calling | omit; use in-app telemedicine only                              |
| Premium benefits    | entitlement enforcement is incomplete               | show only benefits enforced by backend pricing/order logic      |
| Push registration   | token persistence/lifecycle is incomplete           | implement device-token records, rotation, revoke, preferences   |
| Production video    | backend can issue simulated tokens                  | block production release unless real provider path passes tests |

## 6. TDD and real E2E strategy

“Thing” means an independently releasable vertical product slice, not each file or visual component. Every slice begins with 3–10 black-box E2E scenarios written against acceptance criteria. Unit, component, contract, accessibility, and integration tests are additional and do not count toward that number.

### Test pyramid

- **Pure/unit:** validation, formatting, reducers, price presentation, permission/state machines.
- **Component/integration:** user events with React Native Testing Library, mocked network only at the contract boundary.
- **Contract:** generated client against OpenAPI examples; OpenAPI against live gateway routes and error envelopes.
- **Backend integration:** real Postgres and Redis; deterministic adapters or provider sandboxes for email, SMS, Paystack, object storage, and video.
- **Real E2E:** release-like iOS Simulator and Android Emulator builds controlled by Maestro, communicating through Kong with a seeded isolated backend. No mocked application API inside the device build.
- **Visual/accessibility:** screenshot baselines for critical states and automated accessibility checks, followed by manual VoiceOver/TalkBack passes.

### E2E matrix

| Slice                    | Real E2E scenarios to write first                                                                                                                                                                               | Count |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: |
| Foundation/session       | fresh install; valid restore; expired-token refresh; terminal refresh logout; offline launch with cached shell; unauthenticated deep link                                                                       |     6 |
| Authentication           | email registration; validation errors; OTP success; wrong/expired OTP and resend; password login; invalid login; forgot/reset password; Google callback; Apple callback; logout-all session invalidation        |    10 |
| Home/discovery           | populated home; no appointments; provider search; specialty filter; pagination; request failure with retry                                                                                                      |     6 |
| Provider/booking         | provider detail; available slots; empty day; held/taken slot conflict; book with wallet; insufficient balance; external Paystack success; cancel external checkout; failed verification; confirmation deep link |    10 |
| Appointments             | upcoming/past tabs; detail; reschedule success; reschedule conflict; cancel with confirmation; join disabled before window; join enabled in window                                                              |     7 |
| Telemedicine             | permission granted; camera denied; microphone denied; lobby join; reconnect after network loss; remote ends; patient ends; invalid/expired room                                                                 |     8 |
| Prescriptions            | empty state; list; detail; unsigned/non-orderable state; orderable signed prescription; dispensed history                                                                                                       |     6 |
| Pharmacy/order           | browse/search; product detail; cart quantity/stock; prescription route; pickup; delivery/address; server-calculated total; Paystack success; idempotent retry; tracking through terminal status                 |    10 |
| Wallet/payments          | balance/history; virtual account; top-up launch; verified return; abandoned return; failed verification; duplicate callback; sensitive-data redaction                                                           |     8 |
| Subscription/rewards     | plan load; subscribe success; subscribe failure; entitlement refresh; cancel/renewal state; rewards earn display; rewards redeem/conflict                                                                       |     7 |
| Messages/notifications   | empty inbox; conversation list; send/receive; send retry; read state; push deep link; permission denied; preference update                                                                                      |     8 |
| Account/medical/security | edit profile; avatar upload; medical history; invalid fields; address CRUD; change password; 2FA setup/verify; biometric lock/unlock; revoke session; account logout cleanup                                    |    10 |

Run the minimum happy-path smoke subset on every pull request on both platforms. Run the full matrix nightly and before release. Any test that depends on a third-party sandbox also needs a deterministic adapter test so provider downtime does not obscure Ricton regressions.

### Test-first loop for each slice

1. Write acceptance criteria and failing Maestro journeys.
2. Add/repair OpenAPI schemas and failing contract/backend tests.
3. Implement backend behavior and generated client changes.
4. Build mobile states and component tests.
5. Make iOS and Android E2E pass through the gateway.
6. Run accessibility, visual, offline, and analytics assertions.
7. Add the web consumer to regression coverage when the contract is shared.

## 7. Delivery phases and gates

### Phase 0 — Baseline and governance

- Freeze the audited mobile source inventory and mark non-screen exports as artifacts.
- Approve patient-first v1 scope and compliance-safe copy.
- Create design-token and API-contract ownership rules.
- Fix CI so typecheck, unit, contract, and integration tests actually run.
- Fix production environment interpolation and add cleanup traps to test infrastructure.

**Exit gate:** clean web/mobile/backend typecheck baseline or explicitly quarantined known failures; CI reports real tests; owners agree on v1 scope.

### Phase 1 — Contract and app foundation

- Reconcile gateway, service routes, OpenAPI, enums, and response envelopes.
- Generate the client package.
- Scaffold Expo Router, environment profiles, development builds, tokens, primitives, secure session storage, query cache, error handling, telemetry redaction, and test harness.
- Replace both existing mobile API clients and remove direct service-port access.

**Exit gate:** foundation/session E2E passes on iOS and Android against the real seeded gateway.

### Phase 2 — Authentication and onboarding

- Build welcome, sign-in, registration, OTP, password recovery, social callbacks, and patient setup.
- Add session/device management and secure logout.

**Exit gate:** 10 auth E2E scenarios pass on both platforms; no tokens or PHI in logs/plain storage.

### Phase 3 — Home, discovery, and booking

- Build home, provider directory/detail, availability, booking review, wallet/external checkout, appointments, and notification reminders.
- Repair availability and idempotency contracts first.

**Exit gate:** home, discovery, booking, and appointment suites pass; double-booking and duplicate-payment cases are proven at the backend.

### Phase 4 — Clinical care

- Build telemedicine lobby/room/recovery and prescription list/detail/order handoff.
- Complete the native video proof-of-concept before committing UI polish.

**Exit gate:** real video provider configured in staging; clinical authorization, permission, reconnect, and terminal-state E2E pass.

### Phase 5 — Pharmacy and fulfillment

- Build catalog/search, prescription ordering, cart, address/fulfillment, checkout, and tracking.
- Add geospatial backend support only if the product keeps the map.

**Exit gate:** stock concurrency, server totals, webhook reconciliation, delivery/pickup, and all 10 pharmacy E2E cases pass.

### Phase 6 — Wallet, premium, messages, and account

- Build remaining wallet, subscription, rewards, messaging, notifications, profile, medical, address, and security experiences.
- Align any shared web consumers to the same generated client.

**Exit gate:** every listed slice passes; entitlement and money states are server-authoritative.

### Phase 7 — Release hardening

- Performance budgets, startup tracing, crash-free testing, poor-network testing, accessibility audit, privacy review, penetration testing, store assets, support/runbooks, staged rollout, and rollback drill.
- Test supported lowest OS versions and a representative phone-size matrix.

**Exit gate:** zero open release-blocking defects; full E2E matrix green on both platforms; backend SLOs and alerting live; App Store and Play Store privacy disclosures reviewed.

## 8. Definition of done for every slice

A slice is done only when:

- Product acceptance criteria and error/recovery states are documented.
- Mobile visuals use approved semantic tokens and primitives.
- VoiceOver and TalkBack labels/order are correct; text scaling and reduced motion work.
- The authoritative OpenAPI contract, backend implementation, generated client, web consumer, and mobile consumer agree.
- No secrets, tokens, payment details, or health data leak to logs/analytics.
- 3–10 real E2E scenarios pass on iOS and Android through the gateway.
- Unit/component/contract/backend tests pass and cover failure paths.
- Analytics events have privacy review and stable names.
- Loading, empty, offline, stale, error, retry, and success states are implemented.
- Documentation, fixtures, progress tracker, and release notes are updated.

## 9. Immediate implementation order

1. Repair the baseline: web type errors, CI test execution, deploy environment interpolation, and E2E cleanup.
2. Produce the authoritative route/OpenAPI diff and decide the few contested contracts.
3. Add `packages/api-contract` and generated TypeScript client.
4. Add `packages/design-tokens`, first applying it to shared web primitives and the mobile foundation.
5. Rebuild `apps/mobile` foundation and write the six session E2E tests.
6. Deliver auth as the first fully vertical, dual-platform slice.
7. Continue in the phase order above, updating `Progress.md` at every gate.

## 10. Decisions requiring product or operational sign-off

- Confirm patient-only v1 and whether clinician mobile is a later separate product surface.
- Confirm the production base domains and staging environment.
- Approve or remove unsupported experiences: emergency/ambulance, phone calls, ratings, medical attachments, and live pharmacy map.
- Validate all compliance, certification, provider-count, and transaction-count marketing claims.
- Choose the production native video integration after a development-build proof-of-concept.
- Decide whether pharmacy delivery is Ricton-managed, pharmacy-managed, or a third-party logistics integration.
- Define premium entitlements and cancellation/refund rules in backend-enforceable terms.

These decisions do not block foundation and authentication work; they block only the affected later slices.
