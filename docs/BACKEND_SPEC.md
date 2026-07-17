# Ricton Backend Engineering Specification

> **Document type**: UI/UX-driven backend engineering specification
> **Source of truth**: Design exports in `RICTON UI_UX/Web/` and `RICTON UI_UX/Mobile/`
> **Companion docs**: `docs/BACKEND_GAMEPLAN.md` (engineering plan/self-audit), `Ricton_Developer_Contract_Final.pdf` (legal contract)
> **Date**: 2026-07-17
> **Audience**: Senior backend SWEs building the Ricton platform

This document translates every screen in the UI/UX export set into concrete backend requirements: endpoints, data models, business rules, and integrations. It cross-references the **actual** current backend state (noted as DONE / PARTIAL / MISSING) and is organized by portal/role.

---

## 0. How to read this document

| Marker     | Meaning                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| ✅ DONE    | Endpoint + handler exist and are wired to a route in a service with source.            |
| 🟡 PARTIAL | Model/route/partial handler exists but is incomplete or unverified against the screen. |
| ❌ MISSING | No service source, no route, no controller. Must be built from scratch.                |

> **Critical reality check on the "5 services" audit**: The repo currently contains **11 service directories**, but only **4 have source code**: `auth`, `user`, `payment`, `wallet`. The remaining seven — `appointment`, `prescription`, `telemedicine`, `pharmacy`, `notification`, `admin`, `analytics` — are **empty scaffolds** (no `src/`). Therefore the bulk of this spec (clinical, commerce, provider, admin) is ❌ MISSING. See §11 for the precise file audit.

### 0.1 Existing implemented surface (verified)

- **auth-service**: register, login, OTP send/verify, Google/Apple OAuth, refresh, logout, password forgot/reset, verify email/phone/contact. ✅
- **user-service**: get/update profile, avatar upload URL (S3), medical history update, provider search, provider-by-id. ✅
- **payment-service**: Paystack init/verify/webhook, list/get payments. ✅
- **wallet-service**: get wallet, create virtual account (Paystack DVA), Paystack webhook. ✅
- **shared package**: errors, response, logger, resilience, redis, cors, otp, health, rate-limit, schema validation, OpenAPI registry. ✅
- **auth-middleware**: `requireAuth` (JWT verify). RBAC present but not yet enforced per-route in built services. 🟡
- **gateway (Kong)**: routes configured only for auth/user/docs/payment/wallet. Other services unregistered. 🟡

### 0.2 Conventions used in endpoint specs

```
METHOD /api/<service>/<path>
Auth:   [none | requireAuth | requireAuth + RBAC(ROLE) | webhook-sig]
Body:   { ... }
Success: 200/201 { success, data }
Errors:  400 VALIDATION, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 NOT_FOUND,
         409 CONFLICT, 422 UNPROCESSABLE, 429 RATE_LIMITED, 5xx SERVER
Rules:  - bulleted business rules
```

All responses follow `{ success: boolean, data: T, error?: { code, message } }` (see `@ricton/shared/response`).

---

## 1. Authentication & Authorization

**Source screens (Mobile):** `Welcome to Ricton`, `Login`, `Login - with Google`, `Phone number`, `Temporary code`, `Confirm email`, `Email confirmed`, `Create password`, `Reset password`, `Reset password alert`, `loading - reset password`, `loading - Google & Apple`.
**Source screens (Web):** `Log in page*`, `Register`, `Log out page C/H/P`, `Treating a patient*`.

### 1.1 Flow inference

```
Welcome ──▶ Login (email|phone|Google|Apple)
              ├─ email+password ─────────────────▶ Home
              ├─ phone ─▶ Temporary code (OTP) ──▶ Home
              ├─ Google/Apple OAuth ─▶ loading ──▶ New? Create password/Profile ──▶ Home
              └─ Forgot? Reset password ─▶ Temporary code ─▶ Create password
New user (any path) ─▶ Confirm email ─▶ Email confirmed ─▶ Onboarding
```

### 1.2 Endpoint inventory

| #   | Endpoint                             | Status     | Notes                                                                                             |
| --- | ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------- |
| A1  | `POST /api/auth/register`            | ✅ DONE    | Validates role, creates `User` (PENDING), profile row.                                            |
| A2  | `POST /api/auth/login`               | ✅ DONE    | Email/phone + password. Returns JWT + refresh.                                                    |
| A3  | `POST /api/auth/otp/send`            | ✅ DONE    | Channel inferred (email/phone). Needs explicit `channel` field. 🟡                                |
| A4  | `POST /api/auth/otp/verify`          | ✅ DONE    |                                                                                                   |
| A5  | `POST /api/auth/oauth/google`        | ✅ DONE    | `loading - Google & Apple` screen maps here.                                                      |
| A6  | `POST /api/auth/oauth/apple`         | ✅ DONE    |                                                                                                   |
| A7  | `POST /api/auth/refresh`             | ✅ DONE    |                                                                                                   |
| A8  | `POST /api/auth/logout`              | ✅ DONE    | Should revoke refresh token (verify revocation exists). 🟡                                        |
| A9  | `POST /api/auth/password/forgot`     | ✅ DONE    |                                                                                                   |
| A10 | `POST /api/auth/password/reset`      | ✅ DONE    | `Reset password` + `loading` screens.                                                             |
| A11 | `POST /api/auth/verify-email`        | ✅ DONE    | `Confirm email` / `Email confirmed` screens.                                                      |
| A12 | `POST /api/auth/verify-phone`        | ✅ DONE    | `Phone number` / `Temporary code` screens.                                                        |
| A13 | `POST /api/auth/verify/confirm`      | ✅ DONE    |                                                                                                   |
| A14 | `POST /api/auth/logout` (per portal) | ❌ MISSING | `Log out page C/H/P` implies portal-aware logout + session/device purge across all role sessions. |

### 1.3 Gaps & required changes

- **`SendOtpInputSchema`** must add `channel: 'SMS' | 'EMAIL'` and `purpose: 'LOGIN' | 'REGISTER' | 'PASSWORD_RESET' | 'VERIFY_EMAIL' | 'VERIFY_PHONE'`. Currently purpose is implicit.
- **Refresh token storage**: confirm a `refresh_tokens` table or Redis store exists for revocation (A8). Not present in schema — needs `RefreshToken` model or Redis set. ❌ MISSING from Prisma.
- **NDPA 2023**: consent capture at registration (`Temporary code`/`Confirm email`) must store a `consentVersion` + `consentAt` on `User`. Add fields:
  ```prisma
  consentVersion String?
  consentAt      DateTime? @db.Timestamptz(6)
  lastLoginAt    DateTime? @db.Timestamptz(6)
  ```
- **RBAC enforcement**: `requireAuth` exists; role-gating decorator `requireRole(...)` must be applied across all new service routes (see §10).

---

## 2. Patient Portal — Mobile & Web

### 2.1 Onboarding & Account

**Source screens:** `Account free`, `Account Premium`, `Account medical history`, `Account personal info`, `Account Security &`, `Acount premium user*`, `Upgrade to premium 1/2/3`, `Premium user done`, `Address`, `Email`, `Menu`.

| #   | Endpoint                                 | Status                                                                           |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| P1  | `GET/PUT /api/users/me`                  | ✅ DONE (`Account personal info`)                                                |
| P2  | `PUT /api/users/me/medical-history`      | ✅ DONE (`Account medical history`)                                              |
| P3  | `PUT /api/users/me/avatar`               | ✅ DONE                                                                          |
| P4  | `GET /api/users/me/security`             | ❌ MISSING (`Account Security &`) — password change, active sessions, 2FA toggle |
| P5  | `POST /api/users/me/password`            | ❌ MISSING (change password while logged in)                                     |
| P6  | `GET /api/users/me/sessions`             | ❌ MISSING (device/session list for logout)                                      |
| P7  | `DELETE /api/users/me/sessions/:id`      | ❌ MISSING                                                                       |
| P8  | `GET /api/users/me/addresses`            | ❌ MISSING (`Address`) — needs `Address` model                                   |
| P9  | `POST /api/users/me/addresses`           | ❌ MISSING                                                                       |
| P10 | `PUT/DELETE /api/users/me/addresses/:id` | ❌ MISSING                                                                       |
| P11 | `GET /api/subscriptions/me`              | ❌ MISSING (`Account free`/`Premium`)                                            |
| P12 | `POST /api/subscriptions/upgrade`        | ❌ MISSING (`Upgrade to premium`)                                                |
| P13 | `DELETE /api/subscriptions/me` (cancel)  | ❌ MISSING                                                                       |

**Model gaps:**

- New `Address` model (line1, city, state, country, postalCode, lat, lng, isDefault).
- `User.twoFactorEnabled Boolean?`, `User.deletedAt DateTime?` (soft-delete for NDPA right-to-erasure).
- `Subscription` model exists (FREE/PREMIUM) but needs `planFeatures`, `priceNgn`, `trialEndsAt`.

### 2.2 Home & Discovery

**Source screens:** `Home page`, `Home (after the user has booked an appointment)`, `1 Landing page` (web), `Home-1..30` (web marketing/feature surfaces).

| #   | Endpoint                                        | Status                                                       |
| --- | ----------------------------------------------- | ------------------------------------------------------------ |
| H1  | `GET /api/providers?specialty=&lat=&lng=&page=` | ✅ DONE (partial — no geo/filter yet) 🟡                     |
| H2  | `GET /api/providers/:id`                        | ✅ DONE                                                      |
| H3  | `GET /api/home/feed`                            | ❌ MISSING (upcoming appt, recommendations, banners)         |
| H4  | `GET /api/providers/:id/availability`           | ❌ MISSING (`ProviderAvailability` model exists, no service) |
| H5  | `GET /api/specialties`                          | ❌ MISSING (taxonomy for `Home` filters)                     |
| H6  | `GET /api/hospitals?lat=&lng=`                  | ❌ MISSING (`Hospital` model exists, no endpoint)            |

**Rules:** H1 must support geo-radius + specialty + rating + availability-soonest sort. This powers booking step 1.

### 2.3 Appointment Booking

**Source screens:** `Booking - 1 through 62` (62-step wizard), `Appointment page`, `Home (after booking)`, `Cancel appointment`, `Cancel appointment tele medicine`, `Reschedule appointment`, `Reschedule appointment tele medicine`.

This is the largest single flow. The 62 export frames imply a wizard: **specialty → provider → hospital/clinic → date → time slot → visit type (in-person/video) → reason/notes → review → payment → confirm → success**.

| #   | Endpoint                                               | Status                                |
| --- | ------------------------------------------------------ | ------------------------------------- |
| B1  | `GET /api/appointments/availability?providerId=&date=` | ❌ MISSING                            |
| B2  | `POST /api/appointments`                               | ❌ MISSING                            |
| B3  | `GET /api/appointments/me?status=&page=`               | ❌ MISSING                            |
| B4  | `GET /api/appointments/:id`                            | ❌ MISSING                            |
| B5  | `PATCH /api/appointments/:id/cancel`                   | ❌ MISSING (`Cancel appointment`)     |
| B6  | `PATCH /api/appointments/:id/reschedule`               | ❌ MISSING (`Reschedule appointment`) |
| B7  | `POST /api/appointments/:id/reminder`                  | ❌ MISSING (optional)                 |

**Owner service:** `appointment-service` (currently empty ❌).

**Sample spec:**

```
POST /api/appointments
Auth: requireAuth + RBAC(PATIENT)
Body: {
  providerId: uuid, hospitalId?: uuid,
  scheduledAt: ISO8601, durationMinutes: int (default 30),
  type: "IN_PERSON" | "VIDEO", reason?: string, notes?: string
}
Success: 201 { appointment, paymentReference? }
Errors:  409 SLOTS_DOUBLE_BOOKED, 422 PROVIDER_UNAVAILABLE, 402 PAYMENT_REQUIRED
Rules:
  - Conflicts with existing Appointment for same provider within slot => 409.
  - If type=VIDEO => auto-create TelemedicineRoom (§4).
  - If consultationFee > 0 => create Payment(APPOINTMENT, PENDING); appointment stays PENDING until paid.
  - Send confirmation Notification (IN_APP + SMS/EMAIL per preference).
  - AuditLog(action=APPOINTMENT_CREATE, actorId=patient).
```

**Model gaps:**

- `Appointment` lacks `reason String?`, `reminderSentAt DateTime?`, `cancelledBy UserRole?`. Add them.
- Need index on `(providerId, scheduledAt)` for slot conflict queries.

### 2.4 Telemedicine (Patient side)

**Source screens:** `Tele medicine page*`, `Cancel appointment tele medicine`, `Reschedule appointment tele medicine`, `Treat a patient` (provider side).

| #   | Endpoint                                | Status                                 |
| --- | --------------------------------------- | -------------------------------------- |
| T1  | `GET /api/telemedicine/rooms/:id/token` | ❌ MISSING (Twilio Video access token) |
| T2  | `POST /api/telemedicine/rooms/:id/join` | ❌ MISSING                             |
| T3  | `POST /api/telemedicine/rooms/:id/end`  | ❌ MISSING                             |
| T4  | `GET /api/telemedicine/sessions/me`     | ❌ MISSING                             |

**Owner:** `telemedicine-service` (empty ❌).
**Integration:** Twilio Video (create room on appointment confirm; mint per-participant access tokens with TTL). `TelemedicineRoom.externalRoomId` already maps to Twilio SID.

### 2.5 E-Prescription (Patient view)

**Source screens:** `Prescription page*`, `Acount premium user MH/PI/SP`.

| #   | Endpoint                           | Status                |
| --- | ---------------------------------- | --------------------- |
| RX1 | `GET /api/prescriptions/me`        | ❌ MISSING            |
| RX2 | `GET /api/prescriptions/:id`       | ❌ MISSING            |
| RX3 | `GET /api/prescriptions/:id/items` | ❌ MISSING (inferred) |

**Owner:** `prescription-service` (empty ❌). `Prescription` model exists with `DRAFT→SIGNED→SENT_TO_PHARMACY→DISPENSED→CANCELLED`.

### 2.6 Pharmacy Orders & Fulfilment

**Source screens:** `My order`, `My order-1..9`, `Pickup`, `Delivery`.

| #   | Endpoint                                            | Status                                      |
| --- | --------------------------------------------------- | ------------------------------------------- |
| O1  | `POST /api/orders` (from prescription or catalogue) | ❌ MISSING                                  |
| O2  | `GET /api/orders/me?status=&page=`                  | ❌ MISSING                                  |
| O3  | `GET /api/orders/:id`                               | ❌ MISSING                                  |
| O4  | `PATCH /api/orders/:id/cancel`                      | ❌ MISSING                                  |
| O5  | `GET /api/orders/:id/track`                         | ❌ MISSING (`Delivery` tracking)            |
| O6  | `POST /api/pharmacies/nearby?lat=&lng=`             | ❌ MISSING (`PharmacyProfile` model exists) |

**Owner:** `pharmacy-service` (empty ❌). `PharmacyOrder`, `OrderItem`, `OrderStatus` exist.

**Rules:** O1 may reference `prescriptionId` (auto-fill items) OR be OTC (manual items). `deliveryType` PICKUP vs DELIVERY drives `Pickup`/`Delivery` screens. On DELIVERED update `Wallet`/loyalty.

### 2.7 Wallet & Payments (Patient)

**Source screens:** `Wallet page`, `wallet page*`, `Payment`.

| #   | Endpoint                                 | Status                                                                        |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| W1  | `GET /api/wallets/me`                    | ✅ DONE                                                                       |
| W2  | `POST /api/wallets/virtual-account`      | ✅ DONE                                                                       |
| W3  | `GET /api/wallets/me/transactions?page=` | ❌ MISSING                                                                    |
| W4  | `POST /api/wallets/topup`                | ❌ MISSING (creates Payment WALLET_TOPUP → Paystack → webhook credits wallet) |
| W5  | `POST /api/payments/initialize`          | ✅ DONE                                                                       |
| W6  | `GET /api/payments/verify/:ref`          | ✅ DONE                                                                       |
| W7  | `GET /api/payments` / `/:id`             | ✅ DONE                                                                       |

**Rules:** Wallet debit must be atomic (DB transaction + `balanceAfter` invariant in `WalletTransaction`). W3/W4 ❌ not yet built.

### 2.8 Rewards / Loyalty (Patient)

**Source screens:** `Reward*`, `Rewards 1 P/2 P/3 P`, `Acount premium user*`.

| #   | Endpoint                                         | Status                        |
| --- | ------------------------------------------------ | ----------------------------- |
| R1  | `GET /api/rewards/me` (points balance + history) | ❌ MISSING                    |
| R2  | `GET /api/rewards/catalog`                       | ❌ MISSING (redeemable items) |
| R3  | `POST /api/rewards/redeem`                       | ❌ MISSING                    |

**Model:** `RewardPoint` exists (points, reason, referenceType/Id). Needs `RewardCatalog` model (item, cost, stock) ❌ MISSING.

### 2.9 Inbox / Messaging (Patient)

**Source screens:** `Inbox 1 H/2 H` (provider side, but patient mirrors).

| #   | Endpoint                         | Status     |
| --- | -------------------------------- | ---------- |
| M1  | `GET /api/messages/threads`      | ❌ MISSING |
| M2  | `GET /api/messages/threads/:id`  | ❌ MISSING |
| M3  | `POST /api/messages/threads/:id` | ❌ MISSING |

**Model:** `Message` model referenced in audit but **not present in current schema.prisma** ❌ MISSING. Needs schema addition.
**Transport:** Redis pub/sub (per `BACKEND_GAMEPLAN.md`) + WebSocket via Kong; persistence in `messages` table.

### 2.10 Notifications (Patient)

**Source screens:** implied via `Menu`, `Success`, alerts.

| #   | Endpoint                                         | Status     |
| --- | ------------------------------------------------ | ---------- |
| N1  | `GET /api/notifications?page=`                   | ❌ MISSING |
| N2  | `PATCH /api/notifications/:id/read`              | ❌ MISSING |
| N3  | `GET/PUT /api/notifications/preferences`         | ❌ MISSING |
| N4  | `POST /api/notifications/:id` (provider→patient) | ❌ MISSING |

**Owner:** `notification-service` (empty ❌). `Notification`, `NotificationPreference` models exist. Delivery via SendGrid (email) + Twilio (SMS) + FCM (push) per preferences + quiet hours.

---

## 3. Consultant / Doctor Portal (Web + Mobile)

**Source screens (Web):** `1 doctor onboarding page` + `2-7 doctor onboarding page`, `1 Doctor home page`, `Doctor page 1-8 H`, `Appointment page 1-4 H`, `Appointment page 6-7 H`, `E-Prescription page 1-14 H`, `Treat a patient*`, `Tele-medicine 1-7 H`, `Earnings 1 H`, `Inbox 1 H/2 H`, `Setting 1-3 H`, `MDTs 1D-8`.

### 3.1 Onboarding

| #   | Endpoint                                                                                    | Status     |
| --- | ------------------------------------------------------------------------------------------- | ---------- |
| D1  | `POST /api/providers/onboarding` (multi-step: identity, license, specialty, bio, fee, docs) | ❌ MISSING |
| D2  | `POST /api/providers/documents` (license, certs → S3)                                       | ❌ MISSING |
| D3  | `PATCH /api/providers/me/verify` (admin approval flow)                                      | ❌ MISSING |

**Model:** `ProviderProfile` exists (licenseNumber, specialty, consultationFee, isVerified, rating). Add `onboardingStep Int`, `documents Json`, `idVerifiedAt DateTime?`.

### 3.2 Provider Home & Schedule

| #   | Endpoint                                                              | Status                            |
| --- | --------------------------------------------------------------------- | --------------------------------- |
| D4  | `GET /api/providers/me/dashboard` (today's appts, earnings, tasks)    | ❌ MISSING                        |
| D5  | `GET /api/providers/me/appointments?date=&status=`                    | ❌ MISSING                        |
| D6  | `PUT /api/providers/me/availability` (bulk set slots)                 | ❌ MISSING                        |
| D7  | `GET/PUT /api/providers/me/profile`                                   | ❌ MISSING (extends user-service) |
| D8  | `PATCH /api/appointments/:id/status` (confirm/start/complete/no-show) | ❌ MISSING                        |

**Rules:** D8 transitions must be role-checked (only provider or system). COMPLETED triggers `ProviderEarning` creation + `RewardPoint` accrual + prescription enablement.

### 3.3 E-Prescription (Provider authoring)

| #   | Endpoint                                                          | Status     |
| --- | ----------------------------------------------------------------- | ---------- |
| D9  | `POST /api/prescriptions` (create DRAFT)                          | ❌ MISSING |
| D10 | `POST /api/prescriptions/:id/items`                               | ❌ MISSING |
| D11 | `POST /api/prescriptions/:id/sign` (SIGNED; digital signature)    | ❌ MISSING |
| D12 | `POST /api/prescriptions/:id/send-to-pharmacy` (SENT_TO_PHARMACY) | ❌ MISSING |

**Rules:** Signing requires `provider.isVerified`. Signature hash stored for NDPA/legal integrity. D11/D12 are 14-screen E-Prescription flow.

### 3.4 Telemedicine (Provider)

| #   | Endpoint                                                                    | Status     |
| --- | --------------------------------------------------------------------------- | ---------- |
| D13 | `POST /api/telemedicine/rooms` (provider-initiated, e.g. `Treat a patient`) | ❌ MISSING |
| D14 | `GET /api/telemedicine/rooms/:id`                                           | ❌ MISSING |
| D15 | `POST /api/telemedicine/rooms/:id/end`                                      | ❌ MISSING |
| D16 | `GET /api/telemedicine/sessions/me`                                         | ❌ MISSING |

### 3.5 Earnings

**Source screens:** `Earnings 1 H`, `ProviderEarning` model.

| #   | Endpoint                                 | Status     |
| --- | ---------------------------------------- | ---------- |
| D17 | `GET /api/providers/me/earnings?period=` | ❌ MISSING |
| D18 | `GET /api/providers/me/earnings/payouts` | ❌ MISSING |
| D19 | `POST /api/providers/me/payout-request`  | ❌ MISSING |

**Model:** `ProviderEarning` exists (amount, status PENDING/AVAILABLE/PAID_OUT, payoutReference). Payout via Paystack Transfer (needs secret key + recipient code).

### 3.6 MDT (Multi-Disciplinary Team)

**Source screens:** `MDTs 1D-8`, `TelemedicineRoomType.MDT`.

| #   | Endpoint                                                | Status                                                                  |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| D20 | `POST /api/mdts` (create MDT case)                      | ❌ MISSING                                                              |
| D21 | `POST /api/mdts/:id/participants`                       | ❌ MISSING (`MDTParticipant` model in audit but **absent from schema**) |
| D22 | `GET /api/mdts/me`                                      | ❌ MISSING                                                              |
| D23 | `POST /api/mdts/:id/rooms` (spins MDT TelemedicineRoom) | ❌ MISSING                                                              |

**Model gaps:** `MDT` and `MDTParticipant` models referenced in audit are **not in schema.prisma** ❌ MISSING. Add:

```prisma
model MDT {
  id String @id @default(uuid()) @db.Uuid
  title String
  patientId String @db.Uuid
  createdBy String @db.Uuid
  status MDTStatus @default(OPEN)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  participants MDTParticipant[]
}
model MDTParticipant {
  id String @id @default(uuid()) @db.Uuid
  mdtId String @db.Uuid
  userId String @db.Uuid
  role String?
}
```

(Add `MDTStatus OPEN|ACTIVE|CLOSED` enum.)

### 3.7 Inbox / Settings

| #   | Endpoint                                               | Status     |
| --- | ------------------------------------------------------ | ---------- |
| D24 | `GET/PUT /api/providers/me/settings` (`Setting 1-3 H`) | ❌ MISSING |
| D25 | Messaging (see §2.9 M1-M3)                             | ❌ MISSING |

---

## 4. Hospital Portal (Web)

**Source screens:** `1 hospital home page H`, `1 Hospital onboarding page H` + `H-1..H-7`, `Appointment page 1-4 H / 6-7 H`, `Doctor page 1-8 H`, `Patient page 1 H / 4-9 H`, `Tele-medicine* H`, `Inbox* H`, `Setting* H`, `Earnings 1 H`, `Log out page H`.

### 4.1 Onboarding & Management

| #    | Endpoint                                                                              | Status                                          |
| ---- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| HOS1 | `POST /api/hospitals/onboarding` (H-1..H-7: org, address, contact, docs, departments) | ❌ MISSING                                      |
| HOS2 | `GET/PUT /api/hospitals/me`                                                           | ❌ MISSING                                      |
| HOS3 | `GET/POST/PUT/DELETE /api/hospitals/me/doctors`                                       | ❌ MISSING (links `ProviderProfile.hospitalId`) |
| HOS4 | `GET/POST/PUT /api/hospitals/me/departments`                                          | ❌ MISSING                                      |

**Model:** `Hospital` exists (name, address, phone, email, logoUrl, isActive). Add `registrationNumber`, `documents Json`, `onboardingComplete Boolean`, `departments Json`.

### 4.2 Hospital Ops

| #    | Endpoint                                                  | Status     |
| ---- | --------------------------------------------------------- | ---------- |
| HOS5 | `GET /api/hospitals/me/dashboard`                         | ❌ MISSING |
| HOS6 | `GET /api/hospitals/me/appointments`                      | ❌ MISSING |
| HOS7 | `GET /api/hospitals/me/patients` (`Patient page 1/4-9 H`) | ❌ MISSING |
| HOS8 | `GET /api/hospitals/me/doctors/:id` (`Doctor page 1-8 H`) | ❌ MISSING |
| HOS9 | `GET /api/hospitals/me/earnings`                          | ❌ MISSING |

---

## 5. Pharmacy Portal (Web)

**Source screens:** `Pharmacy home page P`, `Pharmacy onboarding page P 1-7`, `Product 1 P/2 P`, `Purchase 1-3 P`, `Sales 1 P/2 P`, `Earning 1 P`, `Reward 1-3 P`, `Rewards 1-3 P`, `Setting 1 P/4 P/5 P`, `Inbox*`, `Log out page P`.

### 5.1 Onboarding & Catalog

| #   | Endpoint                                                                           | Status     |
| --- | ---------------------------------------------------------------------------------- | ---------- |
| PH1 | `POST /api/pharmacies/onboarding` (P 1-7: license, address, hours, bank)           | ❌ MISSING |
| PH2 | `GET/PUT /api/pharmacies/me`                                                       | ❌ MISSING |
| PH3 | `GET/POST/PUT/DELETE /api/pharmacies/me/products` (`Product 1-2 P`)                | ❌ MISSING |
| PH4 | `GET/POST/PUT /api/pharmacies/me/purchases` (`Purchase 1-3 P` — wholesale restock) | ❌ MISSING |

**Model gaps:** `Product` model **absent from schema** ❌ MISSING. Add:

```prisma
model Product {
  id String @id @default(uuid()) @db.Uuid
  pharmacyId String @db.Uuid
  name String
  description String?
  price Decimal @db.Decimal(10,2)
  stock Int @default(0)
  category String?
  imageUrl String?
  isActive Boolean @default(true)
}
```

### 5.2 Orders & Sales

| #   | Endpoint                                                                                  | Status     |
| --- | ----------------------------------------------------------------------------------------- | ---------- |
| PH5 | `GET /api/pharmacies/me/orders?status=` (`Sales 1-2 P`)                                   | ❌ MISSING |
| PH6 | `PATCH /api/pharmacies/me/orders/:id/status` (CONFIRMED→PREPARING→READY/PICKUP→DELIVERED) | ❌ MISSING |
| PH7 | `GET /api/pharmacies/me/earnings` (`Earning 1 P`)                                         | ❌ MISSING |
| PH8 | `GET /api/pharmacies/me/rewards` (`Reward/Rewards P`)                                     | ❌ MISSING |

---

## 6. Admin Portal

**Source screens:** `About us*`, `Home*`, `Ricton-1..166` (feature/admin screens), `Pricing*`, `Services*`, `Resources*`.

| #   | Endpoint                                                      | Status     |
| --- | ------------------------------------------------------------- | ---------- |
| AD1 | `GET /api/admin/users?role=&status=`                          | ❌ MISSING |
| AD2 | `PATCH /api/admin/users/:id/status` (suspend/activate — NDPA) | ❌ MISSING |
| AD3 | `POST /api/admin/providers/:id/verify`                        | ❌ MISSING |
| AD4 | `GET /api/admin/audit-logs`                                   | ❌ MISSING |
| AD5 | `GET/PUT /api/admin/settings` (`SystemSettings` model)        | ❌ MISSING |
| AD6 | `POST /api/admin/pricing` (`Pricing*`)                        | ❌ MISSING |
| AD7 | `GET /api/admin/analytics/*`                                  | ❌ MISSING |

**Owner:** `admin-service` (empty ❌) + `analytics-service` (empty ❌).
**Model gaps:** `SystemSettings` model referenced in audit but **absent from schema** ❌ MISSING.

---

## 7. Cross-Portal / Marketing Screens

**Source screens (Web):** `1 Landing page`, `About us-1..30`, `Home-1..30`, `Pricing-1..30`, `Services-1..30`, `Resources-1..30`, `Ricton-1..166`, `Component 1` (shared UI kit).

These are mostly static/CMS. Backend needs:

- `GET /api/content/pages/:slug` (About/Pricing/Services/Resources) — ❌ MISSING (CMS-lite or static config service).
- `GET /api/features` (for `Ricton-1..166` feature grids) — ❌ MISSING.
- Consider a `content-service` or fold into `admin-service`.

---

## 8. Integrations Summary

| Integration                   | Used by                                                     | Status     | Required for                                                           |
| ----------------------------- | ----------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| **Paystack**                  | payment, wallet, pharmacy, subscription, provider payout    | 🟡 PARTIAL | Init/verify/webhook done; payout-transfer + DVA top-up flows not built |
| **AWS S3 + CloudFront**       | user (avatars), provider/pharmacy/hospital docs, products   | 🟡 PARTIAL | Avatar upload URL done; signed URLs for other docs not built           |
| **Twilio** (SMS + Video)      | auth (OTP), notification (SMS), telemedicine (rooms/tokens) | 🟡 PARTIAL | OTP assumed; Video room/token service ❌ MISSING                       |
| **SendGrid** (email)          | auth (verify), notification, receipts                       | ❌ MISSING | Email transport not wired                                              |
| **FCM / APNs** (push)         | notification                                                | ❌ MISSING | Push transport                                                         |
| **Redis pub/sub + WebSocket** | messaging, realtime notifications                           | 🟡 PARTIAL | Redis client exists; WS gateway via Kong not built                     |
| **Kong** (gateway)            | all                                                         | 🟡 PARTIAL | Only 4 services registered                                             |

**New service-client needs** (`@ricton/service-client` exists in packages but verify usage): inter-service HTTP for appointment→payment, prescription→pharmacy, wallet→payment webhook reconciliation.

---

## 9. Data Model Gap Register (Prisma)

Present in schema: User, PatientProfile, ProviderProfile, PharmacyProfile, Hospital, ProviderAvailability, Appointment, Prescription, PrescriptionItem, TelemedicineRoom, TelemedicineParticipant, PharmacyOrder, OrderItem, Payment, Wallet, WalletTransaction, Subscription, Notification, NotificationPreference, AuditLog, ProviderEarning, RewardPoint.

**Missing models (referenced by UI/audit but absent):**

1. `RefreshToken` (or Redis equivalent) — A8 revocation.
2. `Address` — patient addresses (P8-P10).
3. `Message` — inbox/messaging (M1-M3).
4. `MDT` + `MDTParticipant` — MDT flow (D20-D23).
5. `Product` — pharmacy catalog (PH3).
6. `RewardCatalog` — redeemable rewards (R2-R3).
7. `SystemSettings` — admin (AD5).
8. `Specialty` / taxonomy — discovery (H5) [optional, can be enum/JSON].

**Fields to add to existing models:**

- `User`: `consentVersion`, `consentAt`, `lastLoginAt`, `twoFactorEnabled`, `deletedAt` (soft delete / NDPA erasure).
- `Appointment`: `reason`, `reminderSentAt`, `cancelledBy`.
- `ProviderProfile`: `onboardingStep`, `documents`, `idVerifiedAt`.
- `Hospital`: `registrationNumber`, `documents`, `onboardingComplete`, `departments`.
- `PharmacyProfile`: `documents`, `bankDetails`, `onboardingComplete`.
- `Subscription`: `priceNgn`, `planFeatures Json`, `trialEndsAt`.
- `Payment`: ensure `metadata` carries `orderId`/`subscriptionId` linkage already present via relations.

---

## 10. Authorization Matrix (RBAC)

Apply `requireRole(...)` (extend `@ricton/auth-middleware`) per route:

| Role           | Can access                                                                            |
| -------------- | ------------------------------------------------------------------------------------- |
| PATIENT        | Own profile, bookings, prescriptions, orders, wallet, rewards, messages (own threads) |
| CONSULTANT     | Provider dashboards, own appointments, prescribe, telemedicine host, earnings, MDT    |
| PHARMACIST     | Pharmacy dashboards, catalog, orders fulfilment, purchases, rewards                   |
| HOSPITAL_ADMIN | Hospital mgmt, linked doctors, hospital appointments/patients                         |
| SUPER_ADMIN    | Everything under `/api/admin/*`                                                       |

Cross-role data (e.g., patient reads own prescription; pharmacy reads prescription sent to it) enforced by ownership checks in service layer, not just RBAC.

---

## 11. Current Backend File Audit (verified)

| Service dir    | Has `src/`? | Routes                                      | Status     |
| -------------- | ----------- | ------------------------------------------- | ---------- |
| `auth`         | ✅          | 13 auth routes                              | ✅ DONE    |
| `user`         | ✅          | profile, avatar, medical-history, providers | ✅ DONE    |
| `payment`      | ✅          | init, verify, webhook, list, get            | ✅ DONE    |
| `wallet`       | ✅          | get, virtual-account, webhook               | ✅ DONE    |
| `appointment`  | ❌ empty    | —                                           | ❌ MISSING |
| `prescription` | ❌ empty    | —                                           | ❌ MISSING |
| `telemedicine` | ❌ empty    | —                                           | ❌ MISSING |
| `pharmacy`     | ❌ empty    | —                                           | ❌ MISSING |
| `notification` | ❌ empty    | —                                           | ❌ MISSING |
| `admin`        | ❌ empty    | —                                           | ❌ MISSING |
| `analytics`    | ❌ empty    | —                                           | ❌ MISSING |
| `docs`         | ✅          | Swagger UI                                  | ✅ DONE    |
| `test-new`     | ✅          | experimental                                | n/a        |

**Kong** (`gateway/kong.yml`) registers only auth/user/docs/payment/wallet. Every new service must add a service+route block.

---

## 12. Prioritized Implementation Order

Dependencies drive sequencing (a later phase needs an earlier one).

### Phase 1 — Foundation (blocks everything)

1. Prisma migrations for all §9 gaps (missing models + fields).
2. `RefreshToken`/consent fields; RBAC `requireRole` in auth-middleware.
3. Kong route blocks for new services (stub health first).

### Phase 2 — Clinical Core (Patient MVP)

4. **appointment-service**: B1-B7 (booking wizard backend). 🔑 Largest UI flow (62 screens).
5. **telemedicine-service**: T1-T4 + D13-D16 (rooms, Twilio tokens).
6. **prescription-service**: RX1-3 + D9-D12 (author + patient view).

### Phase 3 — Commerce

7. **pharmacy-service**: O1-O6, PH1-PH8 (orders, catalog, fulfilment, earnings).
8. Wallet top-up (W3-W4) + order payment reconciliation via payment webhook.
9. Rewards (R1-R3) + RewardCatalog.

### Phase 4 — Provider & Institution Portals

10. Consultant onboarding (D1-D3), schedule/availability (D4-D8), earnings (D17-D19), MDT (D20-D23).
11. Hospital portal (HOS1-HOS9).
12. Admin + analytics (AD1-AD7).

### Phase 5 — Comms & Compliance

13. **notification-service**: N1-N4 (SendGrid/Twilio/FCM).
14. **Messaging** (M1-M3) via Redis pub/sub + WS.
15. Content/CMS endpoints for marketing screens (§7).
16. NDPA pass: consent capture, data-export, soft-delete/erasure endpoint, audit-log coverage.

---

## 13. NDPA 2023 Compliance Requirements (visible in design)

| Requirement                        | Where in UI                                        | Backend action                                                   |
| ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| **Consent**                        | `Confirm email`, `Temporary code`, registration    | Store `consentVersion`/`consentAt` at signup (§1.3)              |
| **Data subject access**            | `Account medical history`, `Account personal info` | `GET /api/users/me` + export endpoint                            |
| **Right to erasure**               | account deletion (implied)                         | `User.deletedAt` soft delete + cascade + purge job               |
| **Audit trail**                    | all transactional screens                          | `AuditLog` writes on auth, booking, prescription, payment, admin |
| **Breach notification / security** | `Account Security &`                               | 2FA, session list, forced logout (P4-P7)                         |
| **Data minimization**              | profile forms                                      | Only collect fields present in models                            |
| **Retention**                      | `SystemSettings`                                   | Configurable retention for logs/notifications                    |

---

## 14. Open Questions for Product/Design

1. **62 Booking frames** — confirm exact wizard step order; B1-B7 assume a standard flow.
2. **Free vs Premium** feature gating — which endpoints check `Subscription.plan`? (P11-P13).
3. **MDT participant roles** — who can create MDTs (consultant only? hospital admin?).
4. **Push notifications** — is FCM the chosen provider, or Expo Push (mobile is Expo)?
5. **Product catalog** scope — pharmacy-only or also a Ricton marketplace?
6. **Pricing** screens — are these public marketing or in-app plan management?

---

_End of specification. This document is the backend build contract derived from the UI/UX exports; pair with `BACKEND_GAMEPLAN.md` for architecture rationale and `Ricton_Developer_Contract_Final.pdf` for legal clauses._
