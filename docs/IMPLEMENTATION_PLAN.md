# Ricton Backend — Master Implementation Plan (Weeks 1-12)

> **Date:** 2026-07-20  
> **Scope:** Complete backend implementation per UI/UX designs, BACKEND_SPEC.md, and BACKEND_GAMEPLAN.md  
> **Goal:** Production-ready, fully tested, comprehensively documented backend

---

## CURRENT STATE ASSESSMENT

### ✅ Already Done (Weeks 1-4 Complete)

- Monorepo scaffold with npm workspaces
- Prisma schema (23 models, fully defined)
- Shared packages: `@ricton/db`, `@ricton/shared`, `@ricton/auth-middleware`
- Auth service: register, login, OTP, OAuth, refresh, logout, password reset, email/phone verification
- User service: profile CRUD, avatar upload, provider search, dashboards
- Payment service: Paystack initialize/verify/webhook
- Wallet service: balance, virtual account, webhook
- Docs service: Swagger UI
- Kong gateway with JWT, rate limiting, CORS
- Docker Compose with Postgres, Redis, Kong, all 5 services
- GitHub Actions CI (lint + typecheck + tests)
- Integration tests for auth, user, payment, wallet
- OpenAPI auto-generation via zod-to-openapi

### ❌ Critical Issues Blocking Progress

1. **7 service directories empty**: appointment, prescription, telemedicine, pharmacy, notification, admin, analytics
2. **RBAC not enforced**: `requireRole` exists but never used
3. **Raw `Error` thrown** for config issues in auth/payment/wallet controllers
4. **In-memory rate limiting**: Not distributed, breaks with replicas
5. **No retry logic** for Paystack API calls
6. **Payment webhook** only handles `charge.success`, ignores failures
7. **Wallet webhook** hardcoded to `wema-bank`
8. **No soft delete** on User model (NDPA compliance)
9. **No 2FA/session management** endpoints
10. **No subscription/notification/address/audit-log read endpoints**
11. **`package.json` build script** references non-existent workspaces
12. **`docs-service` Dockerfile** missing packages copy and curl
13. **`test-e2e.sh`** runs broken build step
14. **No test coverage reporting** configured
15. **Race condition** in refresh token rotation

---

## WEEK-BY-WEEK IMPLEMENTATION PLAN

### WEEK 1: Foundation Hardening & Audit Fixes

**Goal:** Fix all critical blockers, establish testing baseline, prepare for service builds

#### Day 1-2: Critical Fixes

- [ ] Fix `package.json` build script (remove empty workspace refs)
- [ ] Fix `test-e2e.sh` build step
- [ ] Fix `docs-service` Dockerfile (copy packages, add curl)
- [ ] Replace all raw `Error` with `AppError` in controllers
- [ ] Add `iss` claim verification in JWT middleware (already done)
- [ ] Add Redis health check to user/payment/wallet services
- [ ] Standardize all health checks

#### Day 3-4: Security Hardening

- [ ] Apply `requireRole` to all existing routes
- [ ] Add `validateQuery`/`validateParams` to all routes
- [ ] Fix rate limiting to use Redis (distributed)
- [ ] Add retry logic for Paystack API calls (axios + axios-retry)
- [ ] Fix payment webhook to handle all event types
- [ ] Remove hardcoded `wema-bank` from wallet webhook
- [ ] Fix race condition in refresh token rotation

#### Day 5: Testing Foundation

- [ ] Add Jest coverage configs to all workspaces
- [ ] Add `format:check` to CI
- [ ] Verify all tests pass locally via `npm test`
- [ ] Add test for RBAC enforcement
- [ ] Add test for rate limiting

**Deliverables:**

- All critical blockers resolved
- Security hardening complete
- Test suite green with coverage reporting
- `docs/IMPLEMENTATION_PHASE_1.md`

---

### WEEK 2: Appointment Service (Clinical Core)

**Goal:** Build the complete appointment booking system

#### Models (Already in schema)

- `Appointment` - exists, needs minor field additions
- `ProviderAvailability` - exists

#### Endpoints to Build

- `POST /api/appointments/availability` - provider sets availability
- `GET /api/appointments/slots/:providerId` - get available slots
- `POST /api/appointments` - book appointment
- `GET /api/appointments` - list appointments (filter by role)
- `GET /api/appointments/:id` - get appointment details
- `PATCH /api/appointments/:id/cancel` - cancel appointment
- `PATCH /api/appointments/:id/reschedule` - reschedule appointment
- `PATCH /api/appointments/:id/status` - update status (provider/hospital)
- `GET /api/appointments/calendar` - calendar view

#### Business Rules

- Slot conflict detection (no double booking)
- Cancellation windows (24h before for refund)
- Auto-create telemedicine room for VIDEO type
- Auto-create Payment record for paid appointments
- Send notification on booking/cancellation/reschedule

#### Tests

- Unit tests for slot engine
- Integration tests for booking flow
- Conflict detection tests
- Cancellation/reschedule tests

**Deliverables:**

- `services/appointment/` fully built
- 8 endpoints live
- 90% test coverage
- `docs/IMPLEMENTATION_PHASE_2.md`

---

### WEEK 3: Prescription & Telemedicine Services

**Goal:** Build clinical workflow (prescriptions + video consultations)

#### Prescription Service

**Models:** `Prescription`, `PrescriptionItem` (exist)

**Endpoints:**

- `POST /api/prescriptions` - create prescription
- `GET /api/prescriptions` - list prescriptions
- `GET /api/prescriptions/:id` - get prescription details
- `POST /api/prescriptions/:id/sign` - sign with OTP
- `PATCH /api/prescriptions/:id/status` - update status (pharmacy)
- `POST /api/prescriptions/:id/items` - add line items
- `GET /api/prescriptions/:id/items` - list line items

**Business Rules:**

- Only CONSULTANT can create/sign
- OTP required for signing
- Status machine: DRAFT → SIGNED → SENT_TO_PHARMACY → DISPENSED/CANCELLED
- Patient can view own prescriptions
- Pharmacy can view prescriptions sent to them

#### Telemedicine Service

**Models:** `TelemedicineRoom`, `TelemedicineParticipant` (exist)

**Endpoints:**

- `POST /api/telemedicine/rooms` - create room (auto-creates for VIDEO appointments)
- `GET /api/telemedicine/rooms/:id` - get room details
- `POST /api/telemedicine/rooms/:id/join` - get Twilio access token
- `POST /api/telemedicine/rooms/:id/end` - end room
- `POST /api/telemedicine/rooms/:id/invite` - invite participant (MDT)
- `GET /api/telemedicine/sessions/me` - user's session history

**Integrations:**

- Twilio Video API for room creation
- Per-participant access tokens with TTL
- MDT support (multiple participants)

#### Tests

- Prescription CRUD + status flow tests
- OTP sign-off tests
- Telemedicine room lifecycle tests
- Twilio integration mocked tests

**Deliverables:**

- `services/prescription/` fully built
- `services/telemedicine/` fully built
- 12 endpoints total
- 90% test coverage
- `docs/IMPLEMENTATION_PHASE_3.md`

---

### WEEK 4: Pharmacy Service

**Goal:** Build pharmacy/order management system

#### Models (Already in schema)

- `PharmacyOrder`, `OrderItem` (exist)

#### Endpoints

- `GET /api/pharmacies` - list pharmacies (location-based)
- `GET /api/pharmacies/:id` - pharmacy details
- `POST /api/orders` - place order (from prescription or OTC)
- `GET /api/orders` - list orders (patient/pharmacy view)
- `GET /api/orders/:id` - order details
- `PATCH /api/orders/:id/status` - update status (pharmacy)
- `POST /api/orders/:id/items` - add items
- `GET /api/orders/:id/items` - list items

#### Business Rules

- Order status machine: PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED/CANCELLED
- Prescription-based orders link to prescription
- OTC orders don't require prescription
- Payment required before CONFIRMED status
- Notification sent on status changes

#### Tests

- Order placement flow tests
- Status transition tests
- Payment integration tests
- Prescription-to-order flow tests

**Deliverables:**

- `services/pharmacy/` fully built
- 8 endpoints live
- 90% test coverage
- `docs/IMPLEMENTATION_PHASE_4.md`

---

### WEEK 5: Notification Service

**Goal:** Build multi-channel notification system

#### Models (Already in schema)

- `Notification`, `NotificationPreference` (exist)

#### Endpoints

- `GET /api/notifications` - user's notifications
- `PATCH /api/notifications/:id/read` - mark as read
- `POST /api/notifications/mark-all-read` - bulk mark read
- `GET /api/notifications/preferences` - get preferences
- `PUT /api/notifications/preferences` - update preferences

#### Internal Integration Points

- Appointment booking → send confirmation
- Appointment cancellation → send notification
- Prescription signed → notify patient
- Order status change → notify patient/pharmacy
- Payment success/failure → notify user
- OTP delivery (SMS/email)

#### Channels

- IN_APP (stored in DB)
- SMS (Twilio)
- EMAIL (SendGrid)
- PUSH (FCM - placeholder for mobile integration)

#### Tests

- Notification creation tests
- Preference update tests
- Channel delivery mocked tests
- Bulk operations tests

**Deliverables:**

- `services/notification/` fully built
- 5 endpoints live
- 90% test coverage
- `docs/IMPLEMENTATION_PHASE_5.md`

---

### WEEK 6: Subscription & Wallet Enhancements

**Goal:** Complete payment/subscription flows and wallet functionality

#### Subscription Endpoints

- `POST /api/subscriptions` - create subscription
- `GET /api/subscriptions/me` - get current subscription
- `PATCH /api/subscriptions/:id/cancel` - cancel subscription
- `POST /api/subscriptions/webhook` - Paystack subscription webhook

#### Wallet Enhancements

- `POST /api/wallets/pay` - debit from wallet for payment
- `GET /api/wallets/transactions` - list transactions with pagination
- `POST /api/wallets/topup` - manual top-up trigger

#### Additional User Endpoints

- `GET /api/users/me/addresses` - list addresses
- `POST /api/users/me/addresses` - create address
- `PUT /api/users/me/addresses/:id` - update address
- `DELETE /api/users/me/addresses/:id` - delete address
- `POST /api/users/me/password` - change password
- `GET /api/users/me/sessions` - list active sessions
- `DELETE /api/users/me/sessions/:id` - revoke session

#### Tests

- Subscription flow tests
- Wallet debit tests
- Address CRUD tests
- Session management tests

**Deliverables:**

- Subscription model enhancements + endpoints
- Wallet transaction history endpoint
- 8 new endpoints
- 90% test coverage
- `docs/IMPLEMENTATION_PHASE_6.md`

---

### WEEK 7: Admin Service

**Goal:** Build admin dashboard and management endpoints

#### Endpoints

- `GET /api/admin/dashboard` - platform stats
- `GET /api/admin/users` - list users (paginated, filterable)
- `PATCH /api/admin/users/:id/status` - suspend/activate user
- `PATCH /api/admin/users/:id/verify` - verify provider/pharmacy
- `GET /api/admin/audit-log` - read audit logs
- `POST /api/admin/payouts` - trigger provider payout
- `GET /api/admin/payouts` - list payouts
- `PATCH /api/admin/payouts/:id/status` - update payout status

#### Business Rules

- Only SUPER_ADMIN can access
- All actions logged to AuditLog
- Provider verification requires document review (placeholder)
- Payouts calculate pending earnings for provider

#### Tests

- Admin CRUD tests
- Role enforcement tests
- Audit log verification tests
- Payout calculation tests

**Deliverables:**

- `services/admin/` fully built
- 8 endpoints live
- 90% test coverage
- `docs/IMPLEMENTATION_PHASE_7.md`

---

### WEEK 8: Analytics Service

**Goal:** Build analytics aggregation endpoints

#### Endpoints

- `GET /api/analytics/overview` - platform overview stats
- `GET /api/analytics/appointments` - appointment trends
- `GET /api/analytics/revenue` - revenue analytics
- `GET /api/analytics/users` - user growth stats
- `GET /api/analytics/providers` - provider performance
- `GET /api/analytics/pharmacies` - pharmacy metrics

#### Implementation

- Read-only aggregation queries
- Cached results (Redis, 5min TTL)
- Date range filtering
- Role-based access (HOSPITAL_ADMIN sees only their hospital)

#### Tests

- Aggregation query tests
- Cache invalidation tests
- Role-based access tests

**Deliverables:**

- `services/analytics/` fully built
- 6 endpoints live
- 85% test coverage
- `docs/IMPLEMENTATION_PHASE_8.md`

---

### WEEK 9: Integration Testing & API Completion

**Goal:** Full flow integration tests, complete all missing endpoints

#### Integration Tests

- [ ] Auth → User → Appointment → Payment flow
- [ ] Appointment → Prescription → Pharmacy → Payment flow
- [ ] Telemedicine flow (create room, join, end)
- [ ] Wallet top-up → Payment flow
- [ ] Notification flow (event → send → read)
- [ ] Admin flow (user management, payouts)

#### Missing Endpoints

- [ ] `POST /api/auth/logout-all` - logout all sessions
- [ ] `GET /api/users/me/earnings` - provider earnings
- [ ] `GET /api/users/me/rewards` - reward points
- [ ] `POST /api/users/me/rewards/redeem` - redeem reward
- [ ] `GET /api/rewards/catalog` - available rewards
- [ ] `POST /api/audit-log` - internal audit log creation
- [ ] `GET /api/audit-log` - read audit logs (user-scoped)
- [ ] `GET /api/specialties` - specialty taxonomy
- [ ] `GET /api/hospitals` - list hospitals

#### OpenAPI Completion

- [ ] Verify all endpoints documented
- [ ] Generate final `openapi.yaml`
- [ ] Add request/response examples
- [ ] Document error codes

**Deliverables:**

- 15+ integration tests passing
- All endpoints documented in OpenAPI
- `docs/IMPLEMENTATION_PHASE_9.md`

---

### WEEK 10: Feature Freeze & Comprehensive Testing

**Goal:** All features code-complete, test suite comprehensive

#### Test Suite Expansion

- [ ] Unit tests for all utilities (OTP, rate-limit, health checks)
- [ ] Integration tests for all CRUD operations
- [ ] E2E tests for critical user journeys
- [ ] Security tests (RBAC, injection, XSS)
- [ ] Performance tests (load test with k6)

#### Code Quality

- [ ] Run full lint + typecheck + format check
- [ ] Fix all warnings
- [ ] Remove dead code
- [ ] Optimize slow queries
- [ ] Add database indexes

#### Documentation

- [ ] `docs/API_REFERENCE.md` - complete API docs
- [ ] `docs/DEPLOYMENT.md` - deployment guide
- [ ] `docs/TESTING.md` - testing guide
- [ ] `docs/ARCHITECTURE.md` - architecture overview
- [ ] Update README with all services

**Deliverables:**

- Test coverage >85%
- All tests passing
- Documentation complete
- `docs/IMPLEMENTATION_PHASE_10.md`

---

### WEEK 11: Security Hardening & Infrastructure

**Goal:** Production-ready security and infrastructure

#### Security

- [ ] OWASP Top 10 review
- [ ] Input sanitization audit
- [ ] SQL injection test suite
- [ ] XSS prevention review
- [ ] CSRF protection for cookie flows
- [ ] Rate limiting verification on all endpoints
- [ ] Secret rotation procedure
- [ ] NDPA compliance audit (consent, data export, erasure)

#### Infrastructure

- [ ] Terraform: VPC, RDS, ElastiCache, S3, CloudFront, EKS
- [ ] K8s manifests: Deployment, Service, HPA, PDB per service
- [ ] ArgoCD application definitions
- [ ] Docker image optimization (multi-stage, non-root user)
- [ ] Security scanning in CI (Trivy)
- [ ] Dependabot configuration

#### Observability

- [ ] Datadog dashboards
- [ ] Sentry alert rules
- [ ] Structured logging verification
- [ ] Request ID propagation
- [ ] Health check standardization

**Deliverables:**

- Security audit passed
- Infrastructure as code complete
- `docs/IMPLEMENTATION_PHASE_11.md`

---

### WEEK 12: Production Deployment & Handoff

**Goal:** Live on production, monitoring active, handoff complete

#### Deployment

- [ ] Staging deployment
- [ ] Smoke tests on staging
- [ ] Production deployment
- [ ] Database migration run on production
- [ ] Seed data loaded on production

#### Monitoring

- [ ] Datadog dashboards live
- [ ] Sentry alerts configured
- [ ] Uptime monitoring (Pingdom/UptimeRobot)
- [ ] Error rate alerting
- [ ] Performance monitoring

#### Handoff

- [ ] `INTEGRATION_GUIDE.md` finalized
- [ ] Postman collection exported
- [ ] Swagger UI live at `/docs`
- [ ] Team training session
- [ ] Runbook for common operations

#### Load Testing

- [ ] k6 load test (100 concurrent users target)
- [ ] Identify bottlenecks
- [ ] Optimize slow endpoints
- [ ] Document scaling plan

**Deliverables:**

- Production live
- Monitoring active
- Handoff complete
- `docs/IMPLEMENTATION_PHASE_12.md`

---

## IMPLEMENTATION PHILOSOPHY

### "Love Generation, Love Corrections, Don't Fix What's Not Broken"

1. **Build exactly what the designs specify** - No more, no less
2. **Over-deliver on testing** - Every endpoint tested, every flow covered
3. **Document as you build** - README, API docs, architecture diagrams
4. **Security by default** - Every new endpoint gets RBAC, validation, rate limiting
5. **Performance by design** - Database indexes, caching, efficient queries
6. **Observability built-in** - Logging, metrics, tracing from day one

### Testing Strategy

- **Unit tests**: Complex business logic (slot engine, balance calculation)
- **Integration tests**: All HTTP endpoints (request → response)
- **E2E tests**: Critical user journeys (register → book → pay → prescribe)
- **Target**: 85%+ code coverage, 100% critical path coverage

### Documentation Strategy

- Every service has a README
- Every endpoint has OpenAPI docs
- Every complex flow has a markdown guide
- Architecture decisions documented in ADRs

---

## RISK MITIGATION

| Risk                                   | Mitigation                                         |
| -------------------------------------- | -------------------------------------------------- |
| Paystack DVA not approved              | Build standard top-up first, DVA as enhancement    |
| Twilio Video latency                   | Test early, Agora fallback ready                   |
| Apple Developer credentials missing    | Google OAuth first, Apple added later              |
| Schema changes mid-build               | Prisma migrations versioned, test in staging first |
| Frontend blocked waiting for endpoints | OpenAPI mock server from Week 2                    |
| Single developer bottleneck            | 12-day buffer, comprehensive docs                  |

---

## SUCCESS CRITERIA

- [ ] All 11 services implemented with source code
- [ ] All UI/UX screens have corresponding backend endpoints
- [ ] 85%+ test coverage
- [ ] All critical/high security issues resolved
- [ ] OpenAPI spec 100% complete and accurate
- [ ] Production deployment successful
- [ ] Monitoring and alerting active
- [ ] NDPA 2023 compliance verified
- [ ] Documentation complete and comprehensive

---

_This document is the single source of truth for implementation. Update it as phases complete._
