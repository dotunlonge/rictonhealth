# Ricton Backend — Master Execution Roadmap (Weeks 1-12)

> **Status**: ACTIVE - Week 1 Execution  
> **Date**: 2026-07-20  
> **Documents**: BACKEND_GAMEPLAN.md + BACKEND_SPEC.md + RICTON_BACKEND_BLUEPRINT.md  
> **Goal**: Production-ready backend, 2000/100, no blind spots

---

## SYNTHESIS: What the three documents actually require

### Document Roles

| Document                      | Purpose                                                  | Authority                     |
| ----------------------------- | -------------------------------------------------------- | ----------------------------- |
| `BACKEND_GAMEPLAN.md`         | Engineering plan, timeline, self-audit                   | Timeline & process            |
| `BACKEND_SPEC.md`             | UI/UX → endpoint mapping, data model gaps                | Feature requirements          |
| `RICTON_BACKEND_BLUEPRINT.md` | Schema additions, route specs, NDPA compliance, security | Canonical schema & API design |

### Reality Check

- **4 services have source**: auth, user, payment, wallet
- **7 services are empty**: appointment, prescription, telemedicine, pharmacy, notification, admin, analytics
- **23 models in Prisma** (Blueprint says 27 - 4 missing: Address, ChatThread, ChatParticipant, ChatMessage, ChatMessageReceipt, MDT, MDTParticipant, Product, RewardCatalog = actually 9 new models needed)
- **UI/UX has 200+ screens** across Web and Mobile
- **Contract**: 12 weeks, NDPA 2023, OWASP, Kong, Docker, EKS

---

## WEEK 1: Foundation Hardening (Days 1-5)

### Day 1: Critical Bug Fixes

**Goal**: Make the repo buildable and testable

| Task                      | File(s)                                 | Action                                                                                                                                                   |
| ------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------- |
| Fix build script          | `package.json:17`                       | Remove `--workspace=@ricton/appointment-service --workspace=@ricton/prescription-service --workspace=@ricton/telemedicine-service` or add `--if-present` |
| Fix test script           | `scripts/test-e2e.sh:23`                | Add `                                                                                                                                                    |     | true` to build step or skip build |
| Fix docs Dockerfile       | `services/docs/Dockerfile`              | Add `packages/` copy, add `curl` to runner                                                                                                               |
| Fix wallet Dockerfile     | `services/wallet/Dockerfile`            | Create if missing, fix EXPOSE 3008                                                                                                                       |
| Fix payment Dockerfile    | `services/payment/Dockerfile`           | Change EXPOSE 3004 → 3007                                                                                                                                |
| Add `iss` verification    | `packages/auth-middleware/src/index.ts` | Verify `decoded.iss === 'ricton-issuer'`                                                                                                                 |
| Standardize health checks | All `services/*/src/index.ts`           | Add Redis check where applicable                                                                                                                         |

### Day 2: Security Hardening

**Goal**: Close all P0 security gaps

| Task                       | File(s)                                                  | Action                                     |
| -------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| RBAC enforcement           | All route files                                          | Apply `requireRole` to every endpoint      |
| Replace raw Error          | auth/payment/wallet controllers                          | Use `AppError` for config errors           |
| Fix rate limiting          | `packages/shared/src/rate-limit.ts`                      | Use Redis instead of Map                   |
| Add retry logic            | payment/wallet controllers                               | Use `axios` + `axios-retry` for Paystack   |
| Fix payment webhook        | `services/payment/src/controllers/payment.controller.ts` | Handle `charge.failed`, `charge.abandoned` |
| Fix wallet webhook         | `services/wallet/src/controllers/wallet.controller.ts`   | Make bank configurable                     |
| Fix refresh race condition | `services/auth/src/controllers/auth.controller.ts`       | Atomic Redis operation                     |

### Day 3: Schema Additions

**Goal**: Add all missing models per Blueprint Section 2

**New Models**:

1. `Address` - user addresses with geolocation
2. `RefreshToken` - already exists in current schema ✅
3. `ChatThread`, `ChatParticipant`, `ChatMessage`, `ChatMessageReceipt` - messaging
4. `MDT` - multi-disciplinary team cases
5. `MDTParticipant` - MDT participants
6. `Product` - pharmacy inventory
7. `RewardCatalog` - loyalty program catalog

**New Fields on Existing Models**:

1. `User`: `consentVersion`, `consentAt`, `lastLoginAt`, `twoFactorEnabled`, `deletedAt`
2. `Appointment`: `reason`, `reminderSentAt`, `cancelledBy`
3. `ProviderProfile`: `onboardingStep`, `documents`, `idVerifiedAt`
4. `Hospital`: `registrationNumber`, `documents`, `onboardingComplete`, `departments`
5. `PharmacyProfile`: `documents`, `bankDetails`, `onboardingComplete`

### Day 4: Testing Foundation

**Goal**: Tests that actually run

| Task                      | Action                                 |
| ------------------------- | -------------------------------------- |
| Add Redis to test compose | `docker-compose.test.yml`              |
| Fix test-e2e.sh           | Skip build or use `--if-present`       |
| Add coverage configs      | All workspaces get `jest.config.ts`    |
| Write RBAC test           | Verify role enforcement works          |
| Write rate limit test     | Verify limits are enforced             |
| Write health check test   | Verify all services check dependencies |

### Day 5: Documentation & Validation

**Goal**: Docs match reality

| Task                          | Action                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| Update BACKEND_SPEC.md        | Mark DONE/MISSING accurately                                |
| Update IMPLEMENTATION_PLAN.md | Week 1 complete                                             |
| Generate OpenAPI              | `npm run docs:generate`                                     |
| Verify Swagger UI             | All endpoints appear                                        |
| Run full audit                | `npm run typecheck && npm run lint && npm run format:check` |

**Week 1 Deliverable**: Repo builds, tests pass, security hardened, schema complete

---

## WEEK 2: Appointment Service (Days 6-10)

### Models (New fields on existing)

- `Appointment`: Add `reason`, `reminderSentAt`, `cancelledBy`
- `ProviderAvailability`: Already exists ✅

### Endpoints

| #   | Endpoint                              | Method | Auth                      | Description                          |
| --- | ------------------------------------- | ------ | ------------------------- | ------------------------------------ |
| A1  | `/api/appointments/availability`      | POST   | CONSULTANT                | Set weekly availability              |
| A2  | `/api/appointments/slots/:providerId` | GET    | PATIENT                   | Get available slots for date         |
| A3  | `/api/appointments`                   | POST   | PATIENT                   | Book appointment                     |
| A4  | `/api/appointments`                   | GET    | AUTH                      | List appointments (filtered by role) |
| A5  | `/api/appointments/:id`               | GET    | AUTH                      | Get appointment details              |
| A6  | `/api/appointments/:id/cancel`        | PATCH  | PATIENT/CONSULTANT        | Cancel appointment                   |
| A7  | `/api/appointments/:id/reschedule`    | PATCH  | PATIENT/CONSULTANT        | Reschedule appointment               |
| A8  | `/api/appointments/:id/status`        | PATCH  | CONSULTANT/HOSPITAL_ADMIN | Update status                        |
| A9  | `/api/appointments/calendar`          | GET    | CONSULTANT                | Calendar view                        |

### Business Logic

- Slot conflict detection (SELECT FOR UPDATE)
- 24h cancellation window for refund
- Auto-create telemedicine room for VIDEO type
- Auto-create Payment record
- Send notification on status change

### Tests

- Slot generation algorithm
- Conflict detection
- Booking flow
- Cancellation/reschedule
- Status transitions

**Week 2 Deliverable**: Appointment service live, 9 endpoints, 90% coverage

---

## WEEK 3: Prescription + Telemedicine (Days 11-15)

### Prescription Service

**Models**: `Prescription`, `PrescriptionItem` (exist)

**Endpoints**:
| # | Endpoint | Method | Auth | Description |
|---|----------|--------|------|-------------|
| P1 | `/api/prescriptions` | POST | CONSULTANT | Create prescription |
| P2 | `/api/prescriptions` | GET | AUTH | List prescriptions (role-filtered) |
| P3 | `/api/prescriptions/:id` | GET | AUTH | Get prescription details |
| P4 | `/api/prescriptions/:id/sign` | POST | CONSULTANT | Sign with OTP |
| P5 | `/api/prescriptions/:id/status` | PATCH | PHARMACIST | Update status |
| P6 | `/api/prescriptions/:id/items` | POST | CONSULTANT | Add line items |
| P7 | `/api/prescriptions/:id/items` | GET | AUTH | List line items |

### Telemedicine Service

**Models**: `TelemedicineRoom`, `TelemedicineParticipant` (exist)

**Endpoints**:
| # | Endpoint | Method | Auth | Description |
|---|----------|--------|------|-------------|
| T1 | `/api/telemedicine/rooms` | POST | CONSULTANT | Create room |
| T2 | `/api/telemedicine/rooms/:id` | GET | AUTH | Get room details |
| T3 | `/api/telemedicine/rooms/:id/join` | POST | AUTH | Get Twilio access token |
| T4 | `/api/telemedicine/rooms/:id/end` | POST | CONSULTANT | End room |
| T5 | `/api/telemedicine/rooms/:id/invite` | POST | CONSULTANT | Invite to MDT |
| T6 | `/api/telemedicine/sessions/me` | GET | AUTH | User's session history |

### Tests

- Prescription CRUD + status flow
- OTP sign-off
- Telemedicine room lifecycle
- Twilio integration mocked

**Week 3 Deliverable**: Prescription + Telemedicine services live, 13 endpoints

---

## WEEK 4: Pharmacy Service (Days 16-20)

### Models

- `PharmacyOrder`, `OrderItem` (exist)
- `Product` (new)

### Endpoints

| #   | Endpoint                   | Method | Auth       | Description                 |
| --- | -------------------------- | ------ | ---------- | --------------------------- |
| PH1 | `/api/pharmacies`          | GET    | PUBLIC     | List pharmacies             |
| PH2 | `/api/pharmacies/:id`      | GET    | PUBLIC     | Pharmacy details            |
| PH3 | `/api/pharmacies/products` | GET    | PUBLIC     | Pharmacy catalog            |
| PH4 | `/api/orders`              | POST   | PATIENT    | Place order                 |
| PH5 | `/api/orders`              | GET    | AUTH       | List orders (role-filtered) |
| PH6 | `/api/orders/:id`          | GET    | AUTH       | Order details               |
| PH7 | `/api/orders/:id/status`   | PATCH  | PHARMACIST | Update status               |
| PH8 | `/api/orders/:id/items`    | POST   | PHARMACIST | Add items                   |

### Business Logic

- Order status machine: PLACED → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
- Prescription-based vs OTC orders
- Payment required before CONFIRMED
- Inventory stock check

### Tests

- Order placement flow
- Status transitions
- Payment integration
- Prescription-to-order flow

**Week 4 Deliverable**: Pharmacy service live, 8 endpoints

---

## WEEK 5: Notification Service (Days 21-25)

### Models

- `Notification`, `NotificationPreference` (exist)

### Endpoints

| #   | Endpoint                           | Method | Auth | Description          |
| --- | ---------------------------------- | ------ | ---- | -------------------- |
| N1  | `/api/notifications`               | GET    | AUTH | User's notifications |
| N2  | `/api/notifications/:id/read`      | PATCH  | AUTH | Mark as read         |
| N3  | `/api/notifications/mark-all-read` | POST   | AUTH | Bulk mark read       |
| N4  | `/api/notifications/preferences`   | GET    | AUTH | Get preferences      |
| N5  | `/api/notifications/preferences`   | PUT    | AUTH | Update preferences   |

### Internal Events

- Appointment booked → SMS + in-app
- Appointment cancelled → SMS + in-app
- Prescription signed → push + in-app
- Order status changed → SMS + push
- Payment success/failure → in-app + email
- OTP delivery (SMS/email)

### Tests

- Notification creation
- Preference updates
- Channel delivery (mocked)
- Bulk operations

**Week 5 Deliverable**: Notification service live, 5 endpoints

---

## WEEK 6: Subscription + Wallet Enhancements (Days 26-30)

### Subscription Endpoints

| #   | Endpoint                        | Method | Auth    | Description                  |
| --- | ------------------------------- | ------ | ------- | ---------------------------- |
| S1  | `/api/subscriptions`            | POST   | AUTH    | Create subscription          |
| S2  | `/api/subscriptions/me`         | GET    | AUTH    | Current subscription         |
| S3  | `/api/subscriptions/:id/cancel` | PATCH  | AUTH    | Cancel subscription          |
| S4  | `/api/subscriptions/webhook`    | POST   | WEBHOOK | Paystack subscription events |

### Wallet Enhancements

| #   | Endpoint                    | Method | Auth | Description              |
| --- | --------------------------- | ------ | ---- | ------------------------ |
| W1  | `/api/wallets/pay`          | POST   | AUTH | Debit wallet for payment |
| W2  | `/api/wallets/transactions` | GET    | AUTH | Transaction history      |
| W3  | `/api/wallets/topup`        | POST   | AUTH | Manual top-up            |

### User Enhancements

| #   | Endpoint                      | Method | Auth | Description          |
| --- | ----------------------------- | ------ | ---- | -------------------- |
| U1  | `/api/users/me/addresses`     | GET    | AUTH | List addresses       |
| U2  | `/api/users/me/addresses`     | POST   | AUTH | Create address       |
| U3  | `/api/users/me/addresses/:id` | PUT    | AUTH | Update address       |
| U4  | `/api/users/me/addresses/:id` | DELETE | AUTH | Delete address       |
| U5  | `/api/users/me/password`      | POST   | AUTH | Change password      |
| U6  | `/api/users/me/sessions`      | GET    | AUTH | List active sessions |
| U7  | `/api/users/me/sessions/:id`  | DELETE | AUTH | Revoke session       |

### Tests

- Subscription flow
- Wallet debit with atomic balance check
- Address CRUD
- Session management

**Week 6 Deliverable**: 10 new endpoints, 90% coverage

---

## WEEK 7: Admin Service (Days 31-35)

### Endpoints

| #   | Endpoint                        | Method | Auth        | Description              |
| --- | ------------------------------- | ------ | ----------- | ------------------------ |
| AD1 | `/api/admin/dashboard`          | GET    | SUPER_ADMIN | Platform stats           |
| AD2 | `/api/admin/users`              | GET    | SUPER_ADMIN | List users (paginated)   |
| AD3 | `/api/admin/users/:id/status`   | PATCH  | SUPER_ADMIN | Suspend/activate         |
| AD4 | `/api/admin/users/:id/verify`   | PATCH  | SUPER_ADMIN | Verify provider/pharmacy |
| AD5 | `/api/admin/audit-log`          | GET    | SUPER_ADMIN | Read audit logs          |
| AD6 | `/api/admin/payouts`            | POST   | SUPER_ADMIN | Trigger payout           |
| AD7 | `/api/admin/payouts`            | GET    | SUPER_ADMIN | List payouts             |
| AD8 | `/api/admin/payouts/:id/status` | PATCH  | SUPER_ADMIN | Update payout status     |

### Business Logic

- All actions logged to AuditLog
- Provider verification requires document check
- Payouts calculate pending earnings
- Dashboard aggregates platform-wide stats

### Tests

- Admin CRUD
- Role enforcement
- Audit log verification
- Payout calculations

**Week 7 Deliverable**: Admin service live, 8 endpoints

---

## WEEK 8: Analytics Service (Days 36-40)

### Endpoints

| #   | Endpoint                      | Method | Auth                       | Description          |
| --- | ----------------------------- | ------ | -------------------------- | -------------------- |
| AN1 | `/api/analytics/overview`     | GET    | SUPER_ADMIN/HOSPITAL_ADMIN | Platform overview    |
| AN2 | `/api/analytics/appointments` | GET    | SUPER_ADMIN/HOSPITAL_ADMIN | Appointment trends   |
| AN3 | `/api/analytics/revenue`      | GET    | SUPER_ADMIN/HOSPITAL_ADMIN | Revenue analytics    |
| AN4 | `/api/analytics/users`        | GET    | SUPER_ADMIN                | User growth stats    |
| AN5 | `/api/analytics/providers`    | GET    | SUPER_ADMIN/HOSPITAL_ADMIN | Provider performance |
| AN6 | `/api/analytics/pharmacies`   | GET    | SUPER_ADMIN                | Pharmacy metrics     |

### Implementation

- Read-only aggregation queries
- Redis cached (5min TTL)
- Date range filtering
- Role-based data isolation

### Tests

- Aggregation queries
- Cache invalidation
- Role-based access

**Week 8 Deliverable**: Analytics service live, 6 endpoints

---

## WEEK 9: Integration Testing + Missing Endpoints (Days 41-45)

### Integration Tests (Full Flows)

| Flow                                            | Test Coverage                        |
| ----------------------------------------------- | ------------------------------------ |
| Auth → User → Appointment → Payment             | Register → Login → Book → Pay        |
| Appointment → Prescription → Pharmacy → Payment | Book → Prescribe → Order → Pay       |
| Telemedicine                                    | Create room → Join → End             |
| Wallet                                          | Top-up → Pay → Transaction history   |
| Notification                                    | Event → Send → Read → Preferences    |
| Admin                                           | User management → Payout → Audit log |

### Missing Endpoints to Build

| Endpoint                            | Service | Description             |
| ----------------------------------- | ------- | ----------------------- |
| `POST /api/auth/logout-all`         | auth    | Logout all sessions     |
| `GET /api/users/me/earnings`        | user    | Provider earnings       |
| `GET /api/users/me/rewards`         | user    | Reward points           |
| `POST /api/users/me/rewards/redeem` | user    | Redeem reward           |
| `GET /api/rewards/catalog`          | admin   | Available rewards       |
| `POST /api/audit-log`               | admin   | Internal audit creation |
| `GET /api/audit-log`                | admin   | Read audit logs         |
| `GET /api/specialties`              | user    | Specialty taxonomy      |
| `GET /api/hospitals`                | user    | List hospitals          |

### OpenAPI Completion

- Verify all endpoints documented
- Generate final `openapi.yaml`
- Add request/response examples
- Document error codes

**Week 9 Deliverable**: 15+ integration tests, all endpoints documented

---

## WEEK 10: Feature Freeze + Comprehensive Testing (Days 46-50)

### Test Suite Expansion

- [ ] Unit tests for all utilities
- [ ] Integration tests for all CRUD
- [ ] E2E tests for critical journeys
- [ ] Security tests (RBAC, injection, XSS)
- [ ] Performance tests (k6 load test)

### Code Quality

- [ ] Full lint + typecheck + format
- [ ] Fix all warnings
- [ ] Remove dead code
- [ ] Optimize slow queries
- [ ] Add database indexes

### Documentation

- [ ] `docs/API_REFERENCE.md`
- [ ] `docs/DEPLOYMENT.md`
- [ ] `docs/TESTING.md`
- [ ] `docs/ARCHITECTURE.md`
- [ ] Update README

**Week 10 Deliverable**: 85%+ coverage, all tests passing

---

## WEEK 11: Security Hardening + Infrastructure (Days 51-55)

### Security

- [ ] OWASP Top 10 review
- [ ] Input sanitization audit
- [ ] SQL injection test suite
- [ ] XSS prevention review
- [ ] CSRF protection
- [ ] Rate limiting verification
- [ ] Secret rotation procedure
- [ ] NDPA compliance audit

### Infrastructure

- [ ] Terraform: VPC, RDS, ElastiCache, S3, CloudFront, EKS
- [ ] K8s manifests: Deployment, Service, HPA, PDB
- [ ] ArgoCD application definitions
- [ ] Docker optimization
- [ ] Security scanning (Trivy)
- [ ] Dependabot config

### Observability

- [ ] Datadog dashboards
- [ ] Sentry alert rules
- [ ] Request ID propagation
- [ ] Health check standardization

**Week 11 Deliverable**: Security audit passed, IaC complete

---

## WEEK 12: Production Deployment + Handoff (Days 56-60)

### Deployment

- [ ] Staging deployment
- [ ] Smoke tests
- [ ] Production deployment
- [ ] DB migration on production
- [ ] Seed data on production

### Monitoring

- [ ] Datadog dashboards live
- [ ] Sentry alerts configured
- [ ] Uptime monitoring
- [ ] Error rate alerting
- [ ] Performance monitoring

### Handoff

- [ ] `INTEGRATION_GUIDE.md` finalized
- [ ] Postman collection exported
- [ ] Swagger UI live
- [ ] Team training
- [ ] Runbook

### Load Testing

- [ ] k6 load test (100 concurrent users)
- [ ] Identify bottlenecks
- [ ] Optimize slow endpoints
- [ ] Document scaling plan

**Week 12 Deliverable**: Production live, monitoring active, handoff complete

---

## EXECUTION PRINCIPLES

1. **Don't fix what's not broken** - Only touch working code when necessary
2. **Love generation** - Generate code, schemas, tests, docs wherever possible
3. **Love corrections** - Fix bugs immediately, don't accumulate tech debt
4. **Surgical precision** - Make minimal changes to achieve the goal
5. **Test-first for new code** - Write tests before implementation
6. **Document as you build** - Every service gets a README
7. **Security by default** - Every endpoint gets RBAC, validation, rate limiting

---

## CURRENT CRITICAL BLOCKERS (Must Fix Before Anything Else)

1. `package.json` build script references non-existent workspaces
2. `test-e2e.sh` runs broken build step
3. `docs-service` Dockerfile missing packages copy and curl
4. `wallet-service` Dockerfile missing
5. `payment-service` Dockerfile EXPOSE 3004 (should be 3007)
6. RBAC not enforced anywhere (`requireRole` exists but unused)
7. Raw `Error` thrown for config issues in controllers
8. In-memory rate limiting (breaks with replicas)
9. No retry logic for Paystack API calls
10. Payment webhook only handles `charge.success`
11. Wallet webhook hardcoded to `wema-bank`
12. No soft delete on User (NDPA compliance)
13. Race condition in refresh token rotation
14. `services:dev` script missing wallet-service
15. 7 service directories completely empty

---

## NEXT ACTIONS

1. Fix all 15 critical blockers (estimated: 4 hours)
2. Add missing schema models (estimated: 2 hours)
3. Build Appointment service (estimated: 8 hours)
4. Write tests alongside features (estimated: ongoing)
5. Update documentation continuously

---

_This document is the single source of truth for the entire 12-week implementation. Update as phases complete._
