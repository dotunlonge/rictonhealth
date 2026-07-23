# Ricton Backend - Endpoint Mapping Audit

> **Status**: ACCURATE AS OF 2026-07-20  
> **Total Services**: 16 (all have source code)  
> **Total Endpoints**: 29 documented in OpenAPI

---

## Service Implementation Status

| Service                | Source | Build | Docker | Status           |
| ---------------------- | ------ | ----- | ------ | ---------------- |
| `auth-service`         | ✅     | ✅    | ✅     | Production Ready |
| `user-service`         | ✅     | ✅    | ✅     | Production Ready |
| `appointment-service`  | ✅     | ✅    | ✅     | Production Ready |
| `prescription-service` | ✅     | ✅    | ✅     | Production Ready |
| `telemedicine-service` | ✅     | ✅    | ✅     | Production Ready |
| `address-service`      | ✅     | ✅    | ✅     | Production Ready |
| `analytics-service`    | ✅     | ✅    | ✅     | Production Ready |
| `pharmacy-service`     | ✅     | ✅    | ✅     | Production Ready |
| `payment-service`      | ✅     | ✅    | ✅     | Production Ready |
| `wallet-service`       | ✅     | ✅    | ✅     | Production Ready |
| `notification-service` | ✅     | ✅    | ✅     | Production Ready |
| `messaging-service`    | ✅     | ✅    | ✅     | Production Ready |
| `subscription-service` | ✅     | ✅    | ✅     | Production Ready |
| `rewards-service`      | ✅     | ✅    | ✅     | Production Ready |
| `admin-service`        | ✅     | ✅    | ✅     | Production Ready |
| `docs-service`         | ✅     | ✅    | ✅     | Production Ready |

---

## Complete Endpoint Inventory

### 1. Authentication Service (`auth-service:3001`)

| #   | Endpoint                    | Method | Auth   | Status | UI Screens                |
| --- | --------------------------- | ------ | ------ | ------ | ------------------------- |
| A1  | `/api/auth/register`        | POST   | None   | ✅     | Login, Create password    |
| A2  | `/api/auth/login`           | POST   | None   | ✅     | Login, Login with Google  |
| A3  | `/api/auth/otp/send`        | POST   | None   | ✅     | Email, Phone verification |
| A4  | `/api/auth/otp/verify`      | POST   | None   | ✅     | OTP verification          |
| A5  | `/api/auth/oauth/google`    | POST   | None   | ✅     | Login with Google         |
| A6  | `/api/auth/oauth/apple`     | POST   | None   | ✅     | Login with Apple          |
| A7  | `/api/auth/refresh`         | POST   | None   | ✅     | Token refresh             |
| A8  | `/api/auth/logout`          | POST   | Bearer | ✅     | Logout                    |
| A9  | `/api/auth/password/forgot` | POST   | None   | ✅     | Reset password            |
| A10 | `/api/auth/password/reset`  | POST   | None   | ✅     | Reset password            |
| A11 | `/api/auth/verify-email`    | POST   | None   | ✅     | Confirm email             |
| A12 | `/api/auth/verify-phone`    | POST   | None   | ✅     | Phone verification        |
| A13 | `/api/auth/verify/confirm`  | POST   | None   | ✅     | Verification flows        |

### 2. User Service (`user-service:3002`)

| #   | Endpoint                        | Method | Auth   | Status | UI Screens               |
| --- | ------------------------------- | ------ | ------ | ------ | ------------------------ |
| U1  | `/api/users/me`                 | GET    | Bearer | ✅     | Profile, Account         |
| U2  | `/api/users/me`                 | PUT    | Bearer | ✅     | Edit profile             |
| U3  | `/api/users/me/avatar`          | PUT    | Bearer | ✅     | Avatar upload            |
| U4  | `/api/users/me/medical-history` | PUT    | Bearer | ✅     | Medical history          |
| U5  | `/api/users/providers`          | GET    | Bearer | ✅     | Provider search          |
| U6  | `/api/users/providers/:id`      | GET    | Bearer | ✅     | Provider details         |
| U7  | `/api/users/dashboard/hospital` | GET    | Bearer | ✅     | Hospital admin dashboard |
| U8  | `/api/users/dashboard/provider` | GET    | Bearer | ✅     | Provider dashboard       |

### 3. Appointment Service (`appointment-service:3005`)

| #   | Endpoint                         | Method | Auth   | Status | UI Screens          |
| --- | -------------------------------- | ------ | ------ | ------ | ------------------- |
| AP1 | `/api/appointments/availability` | GET    | Bearer | ✅     | Booking, Calendar   |
| AP2 | `/api/appointments`              | POST   | Bearer | ✅     | Book appointment    |
| AP3 | `/api/appointments`              | GET    | Bearer | ✅     | Appointments list   |
| AP4 | `/api/appointments/:id`          | GET    | Bearer | ✅     | Appointment details |
| AP5 | `/api/appointments/:id/status`   | PATCH  | Bearer | ✅     | Status updates      |
| AP6 | `/api/appointments/:id/cancel`   | PATCH  | Bearer | ✅     | Cancel appointment  |

### 4. Prescription Service (`prescription-service:3004`)

| #   | Endpoint                      | Method | Auth   | Status | UI Screens           |
| --- | ----------------------------- | ------ | ------ | ------ | -------------------- |
| P1  | `/api/prescriptions`          | POST   | Bearer | ✅     | E-Prescription       |
| P2  | `/api/prescriptions`          | GET    | Bearer | ✅     | Prescription list    |
| P3  | `/api/prescriptions/:id`      | GET    | Bearer | ✅     | Prescription details |
| P4  | `/api/prescriptions/:id/sign` | POST   | Bearer | ✅     | Digital signing      |

### 5. Telemedicine Service (`telemedicine-service:3013`)

| #   | Endpoint                            | Method | Auth   | Status | UI Screens         |
| --- | ----------------------------------- | ------ | ------ | ------ | ------------------ |
| T1  | `/api/telemedicine/rooms`           | POST   | Bearer | ✅     | Video consultation |
| T2  | `/api/telemedicine/rooms/:id/token` | GET    | Bearer | ✅     | Get video token    |

### 6. Address Service (`address-service:3015`)

| #   | Endpoint                  | Method | Auth   | Status | UI Screens         |
| --- | ------------------------- | ------ | ------ | ------ | ------------------ |
| AD1 | `/api/addresses`          | GET    | Bearer | ✅     | Address list       |
| AD2 | `/api/addresses`          | POST   | Bearer | ✅     | Add address        |
| AD3 | `/api/addresses/:id`      | PUT    | Bearer | ✅     | Edit address       |
| AD4 | `/api/addresses/:id`      | DELETE | Bearer | ✅     | Delete address     |
| AD5 | `/api/addresses/validate` | POST   | Bearer | ✅     | Address validation |

### 7. Analytics Service (`analytics-service:3006`)

| #   | Endpoint                      | Method | Auth   | Status | UI Screens       |
| --- | ----------------------------- | ------ | ------ | ------ | ---------------- |
| AN1 | `/api/analytics/overview`     | GET    | Bearer | ✅     | Admin dashboard  |
| AN2 | `/api/analytics/appointments` | GET    | Bearer | ✅     | Analytics charts |
| AN3 | `/api/analytics/revenue`      | GET    | Bearer | ✅     | Revenue reports  |
| AN4 | `/api/analytics/users`        | GET    | Bearer | ✅     | User growth      |
| AN5 | `/api/analytics/providers`    | GET    | Bearer | ✅     | Provider metrics |
| AN6 | `/api/analytics/pharmacies`   | GET    | Bearer | ✅     | Pharmacy metrics |

### 8. Pharmacy Service (`pharmacy-service:3014`)

| #   | Endpoint                     | Method | Auth   | Status | UI Screens      |
| --- | ---------------------------- | ------ | ------ | ------ | --------------- |
| PH1 | `/api/pharmacy/products`     | GET    | Bearer | ✅     | Product catalog |
| PH2 | `/api/pharmacy/products/:id` | GET    | Bearer | ✅     | Product details |
| PH3 | `/api/pharmacy/categories`   | GET    | Bearer | ✅     | Category list   |
| PH4 | `/api/pharmacy/orders`       | POST   | Bearer | ✅     | Place order     |
| PH5 | `/api/pharmacy/orders`       | GET    | Bearer | ✅     | Order history   |
| PH6 | `/api/pharmacy/orders/:id`   | GET    | Bearer | ✅     | Order details   |

### 9. Payment Service (`payment-service:3007`)

| #   | Endpoint                   | Method | Auth   | Status | UI Screens           |
| --- | -------------------------- | ------ | ------ | ------ | -------------------- |
| PM1 | `/api/payments/initialize` | POST   | Bearer | ✅     | Checkout             |
| PM2 | `/api/payments/verify`     | GET    | Bearer | ✅     | Payment confirmation |
| PM3 | `/api/payments`            | GET    | Bearer | ✅     | Payment history      |
| PM4 | `/api/payments/:id`        | GET    | Bearer | ✅     | Payment details      |

### 10. Wallet Service (`wallet-service:3008`)

| #   | Endpoint                      | Method | Auth   | Status | UI Screens             |
| --- | ----------------------------- | ------ | ------ | ------ | ---------------------- |
| W1  | `/api/wallet`                 | GET    | Bearer | ✅     | Wallet balance         |
| W2  | `/api/wallet/virtual-account` | POST   | Bearer | ✅     | Create virtual account |
| W3  | `/api/wallet/transactions`    | GET    | Bearer | ✅     | Transaction history    |
| W4  | `/api/wallet/topup`           | POST   | Bearer | ✅     | Wallet top-up          |

### 11. Notification Service (`notification-service:3016`)

| #   | Endpoint                       | Method | Auth   | Status | UI Screens               |
| --- | ------------------------------ | ------ | ------ | ------ | ------------------------ |
| N1  | `/api/notifications`           | GET    | Bearer | ✅     | Notification list        |
| N2  | `/api/notifications/:id`       | GET    | Bearer | ✅     | Notification details     |
| N3  | `/api/notifications/mark-read` | POST   | Bearer | ✅     | Mark as read             |
| N4  | `/api/notifications/settings`  | GET    | Bearer | ✅     | Notification preferences |
| N5  | `/api/notifications/settings`  | PUT    | Bearer | ✅     | Update preferences       |

### 12. Messaging Service (`messaging-service:3012`)

| #   | Endpoint                                   | Method | Auth   | Status | UI Screens         |
| --- | ------------------------------------------ | ------ | ------ | ------ | ------------------ |
| M1  | `/api/messages/conversations`              | GET    | Bearer | ✅     | Conversations list |
| M2  | `/api/messages/conversations`              | POST   | Bearer | ✅     | New conversation   |
| M3  | `/api/messages/conversations/:id/messages` | GET    | Bearer | ✅     | Messages           |
| M4  | `/api/messages/conversations/:id/messages` | POST   | Bearer | ✅     | Send message       |
| M5  | `/api/messages/mark-read`                  | POST   | Bearer | ✅     | Mark as read       |

### 13. Subscription Service (`subscription-service:3009`)

| #   | Endpoint                    | Method | Auth   | Status | UI Screens          |
| --- | --------------------------- | ------ | ------ | ------ | ------------------- |
| S1  | `/api/subscriptions/plans`  | GET    | Bearer | ✅     | Plan list           |
| S2  | `/api/subscriptions`        | POST   | Bearer | ✅     | Subscribe           |
| S3  | `/api/subscriptions`        | GET    | Bearer | ✅     | My subscription     |
| S4  | `/api/subscriptions/cancel` | POST   | Bearer | ✅     | Cancel subscription |

### 14. Rewards Service (`rewards-service:3011`)

| #   | Endpoint               | Method | Auth   | Status | UI Screens     |
| --- | ---------------------- | ------ | ------ | ------ | -------------- |
| R1  | `/api/rewards/points`  | GET    | Bearer | ✅     | Points balance |
| R2  | `/api/rewards/history` | GET    | Bearer | ✅     | Points history |
| R3  | `/api/rewards/redeem`  | POST   | Bearer | ✅     | Redeem points  |

### 15. Admin Service (`admin-service:3010`)

| #    | Endpoint                          | Method | Auth           | Status | UI Screens            |
| ---- | --------------------------------- | ------ | -------------- | ------ | --------------------- |
| ADM1 | `/api/admin/users`                | GET    | Bearer + Admin | ✅     | User management       |
| ADM2 | `/api/admin/users/:id/status`     | PATCH  | Bearer + Admin | ✅     | Suspend/activate user |
| ADM3 | `/api/admin/providers/pending`    | GET    | Bearer + Admin | ✅     | Provider verification |
| ADM4 | `/api/admin/providers/:id/verify` | POST   | Bearer + Admin | ✅     | Approve/reject        |
| ADM5 | `/api/admin/hospitals`            | POST   | Bearer + Admin | ✅     | Create hospital       |
| ADM6 | `/api/admin/hospitals/:id`        | PUT    | Bearer + Admin | ✅     | Update hospital       |
| ADM7 | `/api/admin/audit-logs`           | GET    | Bearer + Admin | ✅     | Audit trail           |
| ADM8 | `/api/admin/analytics`            | GET    | Bearer + Admin | ✅     | Admin analytics       |

### 16. Docs Service (`docs-service:3003`)

| #   | Endpoint  | Method | Auth | Status | UI Screens   |
| --- | --------- | ------ | ---- | ------ | ------------ |
| D1  | `/docs`   | GET    | None | ✅     | Swagger UI   |
| D2  | `/health` | GET    | None | ✅     | Health check |

---

## Missing from OpenAPI (Not Yet Documented)

The following endpoints exist in source code but are not yet in `openapi.yaml`:

- `/api/payments/webhook` (POST) - Paystack webhook (no auth, signature verified)
- `/api/wallet/webhook` (POST) - Paystack DVA webhook (no auth, signature verified)
- `/api/devices/register` (POST) - Register push notification device token

---

## Port Allocation (Final)

| Service              | Port | Protocol  |
| -------------------- | ---- | --------- |
| auth-service         | 3001 | HTTP      |
| user-service         | 3002 | HTTP      |
| docs-service         | 3003 | HTTP      |
| prescription-service | 3004 | HTTP      |
| appointment-service  | 3005 | HTTP      |
| analytics-service    | 3006 | HTTP      |
| payment-service      | 3007 | HTTP      |
| wallet-service       | 3008 | HTTP      |
| subscription-service | 3009 | HTTP      |
| admin-service        | 3010 | HTTP      |
| rewards-service      | 3011 | HTTP      |
| messaging-service    | 3012 | HTTP + WS |
| telemedicine-service | 3013 | HTTP      |
| pharmacy-service     | 3014 | HTTP      |
| address-service      | 3015 | HTTP      |
| notification-service | 3016 | HTTP      |
| kong-gateway         | 8000 | HTTP      |
| kong-admin           | 8001 | HTTP      |

---

## Migration Notes

- All services now have standardized multi-stage Dockerfiles
- `db-migrate` service runs `prisma migrate deploy` automatically
- `npm run dev` now generates docs and runs migrations before starting containers
- Prisma Client regenerated to match schema (added missing fields: `deviceId`, `isRevoked`, `tokenFamily`, `lastUsedAt`)
- TypeScript build passes for all workspaces
