<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=Ricton+Health" alt="Ricton Health Logo" width="120" />
  <h1>Ricton Healthcare Platform Backend</h1>
  <p><strong>A strictly-typed microservices architecture for B2B and B2C healthcare across Nigeria.</strong></p>
  <p>
    <a href="#-integration-guide-frontend--mobile">Integration Guide</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#service-catalog">Service Catalog</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#api-reference">API Reference</a> •
    <a href="#security">Security</a> •
    <a href="#testing">Testing</a>
  </p>
</div>

---

## Integration Guide (Frontend & Mobile)

### Response Envelope

All API responses use a uniform envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 100, "limit": 20, "offset": 0, "hasMore": true }
}
```

Errors follow this shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": { "email": ["Email is required"] }
  }
}
```

### How to Test and Explore the API

1. Start the platform: `docker-compose up -d`
2. Interactive **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
3. Raw `openapi.yaml` is at the repo root for codegen tools

### Authentication Flow

```
1. Register:     POST /api/auth/register
2. Verify OTP:   POST /api/auth/otp/verify
3. Login:        POST /api/auth/login
4. Use token:    Authorization: Bearer <access_token>
5. Refresh:      POST /api/auth/refresh
6. Logout:       POST /api/auth/logout
```

- **Access tokens** expire in **15 minutes**.
- **Refresh tokens** expire in **7 days** and rotate on every use.
- Always implement silent token refresh before making protected requests.

### Base URLs

| Environment | URL                                 |
| ----------- | ----------------------------------- |
| Local       | `http://localhost:8000`             |
| Staging     | `https://api-staging.ricton.health` |
| Production  | `https://api.ricton.health`         |

### Role-Based Access

| Role             | Scope                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| `PATIENT`        | Book appointments, manage prescriptions, place pharmacy orders, wallet |
| `CONSULTANT`     | Provider dashboard, availability, prescriptions, telemedicine          |
| `PHARMACIST`     | Pharmacy product catalog, order fulfillment, prescription dispensing   |
| `HOSPITAL_ADMIN` | Hospital staff management, appointment oversight, hospital analytics   |
| `SUPER_ADMIN`    | Full platform access, user management, audit logs, system config       |

---

## Tech Stack

- **Runtime**: Node.js 20+, Express, TypeScript (strict mode)
- **Gateway**: Kong 3.6 (declarative, databaseless)
- **Database**: PostgreSQL 16 + PostGIS via Prisma ORM
- **Cache**: Redis 7
- **Infrastructure**: Docker, Docker Compose, Kubernetes (EKS)
- **Observability**: Pino (logs), Datadog (APM), Sentry (errors)
- **Queue**: BullMQ (SMS, notifications, background jobs)
- **Payments**: Paystack (card, bank transfer, wallet top-up)

---

## Architecture

### Microservices Overview

| Service                | Port | Responsibility                                                  |
| ---------------------- | ---- | --------------------------------------------------------------- |
| `auth-service`         | 3001 | Registration, OTP, OAuth, JWT issuance, password reset          |
| `user-service`         | 3002 | Profiles, avatars, medical history, provider search, dashboards |
| `appointment-service`  | 3005 | Scheduling, availability slots, appointment lifecycle           |
| `prescription-service` | 3004 | E-prescriptions, digital signing, pharmacy fulfillment          |
| `telemedicine-service` | 3013 | Video rooms, MDT sessions, WebRTC tokens                        |
| `pharmacy-service`     | 3014 | Product catalog, orders, inventory, fulfillment                 |
| `payment-service`      | 3007 | Paystack init/verify, webhooks, idempotency                     |
| `wallet-service`       | 3008 | Wallet balances, virtual accounts, transactions                 |
| `notification-service` | 3016 | Push, SMS, email notifications, preferences                     |
| `messaging-service`    | 3012 | Real-time conversations (Socket.IO)                             |
| `subscription-service` | 3009 | Premium plans, billing, webhooks                                |
| `rewards-service`      | 3011 | Loyalty points, referrals, redemptions                          |
| `address-service`      | 3015 | User addresses, geocoding, validation                           |
| `analytics-service`    | 3006 | Platform metrics, trends, provider performance                  |
| `admin-service`        | 3010 | User management, audit logs, hospital config                    |
| `docs-service`         | 3003 | Swagger UI, OpenAPI spec serving                                |

### Shared Packages

| Package                   | Purpose                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `@ricton/shared`          | Error classes, response envelope, logger, Zod schemas, rate-limit, cache, circuit-breaker, jobs |
| `@ricton/db`              | Prisma schema, migrations, generated client                                                     |
| `@ricton/auth-middleware` | JWT verification, RBAC middleware                                                               |

### Gateway Routing

All traffic flows through **Kong** at `http://localhost:8000`. Kong routes by path prefix:

```
/api/auth/*        -> auth-service:3001
/api/users/*       -> user-service:3002
/api/appointments/* -> appointment-service:3005
/api/prescriptions/* -> prescription-service:3004
/api/telemedicine/* -> telemedicine-service:3013
/api/addresses/*   -> address-service:3015
/api/analytics/*   -> analytics-service:3006
/api/pharmacy/*    -> pharmacy-service:3014
/api/payments/*    -> payment-service:3007
/api/wallet/*      -> wallet-service:3008
/api/subscriptions/* -> subscription-service:3009
/api/rewards/*     -> rewards-service:3011
/api/messages/*    -> messaging-service:3012
/api/notifications/* -> notification-service:3016
/api/admin/*       -> admin-service:3010
/docs              -> docs-service:3003
```

> **Note**: All 15 microservices are now registered in Kong and routable through the gateway at `http://localhost:8000`.

### Design System

The platform has **720 production-ready UI/UX designs** across Web and Mobile:

- **Mobile**: 272 screens covering auth, booking wizard (62 steps), home, provider search, appointments, prescriptions, telemedicine, pharmacy orders, wallet, account management, subscription, address, messaging, notifications, rewards
- **Web**: 448 screens covering patient portal, doctor/consultant portal, hospital portal, pharmacy portal, marketing/landing pages (About, Home, Pricing, Services, Resources), and component library

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- npm 10+
- PostgreSQL 16 (if running without Docker)
- Redis 7 (if running without Docker)

### 1. Clone and Install

```bash
git clone https://github.com/YourOrg/Ricton.git
cd Ricton
npm ci
```

### 2. Environment

```bash
cp .env.example .env
```

Required variables:

| Variable                | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                         |
| `REDIS_URL`             | Redis connection (default: `redis://localhost:6379`) |
| `JWT_SECRET`            | Secret for access tokens (min 32 chars)              |
| `REFRESH_SECRET`        | Secret for refresh tokens                            |
| `OTP_SECRET`            | Secret for OTP hashing (falls back to `JWT_SECRET`)  |
| `PAYSTACK_SECRET_KEY`   | Paystack API key for payments and webhooks           |
| `TWILIO_ACCOUNT_SID`    | Twilio account SID for SMS/voice                     |
| `TWILIO_API_KEY`        | Twilio API key (video/voice)                         |
| `TWILIO_API_SECRET`     | Twilio API secret (video/voice)                      |
| `AWS_ACCESS_KEY_ID`     | S3 access key for file uploads                       |
| `AWS_SECRET_ACCESS_KEY` | S3 secret key                                        |
| `AWS_S3_BUCKET_NAME`    | S3 bucket for avatars, documents                     |
| `SENTRY_DSN`            | Sentry DSN for error tracking                        |
| `DATADOG_API_KEY`       | Datadog API key for APM                              |
| `INTERNAL_API_SECRET`   | Shared secret for service-to-service webhooks        |

### 3. Database

```bash
npm run generate  # Prisma generate
npm run migrate   # Run migrations
npm run seed      # Seed initial data (optional)
```

### 4. Start Everything

```bash
# Start all services via Docker Compose
docker-compose up -d

# Or run locally for development
npm run dev
```

### 5. Verify

```bash
# Health check (via Kong gateway)
curl http://localhost:8000/health

# Swagger UI
open http://localhost:8000/docs
```

### 6. Local Service URLs (when not using Kong)

| Service      | URL                   |
| ------------ | --------------------- |
| Auth         | http://localhost:3001 |
| User         | http://localhost:3002 |
| Docs         | http://localhost:3003 |
| Appointment  | http://localhost:3005 |
| Prescription | http://localhost:3004 |
| Telemedicine | http://localhost:3013 |
| Pharmacy     | http://localhost:3014 |
| Payment      | http://localhost:3007 |
| Wallet       | http://localhost:3008 |
| Notification | http://localhost:3016 |
| Messaging    | http://localhost:3012 |
| Subscription | http://localhost:3009 |
| Rewards      | http://localhost:3011 |
| Address      | http://localhost:3015 |
| Analytics    | http://localhost:3006 |
| Admin        | http://localhost:3010 |

---

## API Reference

### Authentication

| Endpoint                        | Method | Auth   | Description                           |
| ------------------------------- | ------ | ------ | ------------------------------------- |
| `/api/auth/register`            | POST   | None   | Register new user (PATIENT role only) |
| `/api/auth/login`               | POST   | None   | Login with email/phone + password     |
| `/api/auth/otp/send`            | POST   | None   | Send OTP to email or phone            |
| `/api/auth/otp/verify`          | POST   | None   | Verify OTP code                       |
| `/api/auth/oauth/google`        | POST   | None   | Google OAuth                          |
| `/api/auth/oauth/apple`         | POST   | None   | Apple OAuth                           |
| `/api/auth/refresh`             | POST   | None   | Refresh access token                  |
| `/api/auth/logout`              | POST   | Bearer | Revoke refresh token                  |
| `/api/auth/logout-all`          | POST   | Bearer | Revoke all refresh tokens             |
| `/api/auth/sessions`            | GET    | Bearer | List active sessions                  |
| `/api/auth/sessions/:sessionId` | DELETE | Bearer | Revoke specific session               |
| `/api/auth/password/forgot`     | POST   | None   | Request password reset                |
| `/api/auth/password/reset`      | POST   | None   | Reset password with OTP               |
| `/api/auth/verify-email`        | POST   | None   | Resend email verification             |
| `/api/auth/verify-phone`        | POST   | None   | Resend phone verification             |
| `/api/auth/verify/confirm`      | POST   | None   | Confirm verification with OTP         |

### Users

| Endpoint                        | Method | Auth   | Description                              |
| ------------------------------- | ------ | ------ | ---------------------------------------- |
| `/api/users/me`                 | GET    | Bearer | Get current user profile                 |
| `/api/users/me`                 | PUT    | Bearer | Update profile                           |
| `/api/users/me/avatar`          | PUT    | Bearer | Upload avatar (returns S3 presigned URL) |
| `/api/users/me/medical-history` | PUT    | Bearer | Update medical history                   |
| `/api/users/providers`          | GET    | Bearer | Search providers                         |
| `/api/users/providers/:id`      | GET    | Bearer | Get provider by ID                       |
| `/api/users/dashboard/hospital` | GET    | Bearer | Hospital admin dashboard                 |
| `/api/users/dashboard/provider` | GET    | Bearer | Provider dashboard                       |

### Appointments

| Endpoint                              | Method | Auth                                           | Description                      |
| ------------------------------------- | ------ | ---------------------------------------------- | -------------------------------- |
| `/api/appointments/availability`      | POST   | Bearer (CONSULTANT/HOSPITAL_ADMIN/SUPER_ADMIN) | Set provider availability        |
| `/api/appointments/slots/:providerId` | GET    | Bearer                                         | Get available slots for provider |
| `/api/appointments`                   | POST   | Bearer                                         | Book appointment                 |
| `/api/appointments`                   | GET    | Bearer                                         | List my appointments             |
| `/api/appointments/:id`               | GET    | Bearer                                         | Get appointment details          |
| `/api/appointments/:id/status`        | PATCH  | Bearer                                         | Update appointment status        |
| `/api/appointments/:id/cancel`        | PATCH  | Bearer                                         | Cancel appointment               |

### Prescriptions

| Endpoint                                  | Method | Auth                | Description                      |
| ----------------------------------------- | ------ | ------------------- | -------------------------------- |
| `/api/prescriptions`                      | POST   | Bearer              | Create prescription (DRAFT)      |
| `/api/prescriptions`                      | GET    | Bearer              | List prescriptions               |
| `/api/prescriptions/:id`                  | GET    | Bearer              | Get prescription details         |
| `/api/prescriptions/:id/sign`             | POST   | Bearer              | Sign prescription with OTP       |
| `/api/prescriptions/:id/dispense`         | PATCH  | Bearer (PHARMACIST) | Mark as dispensed                |
| `/api/prescriptions/:id/send-to-pharmacy` | POST   | Bearer              | Send to pharmacy for fulfillment |

### Telemedicine

| Endpoint                                   | Method | Auth   | Description            |
| ------------------------------------------ | ------ | ------ | ---------------------- |
| `/api/telemedicine/rooms`                  | POST   | Bearer | Create video room      |
| `/api/telemedicine/rooms/:id/token`        | POST   | Bearer | Get Tokens for room    |
| `/api/telemedicine/rooms/:id/join`         | POST   | Bearer | Join video room        |
| `/api/telemedicine/rooms/:id/end`          | POST   | Bearer | End video room         |
| `/api/telemedicine/rooms/:id/participants` | GET    | Bearer | List room participants |

### Pharmacy

| Endpoint                              | Method | Auth                | Description             |
| ------------------------------------- | ------ | ------------------- | ----------------------- |
| `/api/pharmacy/products`              | GET    | Bearer              | List pharmacy products  |
| `/api/pharmacy/products/:id`          | GET    | Bearer              | Get product details     |
| `/api/pharmacy/categories`            | GET    | Bearer              | List product categories |
| `/api/pharmacy/orders`                | GET    | Bearer              | List my pharmacy orders |
| `/api/pharmacy/orders`                | POST   | Bearer              | Create pharmacy order   |
| `/api/pharmacy/orders/:id`            | GET    | Bearer              | Get order details       |
| `/api/pharmacy/orders/:id/cancel`     | PATCH  | Bearer              | Cancel order            |
| `/api/pharmacy/orders/:id/status`     | PATCH  | Bearer (PHARMACIST) | Update order status     |
| `/api/pharmacy/products`              | POST   | Bearer (PHARMACIST) | Create product          |
| `/api/pharmacy/products/:id`          | PUT    | Bearer (PHARMACIST) | Update product          |
| `/api/pharmacy/products/:id`          | DELETE | Bearer (PHARMACIST) | Delete product          |
| `/api/pharmacy/prescriptions/fulfill` | POST   | Bearer (PHARMACIST) | Fulfill prescription    |

### Payments

| Endpoint                          | Method | Auth                | Description                 |
| --------------------------------- | ------ | ------------------- | --------------------------- |
| `/api/payments/initialize`        | POST   | Bearer              | Initialize Paystack payment |
| `/api/payments/verify/:reference` | GET    | Bearer              | Verify payment status       |
| `/api/payments`                   | GET    | Bearer              | List my payments            |
| `/api/payments/:id`               | GET    | Bearer              | Get payment details         |
| `/api/payments/webhook`           | POST   | None (Paystack sig) | Paystack webhook handler    |

### Wallet

| Endpoint                       | Method | Auth                | Description              |
| ------------------------------ | ------ | ------------------- | ------------------------ |
| `/api/wallets/me`              | GET    | Bearer              | Get my wallet balance    |
| `/api/wallets/virtual-account` | POST   | Bearer              | Generate virtual account |
| `/api/wallets/topup`           | POST   | Bearer              | Top-up wallet            |
| `/api/wallets/transactions`    | GET    | Bearer              | List wallet transactions |
| `/api/wallets/webhook`         | POST   | None (Paystack sig) | Wallet webhook handler   |

### Notifications

| Endpoint                          | Method | Auth                 | Description                      |
| --------------------------------- | ------ | -------------------- | -------------------------------- |
| `/api/notifications`              | GET    | Bearer               | List notifications               |
| `/api/notifications/unread-count` | GET    | Bearer               | Get unread count                 |
| `/api/notifications/read-all`     | PATCH  | Bearer               | Mark all as read                 |
| `/api/notifications/:id`          | GET    | Bearer               | Get notification details         |
| `/api/notifications/:id/read`     | PATCH  | Bearer               | Mark as read                     |
| `/api/notifications/:id`          | DELETE | Bearer               | Delete notification              |
| `/api/notifications/preferences`  | GET    | Bearer               | Get notification preferences     |
| `/api/notifications/preferences`  | PUT    | Bearer               | Update notification preferences  |
| `/api/notifications/push-token`   | POST   | Bearer               | Register push notification token |
| `/api/notifications/test`         | POST   | Bearer (SUPER_ADMIN) | Send test notification           |

### Messaging

| Endpoint                                   | Method | Auth   | Description              |
| ------------------------------------------ | ------ | ------ | ------------------------ |
| `/api/messages/conversations`              | GET    | Bearer | List conversations       |
| `/api/messages/conversations`              | POST   | Bearer | Create conversation      |
| `/api/messages/conversations/:id`          | GET    | Bearer | Get conversation details |
| `/api/messages/conversations/:id/messages` | POST   | Bearer | Send message             |
| `/api/messages/conversations/:id/read`     | PATCH  | Bearer | Mark messages as read    |

### Subscriptions

| Endpoint                     | Method | Auth                | Description                   |
| ---------------------------- | ------ | ------------------- | ----------------------------- |
| `/api/subscriptions/plans`   | GET    | Bearer              | List subscription plans       |
| `/api/subscriptions/my`      | GET    | Bearer              | Get my subscription           |
| `/api/subscriptions/upgrade` | POST   | Bearer              | Upgrade subscription          |
| `/api/subscriptions/cancel`  | POST   | Bearer              | Cancel subscription           |
| `/api/subscriptions/history` | GET    | Bearer              | Subscription history          |
| `/api/subscriptions/webhook` | POST   | None (Paystack sig) | Paystack subscription webhook |

### Rewards

| Endpoint                   | Method | Auth   | Description             |
| -------------------------- | ------ | ------ | ----------------------- |
| `/api/rewards/balance`     | GET    | Bearer | Get rewards balance     |
| `/api/rewards/earnings`    | GET    | Bearer | List earnings history   |
| `/api/rewards/redemptions` | GET    | Bearer | List redemption history |
| `/api/rewards/redeem`      | POST   | Bearer | Redeem reward           |
| `/api/rewards/catalog`     | GET    | Bearer | Browse reward catalog   |
| `/api/rewards/tiers`       | GET    | Bearer | View loyalty tiers      |

### Addresses

| Endpoint                         | Method | Auth   | Description         |
| -------------------------------- | ------ | ------ | ------------------- |
| `/api/addresses`                 | GET    | Bearer | List addresses      |
| `/api/addresses`                 | POST   | Bearer | Create address      |
| `/api/addresses/:id`             | GET    | Bearer | Get address details |
| `/api/addresses/:id`             | PUT    | Bearer | Update address      |
| `/api/addresses/:id`             | DELETE | Bearer | Delete address      |
| `/api/addresses/validate`        | POST   | Bearer | Validate address    |
| `/api/addresses/:id/set-default` | PATCH  | Bearer | Set default address |

### Analytics

| Endpoint                      | Method | Auth                                | Description             |
| ----------------------------- | ------ | ----------------------------------- | ----------------------- |
| `/api/analytics/overview`     | GET    | Bearer (SUPER_ADMIN/HOSPITAL_ADMIN) | Platform overview stats |
| `/api/analytics/appointments` | GET    | Bearer                              | Appointment trends      |
| `/api/analytics/revenue`      | GET    | Bearer                              | Revenue analytics       |
| `/api/analytics/users`        | GET    | Bearer                              | User growth stats       |
| `/api/analytics/providers`    | GET    | Bearer                              | Provider performance    |
| `/api/analytics/pharmacies`   | GET    | Bearer                              | Pharmacy metrics        |

### Admin

| Endpoint                          | Method | Auth                 | Description              |
| --------------------------------- | ------ | -------------------- | ------------------------ |
| `/api/admin/users`                | GET    | Bearer (SUPER_ADMIN) | List users               |
| `/api/admin/users/:id`            | GET    | Bearer (SUPER_ADMIN) | Get user details         |
| `/api/admin/users/:id/status`     | PATCH  | Bearer (SUPER_ADMIN) | Update user status       |
| `/api/admin/users/:id/verify`     | POST   | Bearer (SUPER_ADMIN) | Verify user              |
| `/api/admin/providers/pending`    | GET    | Bearer (SUPER_ADMIN) | List pending providers   |
| `/api/admin/providers/:id/verify` | POST   | Bearer (SUPER_ADMIN) | Verify/reject provider   |
| `/api/admin/hospitals`            | GET    | Bearer (SUPER_ADMIN) | List hospitals           |
| `/api/admin/hospitals`            | POST   | Bearer (SUPER_ADMIN) | Create hospital          |
| `/api/admin/hospitals/:id`        | GET    | Bearer (SUPER_ADMIN) | Get hospital details     |
| `/api/admin/hospitals/:id`        | PUT    | Bearer (SUPER_ADMIN) | Update hospital          |
| `/api/admin/audit-logs`           | GET    | Bearer (SUPER_ADMIN) | List audit logs          |
| `/api/admin/analytics`            | GET    | Bearer (SUPER_ADMIN) | Admin analytics overview |

---

## Security

### Authentication & Authorization

- JWT access tokens (15m expiry) + refresh token rotation (7d expiry)
- Token versioning for revocation without logout
- OTP via email/SMS for sensitive actions (registration, password reset, prescription signing)
- Timing-safe OTP comparison (`crypto.timingSafeEqual`)
- Device fingerprinting and risk scoring on login
- Role-based access control (RBAC) via `requireRole` middleware

### Data Protection

- All secrets in environment variables (no hardcoded credentials)
- Paystack webhook signature verification (`timingSafeEqual` on HMAC-SHA512)
- Service-to-service webhooks use shared `INTERNAL_API_SECRET`
- Redis token blacklisting for logged-out sessions
- Audit logging for all sensitive admin actions

### Security Hardening (Completed)

The following critical and high-severity issues have been remediated:

| Issue                                        | Severity | Status                                                                                 |
| -------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Client-supplied `role` in OAuth/registration | CRITICAL | Fixed — OAuth and registration now assign `PATIENT` role by default                    |
| `Math.random()` for OTP generation           | CRITICAL | Fixed — replaced with `crypto.randomInt()` across all OTP flows                        |
| Hardcoded Twilio fallback secrets            | CRITICAL | Fixed — removed fallback values; Twilio credentials are now mandatory                  |
| Subscription created ACTIVE before payment   | HIGH     | Fixed — subscriptions now create as `PENDING` and activate on webhook `charge.success` |
| Wallet webhook race condition                | HIGH     | Fixed — duplicate top-up protection via unique constraint + Serializable transaction   |
| Payment verification IDOR                    | HIGH     | Fixed — `verifyPayment` now validates `payment.userId === req.user.userId`             |
| Predictable telemedicine room IDs            | MEDIUM   | Fixed — replaced `Math.random()` with `crypto.randomUUID()`                            |

### Compliance

- NDPA-ready consent capture (`consentVersion`, `consentAt`)
- Soft-delete support (`deletedAt`)
- Audit logs with risk scores
- 2FA framework (`twoFactorEnabled` field, toggle endpoint pending)

---

## Testing

### Current Coverage

| Service    | Unit Tests | E2E Tests |
| ---------- | ---------- | --------- |
| auth       | Yes        | No        |
| payment    | Yes        | No        |
| wallet     | Yes        | No        |
| user       | Yes        | No        |
| All others | No         | No        |

### Commands

```bash
# Lint
npm run lint

# Format
npm run format

# TypeScript check
npm run typecheck

# E2E tests (requires running platform)
./scripts/test-e2e.sh

# Run specific service tests
npx jest services/auth/tests/
```

---

## Contributing

1. Create a feature branch from `main`
2. Follow the existing service pattern: `routes -> controller -> Prisma`
3. Add Zod schemas to `packages/shared/src/schemas/`
4. Register OpenAPI paths in the schema file
5. Update this README if adding new endpoints

## License

Proprietary — Ricton Health Technologies
