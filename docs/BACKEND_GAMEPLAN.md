# Ricton Backend — Gameplan & Self-Audit

> **Author**: Backend SWE (sole backend developer)
> **Date**: 2026-06-24
> **Contract ref**: `Ricton_Developer_Contract_Final.pdf`
> **Repo**: `ricton-api` (this repo — backend monorepo)
> **Consumers**: `ricton-web` (B2B React, separate dev), `ricton-mobile` (B2C Expo, separate dev)

---

## Table of Contents

1. [Hard Constraints (Non-Negotiable)](#1-hard-constraints)
2. [Architecture Decisions & Justifications](#2-architecture-decisions)
3. [Data Model (Full Schema Audit)](#3-data-model)
4. [Service-by-Service Contracts](#4-service-contracts)
5. [Timeline Feasibility (Honest Assessment)](#5-timeline-feasibility)
6. [Cross-Cutting Concerns](#6-cross-cutting-concerns)
7. [Risk Register](#7-risk-register)
8. [What I'm NOT Building](#8-what-im-not-building)
9. [Frontend/Mobile Handoff Strategy](#9-handoff-strategy)
10. [Execution Checklist](#10-execution-checklist)

---

## 1. Hard Constraints

These come directly from the contract. No negotiation.

| Constraint                    | Source          | Implication                                                                 |
| ----------------------------- | --------------- | --------------------------------------------------------------------------- |
| Node.js / Express             | Clause 1.2(c)   | No Fastify, no Nest.js, no Hono. Express + TypeScript.                      |
| Docker + AWS EKS              | Clause 1.2(c,d) | Every service gets a Dockerfile. K8s manifests for EKS.                     |
| PostgreSQL (RDS)              | Clause 1.2(d)   | No MongoDB, no DynamoDB. Single RDS instance, schema isolation.             |
| Redis                         | Clause 1.2(d)   | Session cache, OTP store, rate limiting, pub/sub for notifications.         |
| S3 + CloudFront               | Clause 1.2(d)   | File storage (avatars, documents). CDN for static delivery.                 |
| Kong API Gateway              | Clause 1.2(d)   | Not a custom Express proxy. Kong in Docker, declarative config.             |
| GitHub Actions + ArgoCD       | Clause 1.2(d)   | CI via GH Actions. CD via ArgoCD watching K8s manifests.                    |
| Datadog + Sentry              | Clause 1.2(d)   | APM + error tracking. SDK integrations per service.                         |
| Paystack                      | Clause 1.2(b)   | Payment processor. Virtual accounts for wallet.                             |
| TLS 1.3, AES-256, OWASP, RBAC | Clause 7.2      | Security requirements are contractual, not optional.                        |
| NDPA 2023 compliance          | Clause 7.1      | Nigeria Data Protection Act. Affects data retention, consent, PII handling. |
| 12-week delivery              | Clause 2.1      | Non-negotiable timeline.                                                    |

### Self-Audit Note: Kong

My first plan said "Express reverse proxy." The contract says Kong. I use Kong.

Kong runs as a Docker container with a declarative `kong.yml`. It handles:

- Route-to-service mapping
- Rate limiting (plugin)
- JWT validation (plugin — offloads this from individual services)
- CORS (plugin)
- Request logging (plugin)
- Health checks

This is actually **better** than a custom Express gateway — Kong's plugins replace code I'd otherwise write and maintain. The tradeoff: slightly more config upfront, but the contract requires it and it's the right call anyway.

---

## 2. Architecture Decisions

### 2.1 Backend Monorepo (All 11 Services, One Repo)

**Decision**: npm workspaces monorepo. All services + shared packages in one repo.

**Why**:

- I'm one developer. 11 repos = 11 PRs, 11 CI configs, 11 dependency updates. Insanity.
- Shared Prisma schema — one migration path, not 11 divergent databases.
- Shared TypeScript types — change an enum once, every service gets it.
- One `docker-compose up` — full stack locally in one command.

**What this is NOT**: This is not a "monolith." Each service is a standalone Express app with its own Dockerfile, its own port, its own deployment. The repo structure is a development convenience. In production (EKS), each service is an independent pod.

### 2.2 Database: Single PostgreSQL, Schema-Per-Service

**Decision**: One RDS PostgreSQL instance. Logical separation via Prisma schema namespacing.

**Why not separate databases per service?**

- 11 RDS instances = 11x the cost, 11x the operational burden, for an MVP.
- Cross-service queries (e.g., "get appointment with patient name") become network calls instead of JOINs.
- Referential integrity across services (e.g., `appointment.patient_id` → `users.id`) is enforced by the DB, not by hope.

**Risk acknowledged**: This couples services at the data layer. If Ricton scales to millions of users, we split databases later. For an MVP serving hundreds to low thousands of users, one PostgreSQL instance is correct.

**Mitigation**: Each service only queries its own tables via its own Prisma client subset. No service directly touches another service's tables. If Service A needs data from Service B, it calls Service B's API. The shared DB is a deployment convenience, not an architectural free-for-all.

### 2.3 ORM: Prisma

**Decision**: Prisma for schema definition, migrations, and typed queries.

**Why Prisma over raw SQL / Knex / TypeORM?**

- Type-safe queries — `prisma.appointment.findMany({ where: { ... } })` with full autocomplete.
- Migration system — `prisma migrate dev` generates SQL, tracks state.
- Schema is readable by non-backend devs — it's the data dictionary.
- Generates TypeScript types that the shared package exports to the API client.

**Risk**: Prisma adds a generation step and doesn't support every PostgreSQL feature (e.g., partial indexes need raw SQL). Acceptable for this scope.

### 2.4 Inter-Service Communication: HTTP (Direct Calls)

**Decision**: Services call each other via internal HTTP (Docker network). No message broker.

**Why not Kafka / RabbitMQ / SQS?**

- Message brokers solve problems we don't have yet: event replay, guaranteed delivery across distributed systems, high-throughput async processing.
- For 11 services on one machine (Docker Compose) or one cluster (EKS), HTTP is simpler, debuggable, and fast enough.
- The only "event-driven" pattern we need is notifications — Redis pub/sub handles that.

**Where I'd add a queue later**: Prescription → Pharmacy notifications, payment webhook processing, email sending. These are fire-and-forget and would benefit from a queue. For MVP, they're synchronous HTTP calls with retry. If any of these become bottlenecks, I add BullMQ (Redis-backed) without touching the service interfaces.

### 2.5 Third-Party Services

| Need                 | Provider                       | Why                                                                            |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Payment              | Paystack                       | Contract says so. Nigeria-native. Handles cards, bank transfer, USSD.          |
| Video (Telemedicine) | Twilio Video                   | Already using Twilio for SMS. One vendor. Supports 1-on-1 + group rooms (MDT). |
| SMS / OTP            | Twilio                         | Reliable, well-documented, handles Nigerian numbers.                           |
| Email                | SendGrid                       | Industry standard, free tier covers MVP volume.                                |
| Push notifications   | Firebase Cloud Messaging (FCM) | Works with Expo. Free.                                                         |
| File storage         | AWS S3                         | Contract specifies it.                                                         |
| CDN                  | AWS CloudFront                 | Contract specifies it.                                                         |

### 2.6 API Documentation: OpenAPI Spec-First

**Decision**: Every endpoint has its Zod validation schemas passed into `zod-to-openapi` → auto-generates `openapi.yaml` → serves via `swagger-ui-express` in a dedicated Docs service.

**Artifacts produced**:

1. `openapi.yaml` — machine-readable API contract (generated on build)
2. Swagger UI at `/docs` (via Docs service behind Kong) — interactive browser-based API explorer
3. Postman collection (can be easily exported from OpenAPI) — for devs who prefer Postman

**Maintenance**: The spec is generated FROM the code schemas using `@asteasolutions/zod-to-openapi`. I don't maintain a separate spec file. When I change a Zod schema or route definition, `npm run generate:docs` regenerates everything. Zero drift.

### 2.7 API Client SDK Distribution (REJECTED)

**Decision**: We decided **against** publishing an `@ricton/api-client` npm package.

**Why**:

- It's unnecessary overhead. Frontend and mobile clients can easily fetch the Swagger UI, or generate their own localized types using tools like `openapi-typescript` directly from the YAML, rather than being forced to use an npm package that just wraps the API.
- Re-publishing an SDK package for every minor API tweak creates an annoying upgrade treadmill for client teams.

**Tradeoff**: Client teams have to manage their own HTTP requests. This is fine, as modern tooling makes parsing an OpenAPI spec trivial.

### 2.8 Pragmatic Testing Strategy

**Decision**: Focus strictly on **Integration Tests** (Supertest + Test DB) rather than exhaustive unit testing.

**Why**:

- **Avoids Bloat**: Writing unit tests for every middleware, utility, and controller function creates a brittle test suite that takes longer to maintain than the code itself.
- **Client Confidence**: The frontend and mobile teams only care about the HTTP boundary. Integration tests verify that an HTTP request (Input) hits the Controller, interacts with the DB, and returns the correct HTTP response (Output).
- By testing the actual routes, we guarantee the API behaves exactly as documented in the OpenAPI spec.

**Execution**: We use Jest and Supertest. For complex utilities (like the appointment slot generation engine), we will write isolated unit tests. For standard CRUD and business flows, we rely on integration tests.

---

## 3. Data Model

This is the most important section. If the schema is wrong, everything downstream is wrong.

### 3.1 Core Models

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
│─────────────────────────────────────────────────────────────│
│ id            UUID PK                                        │
│ email         VARCHAR UNIQUE (nullable — phone-only users)   │
│ phone         VARCHAR UNIQUE (nullable — email-only users)   │
│ password_hash VARCHAR                                        │
│ role          ENUM (PATIENT, CONSULTANT, PHARMACIST,         │
│                     HOSPITAL_ADMIN, SUPER_ADMIN)             │
│ status        ENUM (PENDING, ACTIVE, SUSPENDED, DEACTIVATED) │
│ email_verified BOOLEAN DEFAULT false                         │
│ phone_verified BOOLEAN DEFAULT false                         │
│ oauth_provider VARCHAR (nullable — google, apple)            │
│ oauth_id       VARCHAR (nullable)                            │
│ created_at    TIMESTAMPTZ                                    │
│ updated_at    TIMESTAMPTZ                                    │
└─────────────────────────────────────────────────────────────┘
         │
         ├──────── 1:1 ──────── PATIENT_PROFILE
         │                       ├─ user_id FK
         │                       ├─ first_name, last_name
         │                       ├─ date_of_birth
         │                       ├─ gender
         │                       ├─ blood_type
         │                       ├─ allergies JSONB
         │                       ├─ medical_history JSONB
         │                       ├─ emergency_contact JSONB
         │                       └─ avatar_url
         │
         ├──────── 1:1 ──────── PROVIDER_PROFILE
         │                       ├─ user_id FK
         │                       ├─ first_name, last_name
         │                       ├─ title (Dr., Prof., etc.)
         │                       ├─ specialty VARCHAR
         │                       ├─ license_number VARCHAR
         │                       ├─ hospital_id FK (nullable)
         │                       ├─ bio TEXT
         │                       ├─ consultation_fee DECIMAL
         │                       ├─ years_experience INT
         │                       ├─ is_verified BOOLEAN
         │                       ├─ avatar_url
         │                       └─ rating DECIMAL (computed)
         │
         └──────── 1:1 ──────── PHARMACY_PROFILE
                                 ├─ user_id FK
                                 ├─ pharmacy_name
                                 ├─ license_number
                                 ├─ address JSONB
                                 ├─ location POINT (lat/lng)
                                 ├─ operating_hours JSONB
                                 └─ is_verified BOOLEAN
```

### Self-Audit: Why Separate Profile Tables?

I could have put all fields on `users`. But:

- A PATIENT has `blood_type`, `allergies`, `medical_history` — a CONSULTANT doesn't.
- A CONSULTANT has `specialty`, `license_number`, `consultation_fee` — a PATIENT doesn't.
- A PHARMACIST has `pharmacy_name`, `location`, `operating_hours` — neither of the above has.

Cramming all of these into one table means 30+ nullable columns. Separate profile tables keep it clean and each service only queries the profiles it cares about.

### 3.2 Clinical Models

```
HOSPITALS
├─ id UUID PK
├─ name
├─ address JSONB
├─ phone
├─ email
├─ logo_url
├─ is_active BOOLEAN
└─ created_at

PROVIDER_AVAILABILITY
├─ id UUID PK
├─ provider_id FK → users
├─ day_of_week INT (0=Mon, 6=Sun)
├─ start_time TIME
├─ end_time TIME
├─ slot_duration_minutes INT (default 30)
├─ is_active BOOLEAN
└─ created_at

APPOINTMENTS
├─ id UUID PK
├─ patient_id FK → users
├─ provider_id FK → users
├─ hospital_id FK → hospitals (nullable)
├─ scheduled_at TIMESTAMPTZ
├─ duration_minutes INT
├─ type ENUM (IN_PERSON, VIDEO)
├─ status ENUM (PENDING, CONFIRMED, IN_PROGRESS,
│               COMPLETED, CANCELLED, NO_SHOW)
├─ cancellation_reason TEXT (nullable)
├─ notes TEXT (nullable — provider's notes post-consult)
├─ payment_id FK → payments (nullable)
├─ telemedicine_room_id FK → telemedicine_rooms (nullable)
├─ created_at
└─ updated_at

PRESCRIPTIONS
├─ id UUID PK
├─ appointment_id FK → appointments (nullable)
├─ patient_id FK → users
├─ provider_id FK → users
├─ pharmacy_id FK → users (nullable — patient chooses)
├─ status ENUM (DRAFT, SIGNED, SENT_TO_PHARMACY,
│               DISPENSED, CANCELLED)
├─ signed_at TIMESTAMPTZ (nullable)
├─ notes TEXT
├─ created_at
└─ updated_at

PRESCRIPTION_ITEMS
├─ id UUID PK
├─ prescription_id FK → prescriptions
├─ drug_name VARCHAR
├─ dosage VARCHAR
├─ quantity INT
├─ frequency VARCHAR (e.g., "2x daily")
├─ duration VARCHAR (e.g., "7 days")
├─ instructions TEXT
└─ created_at

TELEMEDICINE_ROOMS
├─ id UUID PK
├─ appointment_id FK → appointments (nullable — MDT rooms may not have one)
├─ provider_id FK → users (room creator)
├─ room_type ENUM (ONE_ON_ONE, MDT)
├─ external_room_id VARCHAR (Twilio room SID)
├─ external_room_url VARCHAR
├─ status ENUM (CREATED, ACTIVE, ENDED)
├─ started_at TIMESTAMPTZ (nullable)
├─ ended_at TIMESTAMPTZ (nullable)
├─ created_at
└─ updated_at

TELEMEDICINE_PARTICIPANTS
├─ id UUID PK
├─ room_id FK → telemedicine_rooms
├─ user_id FK → users
├─ role ENUM (HOST, PARTICIPANT)
├─ joined_at TIMESTAMPTZ (nullable)
├─ left_at TIMESTAMPTZ (nullable)
└─ created_at
```

### 3.3 Commerce Models

```
PHARMACY_ORDERS
├─ id UUID PK
├─ patient_id FK → users
├─ pharmacy_id FK → users
├─ prescription_id FK → prescriptions (nullable — OTC orders)
├─ status ENUM (PLACED, CONFIRMED, PREPARING,
│               READY_FOR_PICKUP, OUT_FOR_DELIVERY,
│               DELIVERED, CANCELLED)
├─ delivery_address JSONB (nullable)
├─ delivery_type ENUM (PICKUP, DELIVERY)
├─ total_amount DECIMAL
├─ payment_id FK → payments (nullable)
├─ notes TEXT
├─ created_at
└─ updated_at

ORDER_ITEMS
├─ id UUID PK
├─ order_id FK → pharmacy_orders
├─ drug_name VARCHAR
├─ quantity INT
├─ unit_price DECIMAL
├─ subtotal DECIMAL
└─ created_at

PAYMENTS
├─ id UUID PK
├─ user_id FK → users (payer)
├─ amount DECIMAL
├─ currency VARCHAR DEFAULT 'NGN'
├─ type ENUM (APPOINTMENT, PHARMACY_ORDER,
│             SUBSCRIPTION, WALLET_TOPUP)
├─ status ENUM (PENDING, SUCCESS, FAILED, REFUNDED)
├─ provider ENUM (PAYSTACK, WALLET)
├─ provider_reference VARCHAR UNIQUE (Paystack reference)
├─ provider_transaction_id VARCHAR (nullable)
├─ metadata JSONB (nullable — flexible provider-specific data)
├─ created_at
└─ updated_at

WALLETS
├─ id UUID PK
├─ user_id FK → users UNIQUE
├─ virtual_account_number VARCHAR (nullable — Paystack DVA)
├─ virtual_bank_name VARCHAR (nullable)
├─ currency VARCHAR DEFAULT 'NGN'
├─ is_active BOOLEAN
├─ created_at
└─ updated_at
(Balance is COMPUTED from wallet_transactions, never stored as a mutable column.)

WALLET_TRANSACTIONS
├─ id UUID PK
├─ wallet_id FK → wallets
├─ type ENUM (CREDIT, DEBIT)
├─ amount DECIMAL
├─ balance_after DECIMAL (snapshot for fast reads)
├─ description VARCHAR
├─ reference_type ENUM (TOPUP, PAYMENT, REFUND, PAYOUT)
├─ reference_id VARCHAR (links to payment ID or order ID)
├─ created_at
└─ (NO updated_at — ledger entries are immutable)

SUBSCRIPTIONS
├─ id UUID PK
├─ user_id FK → users
├─ plan ENUM (FREE, PREMIUM)
├─ status ENUM (ACTIVE, CANCELLED, EXPIRED)
├─ starts_at TIMESTAMPTZ
├─ expires_at TIMESTAMPTZ
├─ payment_id FK → payments (nullable)
├─ auto_renew BOOLEAN
├─ created_at
└─ updated_at
```

### 3.4 Platform Models

```
NOTIFICATIONS
├─ id UUID PK
├─ user_id FK → users
├─ type VARCHAR (e.g., 'APPOINTMENT_BOOKED', 'OTP_CODE')
├─ title VARCHAR
├─ body TEXT
├─ channel ENUM (IN_APP, SMS, EMAIL, PUSH)
├─ is_read BOOLEAN DEFAULT false
├─ metadata JSONB (nullable)
├─ created_at
└─ read_at TIMESTAMPTZ (nullable)

NOTIFICATION_PREFERENCES
├─ id UUID PK
├─ user_id FK → users UNIQUE
├─ email_enabled BOOLEAN DEFAULT true
├─ sms_enabled BOOLEAN DEFAULT true
├─ push_enabled BOOLEAN DEFAULT true
├─ quiet_hours_start TIME (nullable)
├─ quiet_hours_end TIME (nullable)
└─ updated_at

OTP_CODES
├─ (Stored in Redis, NOT PostgreSQL)
├─ Key: otp:{phone_or_email}:{purpose}
├─ Value: { code, attempts, created_at }
├─ TTL: 300 seconds (5 minutes)

REFRESH_TOKENS
├─ (Stored in Redis)
├─ Key: refresh:{token_hash}
├─ Value: { user_id, role, issued_at }
├─ TTL: 604800 seconds (7 days)

AUDIT_LOG
├─ id UUID PK
├─ actor_id FK → users
├─ action VARCHAR (e.g., 'PRESCRIPTION_SIGNED', 'USER_SUSPENDED')
├─ resource_type VARCHAR
├─ resource_id VARCHAR
├─ metadata JSONB
├─ ip_address VARCHAR
├─ created_at
└─ (NO updated_at — audit logs are append-only and immutable)

PROVIDER_EARNINGS
├─ id UUID PK
├─ provider_id FK → users
├─ appointment_id FK → appointments
├─ amount DECIMAL
├─ status ENUM (PENDING, AVAILABLE, PAID_OUT)
├─ payout_reference VARCHAR (nullable — Paystack transfer ref)
├─ created_at
└─ updated_at

REWARD_POINTS
├─ id UUID PK
├─ user_id FK → users
├─ points INT
├─ reason VARCHAR
├─ reference_type VARCHAR (e.g., 'APPOINTMENT_COMPLETED')
├─ reference_id VARCHAR
├─ created_at
```

### Self-Audit: Schema Gaps I Almost Missed

1. **PROVIDER_AVAILABILITY** — Without this, the appointment slot system doesn't work. You can't show "available at 10am, 10:30am, 11am" without knowing the provider's schedule.

2. **TELEMEDICINE_PARTICIPANTS** — Needed for MDT rooms where multiple providers join. Without it, you can't track who was in the room.

3. **WALLET balance_after on transactions** — Computing balance as `SUM(credits) - SUM(debits)` is correct for integrity, but slow for reads on a wallet with thousands of transactions. `balance_after` on each transaction gives O(1) reads. The last transaction's `balance_after` IS the current balance.

4. **OTP in Redis, not PostgreSQL** — OTPs are ephemeral (5-min TTL). Writing them to PostgreSQL means you need a cleanup job. Redis TTL handles expiry automatically.

5. **AUDIT_LOG** — Contract clause 7 (data protection) implies we need an audit trail. Every sensitive action (prescription signing, user suspension, payment) gets logged.

6. **Subscription model** — Contract mentions "premium subscription" in M6. Need a model for it.

---

## 4. Service Contracts

### Service Ownership Matrix

Each service owns specific tables. No service directly queries another service's tables.

| Service      | Owns                                                                  | Calls                                                                                  |
| ------------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Auth         | otp_codes (Redis), refresh_tokens (Redis)                             | User (create user on register)                                                         |
| User         | users, patient_profile, provider_profile, pharmacy_profile, hospitals | —                                                                                      |
| Appointment  | appointments, provider_availability                                   | User (get profiles), Payment (verify), Telemedicine (create room), Notification (send) |
| Prescription | prescriptions, prescription_items                                     | User (get profiles), Auth (verify OTP), Pharmacy (notify), Notification (send)         |
| Telemedicine | telemedicine_rooms, telemedicine_participants                         | User (get profiles), Appointment (link room)                                           |
| Pharmacy     | pharmacy_orders, order_items                                          | User (get pharmacy), Prescription (get Rx), Payment (verify), Notification (send)      |
| Payment      | payments                                                              | Wallet (debit for wallet pay), Notification (receipt)                                  |
| Wallet       | wallets, wallet_transactions                                          | Payment (Paystack DVA topup webhook)                                                   |
| Notification | notifications, notification_preferences                               | — (called BY other services)                                                           |
| Admin        | audit_log, provider_earnings, reward_points                           | User, Appointment, Payment (read-only aggregation)                                     |
| Analytics    | — (no owned tables, reads via queries)                                | All services (read-only)                                                               |

### Self-Audit: Circular Dependency Check

- Appointment → Payment → Wallet → Payment? **No.** Wallet.debit() is internal. Payment doesn't call Wallet for Paystack payments. Wallet only calls Payment service indirectly via Paystack webhook.
- Prescription → Auth (OTP verify)? **Yes, but one-directional.** Prescription calls Auth to verify OTP. Auth never calls Prescription.
- Analytics reads from everyone? **Yes, but read-only.** Analytics has read-only DB access to run aggregation queries. It never writes to other services' tables. Alternatively, it calls other services' list endpoints with admin auth.

**Verdict**: No circular dependencies. Communication flows are acyclic.

---

## 5. Timeline Feasibility (Honest Assessment)

### Effort Estimates

| Service                         | Complexity | Estimated Days | Rationale                                                                        |
| ------------------------------- | ---------- | -------------- | -------------------------------------------------------------------------------- |
| Monorepo + Docker + Prisma + CI | Foundation | 3              | Scaffolding, Docker Compose, Prisma init, GH Actions                             |
| Kong Gateway                    | Config     | 1              | Declarative YAML, Docker                                                         |
| Auth                            | High       | 4              | JWT, OTP (SMS+email), Google OAuth, Apple Sign-In, rate limiting, refresh tokens |
| User                            | Medium     | 3              | CRUD, profiles, search, avatar upload (S3), roles                                |
| Appointment                     | High       | 4              | Slot engine, conflict detection, status machine, calendar queries                |
| Payment                         | Medium     | 3              | Paystack init/verify/webhook, idempotency, payment types                         |
| Prescription                    | Medium     | 3              | Line items, OTP sign-off (different from auth OTP), status machine               |
| Telemedicine                    | Low        | 2              | Twilio Video API wrapper, room CRUD, join tokens, MDT invites                    |
| Pharmacy                        | Medium     | 3              | Order placement, status machine, pharmacy listing                                |
| Wallet                          | Medium     | 3              | Paystack DVA, ledger transactions, balance computation                           |
| Notification                    | Medium     | 2              | Multi-channel (SMS, email, push, in-app), templates, preferences                 |
| Admin                           | Low        | 2              | User management, audit log, payout triggers, dashboard stats                     |
| Analytics                       | Low        | 2              | Aggregation queries, caching                                                     |
| OpenAPI + SDK gen               | Ongoing    | 2              | Initial setup + ongoing annotation                                               |
| Testing                         | Ongoing    | 8              | Unit + integration tests, minimum 70% coverage target                            |
| Security hardening              | Late       | 3              | OWASP checklist, input sanitization audit, NDPA review                           |
| K8s + Terraform scaffolds       | Late       | 3              | EKS manifests, Terraform for RDS/Redis/S3/VPC                                    |
| **TOTAL**                       |            | **~48 days**   |                                                                                  |

### Calendar Mapping

12 weeks × 5 working days = **60 working days**. Budget is 48 days. **12 days buffer.**

That buffer is thin but real. It accounts for:

- Debugging integration issues between services
- Paystack sandbox quirks
- Twilio Video edge cases
- Schema changes discovered mid-build
- "I forgot about X" moments

### Week-by-Week Plan

| Week      | What Gets Built                                                                                                        | Exit Criteria Met                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Wk 1**  | Monorepo scaffold, Docker Compose (PG + Redis + Kong), Prisma schema (all models), Auth Service (register, login, JWT) | ✅ Wk 1: CI/CD deploying to staging, Auth API returning JWTs             |
| **Wk 2**  | Auth OTP (Twilio SMS + SendGrid email), Auth OAuth (Google + Apple), User Service (CRUD, profiles, search)             | ✅ Wk 2: OTP working, User Service running                               |
| **Wk 3**  | Kong gateway config, OpenAPI setup, Payment Service (Paystack), Wallet Service (Paystack DVA)                          | Partial Wk 4                                                             |
| **Wk 4**  | Integration testing (auth → user → payment flow), API client SDK generation, Swagger UI                                | ✅ Wk 4: Payment & Wallet service live, auth flows complete              |
| **Wk 5**  | Appointment Service (availability, slots, booking, status machine)                                                     | Partial Wk 6                                                             |
| **Wk 6**  | Appointment ↔ Payment integration, Prescription Service (CRUD, line items, OTP sign-off)                               | ✅ Wk 6: Appointments + patient management working, booking with payment |
| **Wk 7**  | Telemedicine Service (Twilio Video rooms, MDT), Pharmacy Service (orders, status)                                      | Partial Wk 8                                                             |
| **Wk 8**  | Pharmacy ↔ Payment integration, Notification Service (multi-channel), integration tests for full flows                 | ✅ Wk 8: E-prescription, telemedicine, pharmacy order complete           |
| **Wk 9**  | Admin Service, Analytics Service, Earnings/Rewards, Subscription model                                                 | Partial Wk 10                                                            |
| **Wk 10** | Feature freeze. Full integration testing. API client SDK final release.                                                | ✅ Wk 10: All features code-complete                                     |
| **Wk 11** | Security hardening (OWASP audit), K8s manifests, Terraform scaffolds, load testing                                     | ✅ Wk 11: QA complete, P0/P1 resolved                                    |
| **Wk 12** | Production deployment, monitoring (Datadog + Sentry), documentation finalization                                       | ✅ Wk 12: Live on prod, monitoring active                                |

### Self-Audit: Where This Plan Could Fail

1. **Paystack DVA (Virtual Accounts)** — Not all Paystack accounts have DVA enabled. It requires business verification. If the Company's Paystack account isn't DVA-approved, wallet top-up falls back to standard Paystack checkout (works, but no dedicated bank account per user). **Mitigation**: Ask for Paystack account status early. Build standard top-up first, DVA as enhancement.

2. **Twilio Video in Nigeria** — Latency for video calls routed through Twilio's infrastructure. Need to verify Twilio has TURN servers in or near Africa. **Mitigation**: Test early in Week 7. If latency is unacceptable, switch to Agora (has African PoPs).

3. **Apple Sign-In** — Requires Apple Developer account, Services ID, and a `.p8` key file. If the Company doesn't have an Apple Developer account, this blocks. **Mitigation**: Build Google OAuth first (works with just a client ID). Apple is the same pattern — once we have credentials, it's a 2-hour add.

4. **One developer bottleneck** — If I'm sick for a week, the schedule slips. **Mitigation**: The buffer. And clear documentation so another dev could theoretically pick up.

---

## 6. Cross-Cutting Concerns

### 6.1 Authentication & Authorization

Every request (except public routes) goes through:

```
Request → Kong (JWT plugin verifies token) → Service (RBAC middleware checks role)
```

Kong handles JWT signature verification. Services handle role/permission checks.

**RBAC Matrix:**

| Endpoint Pattern         | PATIENT | CONSULTANT | PHARMACIST | HOSPITAL_ADMIN | SUPER_ADMIN |
| ------------------------ | :-----: | :--------: | :--------: | :------------: | :---------: |
| Book appointment         |   ✅    |     ❌     |     ❌     |       ❌       |     ✅      |
| View own appointments    |   ✅    |     ✅     |     ❌     |       ✅       |     ✅      |
| Create prescription      |   ❌    |     ✅     |     ❌     |       ❌       |     ✅      |
| Sign prescription (OTP)  |   ❌    |     ✅     |     ❌     |       ❌       |     ❌      |
| Dispense prescription    |   ❌    |     ❌     |     ✅     |       ❌       |     ✅      |
| Create telemedicine room |   ❌    |     ✅     |     ❌     |       ❌       |     ✅      |
| Place pharmacy order     |   ✅    |     ❌     |     ❌     |       ❌       |     ✅      |
| Update order status      |   ❌    |     ❌     |     ✅     |       ❌       |     ✅      |
| View platform analytics  |   ❌    |     ❌     |     ❌     |       ✅       |     ✅      |
| Suspend user             |   ❌    |     ❌     |     ❌     |       ❌       |     ✅      |
| Verify provider          |   ❌    |     ❌     |     ❌     |       ✅       |     ✅      |

### 6.2 Error Handling

Every service returns errors in the same format:

```json
{
  "success": false,
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "This time slot is already booked",
    "details": { "conflicting_appointment_id": "uuid" }
  }
}
```

Standard HTTP status codes:

- `400` — Validation error (Zod)
- `401` — Not authenticated
- `403` — Not authorized (wrong role)
- `404` — Resource not found
- `409` — Conflict (duplicate, slot taken)
- `422` — Business logic error (insufficient wallet balance, expired OTP)
- `429` — Rate limited
- `500` — Internal server error (with Sentry capture)

### 6.3 Pagination

All list endpoints use cursor-based pagination:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "cursor": "eyJpZCI6Ii4uLiJ9",
    "has_more": true,
    "total": 142
  }
}
```

Why cursor-based over offset-based: offset pagination breaks when new records are inserted between pages. Cursor (keyset) pagination is stable and faster on large tables.

### 6.4 Logging & Monitoring

Every service:

- Structured JSON logging (pino)
- Request ID propagation (X-Request-Id header, set by Kong)
- Datadog APM traces (dd-trace-js)
- Sentry error capture (uncaught exceptions + explicit capture for business errors)
- Health check endpoint: `GET /health` → `{ status: "ok", uptime: ..., db: "connected" }`

### 6.5 Security Checklist (Contract Clause 7)

| Requirement          | Implementation                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TLS 1.3 in transit   | Enforced at CloudFront/ALB level, not per-service                                                                                                           |
| AES-256 at rest      | RDS encryption enabled (AWS handles this)                                                                                                                   |
| OWASP best practices | Helmet.js headers, CORS whitelist, SQL injection prevention (Prisma parameterized), XSS prevention (input sanitization), CSRF tokens for cookie-based flows |
| RBAC                 | Middleware checks `req.user.role` against route permission                                                                                                  |
| Rate limiting        | Kong rate-limiting plugin + per-route express-rate-limit                                                                                                    |
| Input validation     | Zod schemas on every request body/query/param                                                                                                               |
| No secrets in VCS    | `.env` in `.gitignore`, env vars in Docker/K8s secrets                                                                                                      |
| Audit trail          | `audit_log` table for sensitive actions                                                                                                                     |
| NDPA compliance      | Consent tracking, data minimization, right-to-deletion endpoint                                                                                             |

---

## 7. Risk Register

| #   | Risk                                               | Likelihood | Impact                           | Mitigation                                                     |
| --- | -------------------------------------------------- | ---------- | -------------------------------- | -------------------------------------------------------------- |
| 1   | Paystack DVA not approved for Company account      | Medium     | High (wallet feature blocked)    | Build standard top-up first. DVA is enhancement.               |
| 2   | Twilio Video latency in Nigeria                    | Low        | High (core feature unusable)     | Test Week 7. Fallback: Agora.                                  |
| 3   | Apple Developer credentials not available          | Medium     | Medium (one auth method blocked) | Google OAuth first. Apple same pattern, add when creds arrive. |
| 4   | Schema changes mid-build break other services      | Medium     | Medium                           | Prisma migrations are versioned. Run in staging first.         |
| 5   | Frontend/mobile devs blocked waiting for endpoints | High       | High (schedule slip)             | OpenAPI mock server from Week 2. They don't wait for me.       |
| 6   | Single developer illness/unavailability            | Low        | High                             | 12-day buffer. Clear docs.                                     |
| 7   | Kong config complexity                             | Low        | Low                              | Declarative YAML is well-documented. Fallback: Traefik.        |
| 8   | PostgreSQL single-instance becomes bottleneck      | Very Low   | Medium                           | Not an MVP concern. Connection pooling (PgBouncer) if needed.  |

---

## 8. What I'm NOT Building

Explicitly out of scope for backend:

1. **B2B React web application** — Separate repo, separate dev.
2. **B2C React Native (Expo) mobile app** — Separate repo, separate dev.
3. **Video/audio infrastructure** — Twilio handles it.
4. **Payment processing** — Paystack handles it.
5. **SMS/Email delivery infrastructure** — Twilio/SendGrid handle it.
6. **CDN** — CloudFront handles it.
7. **Database hosting** — RDS handles it.
8. **Container orchestration** — EKS handles it. I provide manifests.
9. **Drug/medication database** — Prescriptions use free-text drug names. No drug interaction checking. Out of scope unless specified.
10. **Real-time chat** — Contract mentions telemedicine (video), not text chat. Not building a chat system.
11. **AI/ML features** — No symptom checker, no recommendation engine. Not in the contract.

---

## 9. Frontend/Mobile Handoff Strategy

### What I Deliver To Them

1. **`openapi.yaml`** file in the repo
   - Machine-readable API contract (generated on build)
   - They can generate mocks: `npx @stoplight/prism-cli mock openapi.yaml`
   - They can generate their own clients in any language if they prefer

2. **Swagger UI** at `https://api.ricton.health/docs` (or `localhost:8000/docs` locally)
   - Every endpoint testable in-browser
   - Request/response examples
   - Auth flow documented (paste JWT, test protected routes)

3. **`INTEGRATION_GUIDE.md`**
   - Auth flow walkthrough (register → OTP → login → use token → refresh)
   - Webhook handling (if they need to listen to payment events)
   - File upload guide (S3 presigned URLs)
   - Error code reference

### What I Need From Them

- **CORS origins** — What domains/ports they run on locally (e.g., `localhost:3000`, `localhost:19006`)
- **Push notification tokens** — Mobile dev registers FCM token, sends it to User Service
- **OAuth client IDs** — They configure Google/Apple SDKs on their side, send me the ID token for exchange

---

## 10. Execution Checklist

This is my build order. Each item gets checked off as completed.

### Phase 1: Foundation (Week 1-2)

- [ ] Initialize npm workspaces monorepo
- [ ] Set up TypeScript config (base + per-service)
- [ ] Set up ESLint + Prettier
- [ ] Docker Compose: PostgreSQL 16, Redis 7, Kong
- [x] Prisma schema: all models from Section 3
- [x] Run initial migration
- [ ] Seed script: demo users (1 patient, 1 consultant, 1 pharmacist, 1 admin)
- [x] `packages/shared`: error classes, response wrapper, Zod base schemas, enums
- [x] `packages/auth-middleware`: JWT verification, RBAC middleware
- [x] Auth Service: POST /auth/register (email + password)
- [x] Auth Service: POST /auth/login (email + password → JWT)
- [x] Auth Service: POST /auth/otp/send (Twilio SMS + SendGrid email)
- [x] Auth Service: POST /auth/otp/verify
- [x] Auth Service: POST /auth/oauth/google (verify Google ID token)
- [x] Auth Service: POST /auth/oauth/apple (verify Apple JWT)
- [x] Auth Service: POST /auth/refresh
- [x] Auth Service: POST /auth/logout
- [x] Auth Service: POST /auth/password/forgot + /auth/password/reset
- [x] User Service: GET/PUT /users/me
- [x] User Service: PUT /users/me/avatar (S3 presigned upload)
- [x] User Service: GET /users/providers (search, filter by specialty/location)
- [x] User Service: GET /users/providers/:id
- [x] User Service: POST/GET /users/me/medical-history
- [ ] Kong gateway: route config for auth + user services
- [ ] Kong: JWT plugin, rate limiting plugin, CORS plugin
- [x] OpenAPI: zod-to-openapi setup, Swagger UI serving (Docs Service)
- [x] GitHub Actions: lint + typecheck + test on PR
- [x] Auth + User integration tests
- [~] Generate initial API client SDK (Decision changed: No npm package)

### Phase 2: Clinical + Patient MVP (Week 3-8)

- [x] Payment Service: POST /payments/initialize (Paystack)
- [x] Payment Service: GET /payments/verify/:reference
- [x] Payment Service: POST /payments/webhook (Paystack webhook)
- [x] Wallet Service: GET /wallets/me (fetch balance)
- [x] Wallet Service: POST /wallets/webhook (Paystack DVA webhook for standard transfers)
- [ ] Wallet Service: POST /wallet/pay (debit from balance)
- [ ] Wallet Service: GET /wallet/transactions
- [ ] Wallet Service: POST /wallet/virtual-account (Paystack DVA, if available)
- [ ] Appointment Service: POST /appointments/slots (provider sets availability)
- [ ] Appointment Service: GET /appointments/slots/:providerId (available slots)
- [ ] Appointment Service: POST /appointments (book)
- [ ] Appointment Service: GET /appointments (list, filter)
- [ ] Appointment Service: GET /appointments/:id
- [ ] Appointment Service: PATCH /appointments/:id/status
- [ ] Appointment Service: GET /appointments/calendar
- [ ] Appointment ↔ Payment integration (booking requires payment)
- [ ] Prescription Service: POST /prescriptions
- [ ] Prescription Service: GET /prescriptions, GET /prescriptions/:id
- [ ] Prescription Service: POST /prescriptions/:id/sign (OTP sign-off)
- [ ] Prescription Service: PATCH /prescriptions/:id/status (pharmacy marks dispensed)
- [ ] Telemedicine Service: POST /telemedicine/rooms (Twilio Video)
- [ ] Telemedicine Service: GET /telemedicine/rooms/:id
- [ ] Telemedicine Service: POST /telemedicine/rooms/:id/join (get participant token)
- [ ] Telemedicine Service: POST /telemedicine/rooms/:id/end
- [ ] Telemedicine Service: POST /telemedicine/mdt/rooms (group room)
- [ ] Telemedicine Service: POST /telemedicine/mdt/rooms/:id/invite
- [ ] Pharmacy Service: GET /pharmacies (list, location-based)
- [ ] Pharmacy Service: POST /orders (place order)
- [ ] Pharmacy Service: GET /orders, GET /orders/:id
- [ ] Pharmacy Service: PATCH /orders/:id/status
- [ ] Pharmacy ↔ Payment integration
- [ ] Notification Service: POST /notifications/send (internal)
- [ ] Notification Service: GET /notifications (user's notifications)
- [ ] Notification Service: PATCH /notifications/:id/read
- [ ] Notification Service: GET/PUT /notifications/preferences
- [ ] Wire notifications into: appointment, prescription, pharmacy, payment events
- [ ] Kong: routes for all new services
- [ ] Integration tests for full flows
- [~] Regenerate API client SDK (Decision changed: No npm package)

### Phase 3: Admin + Polish (Week 9-10)

- [ ] Admin Service: GET /admin/users (paginated)
- [ ] Admin Service: PATCH /admin/users/:id/status
- [ ] Admin Service: PATCH /admin/users/:id/verify
- [ ] Admin Service: GET /admin/dashboard (stats)
- [ ] Admin Service: POST /admin/payouts (Paystack Transfers)
- [ ] Admin Service: GET /admin/audit-log
- [ ] Provider Earnings: GET /users/me/earnings
- [ ] Reward Points: GET /users/me/rewards
- [ ] Subscription: POST /subscriptions (Paystack recurring)
- [ ] Subscription: GET /subscriptions/me
- [ ] Analytics Service: GET /analytics/overview
- [ ] Analytics Service: GET /analytics/appointments
- [ ] Analytics Service: GET /analytics/revenue
- [ ] Analytics Service: GET /analytics/users
- [ ] Feature freeze — no new endpoints after this point
- [ ] Full integration test suite passes
- [~] Final API client SDK release (Decision changed: No npm package)

### Phase 4: QA + Security + Deploy (Week 11-12)

- [ ] OWASP security audit (ZAP scan or manual checklist)
- [ ] Input sanitization audit (every Zod schema reviewed)
- [ ] Rate limiting verified on all sensitive endpoints
- [ ] SQL injection test suite
- [ ] Terraform: VPC, RDS, ElastiCache, S3, CloudFront, EKS cluster
- [ ] K8s manifests: deployment, service, ingress per service
- [ ] ArgoCD: application definitions
- [ ] Datadog: dd-trace-js in all services, custom metrics
- [ ] Sentry: error tracking in all services
- [ ] Production deployment
- [ ] Monitoring dashboards live
- [ ] Load test (k6 or artillery) — target: 100 concurrent users
- [ ] `INTEGRATION_GUIDE.md` finalized
- [ ] Postman collection exported and shared
- [ ] Handoff complete
