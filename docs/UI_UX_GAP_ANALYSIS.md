# UI/UX Gap Analysis - Mobile, Web & Backend Routing Alignment

This document details the mapping, gaps, orphan routes, useless routes, missing routes, and placeholders between the **RICTON UI_UX** designs (both B2C Mobile screens and B2B Web portals) and the active backend implementation.

---

## 1. Route Audit Summary

### A. Missing Routes (Expected by UI but missing or undocumented in OpenAPI spec)

1. **Payments / Wallet Webhooks**:
   - **Endpoints**: `POST /api/payments/webhook`, `POST /api/wallet/webhook`.
   - **Status**: Implemented in code but omitted from `openapi.yaml`.
2. **Telemedicine Room Active Participants**:
   - **Endpoint**: `GET /api/telemedicine/rooms/{id}/participants`.
   - **Status**: Now implemented in the controller and router, but missing from the published API schema mapping.
3. **Wallet Virtual Account Top-Up & Transaction History**:
   - **Endpoints**: `GET /api/wallet/transactions`, `POST /api/wallet/virtual-account`.
   - **Status**: Expected by mobile wallet screens but undocumented.

### B. Orphan Routes (Endpoints declared in routes but not used or mapped in the gateway/UI)

1. **Internal Rewards Earn Route**:
   - **Endpoint**: `POST /api/rewards/internal/earn`.
   - **Status**: Used strictly for service-to-service communication, not exposed to frontend clients.
2. **Legacy User Profile Endpoints**:
   - **Endpoint**: `GET /api/user/profiles`.
   - **Status**: Orphaned because the frontend directly calls the specific patient/provider profiles.

### C. Useless Routes / Dead Code

1. **Mock Notification Gateway**:
   - **Endpoints**: `/api/internal/notification/mock-send`.
   - **Status**: Leftover debug routes from earlier sprints that should be removed prior to production.

---

## 2. Model & Endpoint Mapping to UI/UX Designs

| UI Screen Reference                | Expected Endpoint / Schema Model                                                                                                   | Backend Implementation Status                                                  |
| :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **Mobile Wallet Screen**           | `GET /api/wallet/balance`<br>`GET /api/wallet/transactions`                                                                        | **Implemented** (Uses `Wallet` & `WalletTransaction` tables)                   |
| **Mobile Telemedicine (Page 1-3)** | `GET /api/telemedicine/rooms/{id}`<br>`GET /api/telemedicine/rooms/{id}/participants`<br>`POST /api/telemedicine/rooms/{id}/token` | **Implemented** (Uses `TelemedicineRoom` & `TelemedicineParticipant` tables)   |
| **Web Inbox / Live Panel**         | `GET /api/messaging/conversations`<br>`GET /api/messaging/conversations/{id}/messages`                                             | **Implemented** (Uses `Conversation` & `Message` tables, integrated Socket.io) |
| **Pharmacy Orders Portal**         | `POST /api/pharmacy/orders`<br>`GET /api/pharmacy/orders/{id}`                                                                     | **Implemented** (Uses `PharmacyOrder` & `OrderItem` tables)                    |

---

## 3. Placeholders & Code Stubs

- **Email & SMS Delivery**: The notification service currently uses a queue system (`smsQueue`, `emailQueue`) backed by Redis/BullMQ. It contains mock fallback structures for SendGrid and Twilio SMS. In production, these mock transports must be swapped for real API credentials.
- **Payment Webhook Validation**: The webhook validation checks rely on internal secrets. Prior to production, these must validate signatures directly using the Paystack IP whitelist and cryptographic header signatures (`x-paystack-signature`).
