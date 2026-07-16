# Ricton Healthcare Platform — UI/UX Study Findings & Backend Endpoint Mapping

## 1. Executive Summary & Purpose
This document presents the definitive architectural blueprint and UI/UX study findings for the Ricton Healthcare Platform backend. As the dedicated backend engineer, I have conducted a deep audit of the platform’s product requirements, contractual clauses, existing code layouts, database schemas, and client-facing interfaces (B2C React Native Patient App and B2B React Web Consultant/Admin App) to guarantee seamless integration.

This document serves three core purposes:
1. **Design-to-API Mapping**: To bridge the gap between frontend designs and the backend by translating every visual screen, page, and user interaction into precise REST API endpoints.
2. **Setup Validation (Weeks 1-4)**: To verify and confirm that the backend services (Auth, User, Payment, Wallet), schemas, containerization configurations, and CI/CD foundations are fully complete, robust, and correctly aligned with the Month 1 contract deliverables.
3. **Future Implementation Guide**: To map out clinical, commerce, and admin endpoints (Weeks 5-12) with absolute clarity on their schema structures, business logic, and inter-service dependencies.

---

## 2. UI/UX Study Findings: Page-by-Page Analysis

Our analysis of the product's screens and pages details how each view operates, how it relates to others, and the state management/data flows required.

### 2.1 B2C Patient Mobile Application (React Native / Expo)

#### Screen 1: Splash / Welcome Screen
* **UX/UI Description**: Simple splash screen with branding, tagline, and entry buttons: "Create Account" and "Log In".
* **User Flow**: Directs cold traffic to onboarding or login.
* **Backend Needs**: Static check for platform maintenance/forced app updates.

#### Screen 2: Patient Registration Screen
* **UX/UI Description**: Inputs for First Name, Last Name, Email, Phone, and Password, alongside options for Google OAuth and Apple Sign-In.
* **User Flow**: Form validation -> POST to register. Upon successful registration, transition to OTP Screen for verification.
* **State/Interaction**: Captures JWT payload on successful OAuth or triggers the SMS/Email OTP flow.

#### Screen 3: OTP Verification Screen
* **UX/UI Description**: A 6-digit numeric code entry form with a countdown timer (5 mins) for "Resend Code".
* **User Flow**: User inputs OTP received via SMS/Email. On verification, user receives a long-lived JWT and is routed to the "Patient Profile Setup" screen.
* **Edge Case**: 3 failed attempts invalidates the OTP and deletes the code from Redis to prevent brute-forcing.

#### Screen 4: Patient Profile Setup Screen
* **UX/UI Description**: Multi-step onboarding form: Date of Birth, Gender, Blood Type, Allergies, Emergency Contacts (Name, Phone, Relationship), and optional Profile Picture upload.
* **User Flow**: Profile picture requests a presigned S3 upload URL -> image uploaded directly to S3 -> profile fields updated via `PUT /users/me`.
* **State/Interaction**: Once profile is complete, user status transitions from `PENDING` to `ACTIVE` and routes to Home Dashboard.

#### Screen 5: Patient Home Dashboard
* **UX/UI Description**: Welcome banner displaying first name, current Premium/Free subscription tier, current Wallet Balance (interactive widget), quick actions grid ("Book Doctor", "My Prescriptions", "Order Drugs"), upcoming appointments carousel (interactive cards showing Dr. name, time, type), and quick-find filters.
* **User Flow**: Displays immediate actionable info. Clicking an upcoming appointment card routes directly to the "Telemedicine Video Room" (if active) or "Appointment Details" screen. Clicking on "Book Doctor" routes to the doctor browse list.

#### Screen 6: Browse & Search Doctors (Consultant Directory)
* **UX/UI Description**: High-fidelity list of verified doctors. Features specialty search tags (e.g., General Medicine, Cardiology, Pediatrics), search bar (by doctor name), and sorting filters (Consultation Fee, Years of Experience, Rating). Cards display avatar, title (Dr., Prof.), specialty, fee (₦), and star rating.
* **User Flow**: Tapping a card opens the Doctor Detail view.
* **State/Interaction**: Live filtering and server-side search using query parameters.

#### Screen 7: Doctor Profile & Booking Calendar
* **UX/UI Description**: Detailed biography, licensing details, years of experience, and clinic location (for in-person). Includes a calendar widget showing available days and time slots (e.g., 9:00 AM, 9:30 AM).
* **User Flow**: Select date -> select slot -> click "Confirm & Pay". Transitions to Checkout Modal.
* **Business Logic**: Slots must be dynamically calculated based on provider schedule and non-conflicting booked appointments.

#### Screen 8: Checkout & Payment Portal
* **UX/UI Description**: Bottom sheet / Modal overlay summarizing booking costs. Offers options to pay via "Wallet Balance" or "Paystack (Card/Transfer)".
* **User Flow**:
  - If Wallet: checks balance -> deducts -> creates confirmed appointment.
  - If Paystack: initializes transaction -> loads Paystack checkout web view -> webhook verifies -> redirects to "Success" confirmation.

#### Screen 9: Telemedicine Room (Patient View)
* **UX/UI Description**: Full-screen video interface. Features video grid toggles, mute button, camera off button, and a persistent "End Call" button. Top right displays appointment countdown timer.
* **User Flow**: Launches automatically when joining. Tapping "End Call" closes the session and opens the feedback form.

#### Screen 10: Medical History & Prescriptions Screen
* **UX/UI Description**: Tabbed interface.
  - **Tab A (Medical History)**: Displays list of diagnosed allergies, active medications, and chronic conditions. Editable by patient.
  - **Tab B (Prescriptions)**: List of official prescriptions issued by doctors. Cards show Dr. name, Date, Status (Signed, Dispensed). Clicking a signed prescription opens details and shows an "Order Now" button or QR code.

#### Screen 11: Pharmacy Marketplace & Drug Ordering
* **UX/UI Description**: Browse drugs (OTC) or automatically upload a signed prescription. Features search bar, cart summary, and delivery address setup.
* **User Flow**: Select prescription/items -> select delivery method ("Home Delivery" or "Self Pickup" from nearby pharmacy) -> pay -> track order.

#### Screen 12: Order Tracking Screen
* **UX/UI Description**: Stepper tracking interface (`Placed` -> `Confirmed` -> `Preparing` -> `Out for Delivery` -> `Delivered`). Includes map element showing pharmacy location and delivery notes.

#### Screen 13: Wallet Screen (B2C Core Component)
* **UX/UI Description**: Big balance display (₦), Dedicated Bank Account Number (Paystack DVA) for automatic bank transfers, "Top Up" button (using Paystack checkout link), and scrollable Transaction History list.

#### Screen 14: Premium Subscription Page
* **UX/UI Description**: Call-to-action details describing Premium benefits (e.g., discounted video fees, zero delivery charges). Large button "Subscribe for ₦X/Month" (powered by Paystack recurring subscriptions).

---

### 2.2 B2B Healthcare Provider Web Portal (React.js SPA)

#### Screen 1: B2B Register / Login
* **UX/UI Description**: Login and signup with explicit role selectors (CONSULTANT, HOSPITAL_ADMIN, PHARMACIST).
* **User Flow**: Consultant inputting medical license number is marked as `PENDING` until hospital admin / super admin reviews.

#### Screen 2: Consultant Dashboard
* **UX/UI Description**: Left-side navigation bar. Main view displays stats cards (Total Appointments, Pending Prescriptions, Today's Earnings), a daily calendar schedule, and a patient queue.

#### Screen 3: Appointment Calendar Management
* **UX/UI Description**: Monthly/Weekly calendar view. Includes an "Availability Settings" modal where doctors define active operating hours (e.g., Monday 9 AM - 5 PM) and standard slot duration (30 mins).

#### Screen 4: Patient Medical File & E-Prescription Portal
* **UX/UI Description**: Split-screen dashboard during/post consultation:
  - **Left**: Patient profile, allergies, and historical consult logs.
  - **Right**: Active prescription notepad with drug name search, dosage, frequency, duration, and instructions.
* **User Flow**: Fill prescription fields -> click "Sign & Authorize".
* **Authentication Lock**: Signs e-prescriptions using a secondary OTP verification step (SMS/Email sent to provider's device) for regulatory compliance.

#### Screen 5: Telemedicine MDT Group Room (B2B Core Component)
* **UX/UI Description**: Specialized split-screen video interface allowing multiple providers (doctors, therapists, pharmacists) to co-consult on a single patient file.
* **User Flow**: Primary doctor opens room -> invites external providers via name search -> all join same Twilio video channel.

#### Screen 6: Hospital Admin Portal
* **UX/UI Description**: Dashboard for managed medical facilities. Handles onboarding/verifying doctors, editing hospital info, and monitoring clinical analytics.

#### Screen 7: Earnings & Rewards Overview
* **UX/UI Description**: Breakdown of all consultation payouts, total earned (₦), upcoming payouts, and Paystack payout details.

---

## 3. Comprehensive REST API Endpoint Mapping

The following catalog maps the entire microservices architecture to the frontend screens. This includes Weeks 1-4 (Auth, User, Payment, Wallet) as well as Weeks 5-12 (Clinical, Commerce, Notification, Admin, Analytics).

### 3.1 Auth Service (`PORT: 3001` | Router: `/api/auth`)
*Handles all identity, onboarding, MFA, password recovery, and token lifecycles.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | `{ email, phone, password, role, firstName, lastName }` | None | Registers Patient/Consultant/Pharmacist profiles. Maps to **Patient Registration Screen** and **B2B Register Screen**. |
| **POST** | `/api/auth/login` | `{ email, phone, password }` | None | Authenticates user. Returns JWT Access token (15m) and Refresh token (7d). Blacklists expired tokens. Maps to **B2C Login** and **B2B Login**. |
| **POST** | `/api/auth/otp/send` | `{ email, phone }` | None | Generates 6-digit numeric OTP, dispatches via Twilio SMS or SendGrid Email, caches in Redis with a 10m TTL. Maps to **OTP Verification Screen**. |
| **POST** | `/api/auth/otp/verify` | `{ email, phone, otp }` | None | Verifies OTP against Redis cache. Locks out after 3 failed attempts. Generates active auth tokens. Maps to **OTP Verification Screen**. |
| **POST** | `/api/auth/oauth/google` | `{ token, role }` | None | Exchanges Google OAuth Id Token for a JWT. Registers new users automatically if role is supplied. Maps to **Patient Onboarding**. |
| **POST** | `/api/auth/oauth/apple` | `{ token, role }` | None | Exchanges Apple JWT identity token. Maps to **Patient Onboarding**. |
| **POST** | `/api/auth/refresh` | `{ refreshToken }` | None | Rotates expired access tokens using the Refresh Token rotation pattern. Verifies Redis membership. |
| **POST** | `/api/auth/logout` | `{ refreshToken }` | Bearer JWT | Deletes refresh token from Redis, blacklists current access token for its remaining expiry duration. |
| **POST** | `/api/auth/password/forgot` | `{ email, phone }` | None | Triggers verification workflow for password reset. Dispatches reset OTP code. Maps to **Forgot Password**. |
| **POST** | `/api/auth/password/reset` | `{ email, phone, otp, newPassword }` | None | Sets new password if OTP is verified. Enforces password complexity. Maps to **Reset Password Screen**. |

---

### 3.2 User Service (`PORT: 3002` | Router: `/api/users`)
*Manages role-specific profiles, hospital rosters, search directories, and clinical history.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/users/me` | None | Bearer JWT | Retrieves active profile (Patient, Consultant, or Pharmacist). Maps to **Patient Home Dashboard**, **B2C Profile Setup**, and **B2B Dashboards**. |
| **PUT** | `/api/users/me` | `{ firstName, lastName, dateOfBirth, gender, bloodType, allergies, pharmacyName }` | Bearer JWT | Updates profile fields. Maps to **Patient Profile Setup** and **Account Settings**. |
| **PUT** | `/api/users/me/avatar` | `{ fileType }` | Bearer JWT | Generates secure AWS S3 presigned PUT URL for instant avatar image uploads. Maps to **Profile Setup Screen**. |
| **PUT** | `/api/users/me/medical-history` | `{ medicalHistory: JSON }` | Bearer JWT (Patient only) | Updates allergies, conditions, and historic medications. Maps to **Medical History Tab**. |
| **GET** | `/api/users/providers` | Query: `?specialty=X&name=Y&limit=20&offset=0` | Bearer JWT | List and filter active, verified consultants. Server-side search and pagination. Maps to **Browse & Search Doctors**. |
| **GET** | `/api/users/providers/:id` | None | Bearer JWT | Fetches a single doctor's complete details. Maps to **Doctor Profile Screen**. |

---

### 3.3 Payment Service (`PORT: 3003` | Router: `/api/payments`)
*Processes transaction gateways, webhooks, and secure logging.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/payments/initialize` | `{ amount, email, type }` | Bearer JWT | Initializes a transaction using Paystack's API. Returns Paystack authorization URL. Maps to **Checkout & Payment Portal**. |
| **GET** | `/api/payments/verify/:reference` | None | Bearer JWT | Verifies transaction status from Paystack. Updates local payment status in DB. Maps to **Checkout & Payment Portal**. |
| **POST** | `/api/payments/webhook` | Paystack Webhook Payload | Header Signature | Evaluates `x-paystack-signature` to securely verify events. Transitions payments from pending to success/failed. |
| **GET** | `/api/payments` | None | Bearer JWT | Lists logged-in user's payment history. Maps to **Transaction Log**. |
| **GET** | `/api/payments/:id` | None | Bearer JWT | Detailed overview of a specific transaction invoice. |

---

### 3.4 Wallet Service (`PORT: 3007` | Router: `/api/wallets`)
*Coordinates patient wallet balances, ledger entries, and automated bank deposit accounts.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/wallets/me` | None | Bearer JWT | Fetches user wallet balance (computed dynamically via ledger sum) and latest transactions. Maps to **Wallet Screen**. |
| **POST** | `/api/wallets/virtual-account` | None | Bearer JWT | Automatically provisions a dedicated virtual account (DVA) on Paystack (e.g. Wema Bank). Maps to **Wallet Screen**. |
| **POST** | `/api/wallets/webhook` | Paystack DVA Webhook Payload | Header Signature | Processes bank deposits sent to virtual accounts. Inserts immutable CREDIT records to the ledger. Maps to **Wallet Screen**. |
| **POST** | `/api/wallets/pay` | `{ amount, referenceId, description }` | Bearer JWT | Deducts funds for booking or ordering. Verifies balance before debiting. Maps to **Checkout & Payment Portal**. |
| **GET** | `/api/wallets/transactions` | Query: `?limit=20&cursor=X` | Bearer JWT | Cursor-paginated ledger ledger history. Maps to **Wallet Transactions List**. |

---

### 3.5 Appointment Service (Weeks 5-8)
*Handles slot configurations, calendar checks, and booking flows.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/appointments/slots` | `{ availability: [{ dayOfWeek, startTime, endTime, duration }] }` | Bearer JWT (Consultant) | Configures consultant's active calendar availability. Maps to **B2B Availability Settings**. |
| **GET** | `/api/appointments/slots/:providerId` | Query: `?date=YYYY-MM-DD` | Bearer JWT | Generates available slots for a specific date, accounting for booked appointments. Maps to **B2C Doctor Profile Screen**. |
| **POST** | `/api/appointments` | `{ providerId, scheduledAt, durationMinutes, type, paymentProvider }` | Bearer JWT | Initializes booking. Double-checks slot availability to prevent double-booking. Handles payment. Maps to **Checkout Screen**. |
| **GET** | `/api/appointments` | Query: `?status=CONFIRMED&limit=10` | Bearer JWT | Lists paginated appointments. Maps to **Patient Home Dashboard** and **Consultant Dashboard**. |
| **GET** | `/api/appointments/:id` | None | Bearer JWT | Details of a single booking, including link to join video or diagnostic notes. |
| **PATCH** | `/api/appointments/:id/status` | `{ status, cancellationReason }` | Bearer JWT | Updates appointment state machine (e.g. Completed, Cancelled). Maps to **Consultant Queue** and **Patient Booking**. |

---

### 3.6 Prescription Service (Weeks 5-8)
*Manages clinical prescription life-cycles and authorized digital signatures.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/prescriptions` | `{ appointmentId, patientId, items: [{ drugName, dosage, quantity, frequency, duration, instructions }], notes }` | Bearer JWT (Consultant) | Drafts a new medical prescription. Maps to **B2B E-Prescription Portal**. |
| **GET** | `/api/prescriptions` | Query: `?patientId=X&status=SIGNED` | Bearer JWT | Returns list of prescriptions. Maps to **My Prescriptions Tab**. |
| **GET** | `/api/prescriptions/:id` | None | Bearer JWT | Fetches detailed drug breakdown. Maps to **Prescription Detail Screen**. |
| **POST** | `/api/prescriptions/:id/sign` | `{ otp }` | Bearer JWT (Consultant) | Electronically signs e-prescription using a secondary OTP signature check for compliance. Maps to **E-Prescription Portal**. |
| **PATCH** | `/api/prescriptions/:id/status` | `{ status, pharmacyId }` | Bearer JWT (Pharmacist) | Transitions status to `SENT_TO_PHARMACY` or `DISPENSED`. Maps to **Pharmacy App**. |

---

### 3.7 Telemedicine Service (Weeks 5-8)
*Powers live consultations via Twilio Video integrations.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/telemedicine/rooms` | `{ appointmentId, roomType }` | Bearer JWT (Consultant) | Creates a Twilio Video room SID in the cloud. Links it to the appointment record. Maps to **Consultant Dashboard**. |
| **POST** | `/api/telemedicine/rooms/:id/join` | None | Bearer JWT | Generates short-lived Twilio Access Token for patient/doctor to join the call. Maps to **Telemedicine Screen**. |
| **POST** | `/api/telemedicine/rooms/:id/end` | None | Bearer JWT | Ends video session, revokes access tokens, logs duration, and triggers post-consultation feedback. |
| **POST** | `/api/telemedicine/mdt/invite` | `{ roomId, providerId }` | Bearer JWT (Consultant) | Invites other doctors to join a Multi-Disciplinary Team room. Maps to **MDT Group Room**. |

---

### 3.8 Pharmacy Service (Weeks 5-8)
*Handles order listing, purchasing, and order status tracking.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/pharmacy/list` | Query: `?lat=X&lng=Y&range=10` | Bearer JWT | Returns nearby pharmacies. Maps to **Pharmacy Marketplace Screen**. |
| **POST** | `/api/pharmacy/orders` | `{ pharmacyId, prescriptionId, deliveryType, deliveryAddress, items: [{ drugName, quantity, unitPrice }] }` | Bearer JWT | Submits a new pharmacy purchase order. Auto-locks to the prescription. Maps to **Pharmacy Marketplace Screen**. |
| **GET** | `/api/pharmacy/orders` | Query: `?limit=10&cursor=X` | Bearer JWT | Retrieves order history. Maps to **Order Tracking Screen**. |
| **GET** | `/api/pharmacy/orders/:id` | None | Bearer JWT | Fetches detailed invoice and real-time status of the delivery. Maps to **Order Tracking Screen**. |
| **PATCH** | `/api/pharmacy/orders/:id/status` | `{ status }` | Bearer JWT (Pharmacist) | Updates order status (e.g., Preparing, Shipped, Delivered). Maps to **Pharmacy Portal**. |

---

### 3.9 Notification Service (Weeks 5-8)
*Coordinates real-time webhooks, push alerts, SMS notifications, and emails.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/notifications` | Query: `?limit=20` | Bearer JWT | Fetch in-app notifications. Maps to **Notification Center Bell**. |
| **PATCH** | `/api/notifications/:id/read` | None | Bearer JWT | Marks an alert as read. Maps to **Notification Center**. |
| **PUT** | `/api/notifications/preferences` | `{ emailEnabled, smsEnabled, pushEnabled, quietHoursStart, quietHoursEnd }` | Bearer JWT | Configures communication preferences. Maps to **Settings Screen**. |
| **POST** | `/api/notifications/register-token` | `{ pushToken, platform: 'IOS'│'ANDROID' }` | Bearer JWT | Registers FCM push token for the active user session. |

---

### 3.10 Admin & Analytics Services (Weeks 9-10)
*Aggregates business metrics and compliance logging.*

| Method | Endpoint | Required Payload | Headers / Auth | Description & UI/UX Page Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/admin/users` | Query: `?role=CONSULTANT&status=PENDING&limit=20` | Bearer JWT (Admin) | Lists users for onboarding verification. Maps to **Hospital Admin Portal**. |
| **PATCH** | `/api/admin/users/:id/verify` | `{ isVerified: boolean }` | Bearer JWT (Admin) | Verifies a medical consultant. Maps to **Hospital Admin Portal**. |
| **GET** | `/api/admin/audit-log` | Query: `?actorId=X&limit=50` | Bearer JWT (Admin) | Appends system audit records for NDPA compliance tracking. |
| **GET** | `/api/admin/analytics/overview` | Query: `?startDate=X&endDate=Y` | Bearer JWT (Admin) | Aggregates user metrics, bookings, and revenue. Maps to **Hospital Admin Portal**. |

---

## 4. Weeks 1-4 Setup Verification: Backend Audit

This section validates that Month 1 setup requirements are met.

### 4.1 Monorepo & Scaffold Foundation
The repository is set up as an **NPM Workspaces Monorepo**. This workspace strategy allows our single backend developer to build, scale, and compile 11 individual services within a single codebase while preserving hard boundary containerizations.
* **Shared Workspace Packages**:
  - `@ricton/db`: Owns the master Prisma schema, versioned PostgreSQL migrations, and exports the generated typescript database client.
  - `@ricton/shared`: Centralizes standard error classes, Zod validator middleware, and unified logger (pino).
  - `@ricton/auth-middleware`: Role-Based Access Control (RBAC) middleware verifying and validating decoded JWT claims.
* **Service Scaffolds**: Dedicated microservices `auth-service`, `user-service`, `payment-service`, `wallet-service`, and `docs-service` are fully bootstrapped with individual `package.json`, `tsconfig.json`, and source directories.

### 4.2 Database Layer & Schema Alignment
The PostgreSQL database (using schema namespacing) is mapped out in `packages/db/prisma/schema.prisma`. It is built to support Week 1-4 endpoints and future clinical milestones:
* **Weeks 1-4 Core Models**:
  - `User`: Models email/phone credentials, roles, and status.
  - `PatientProfile`: Maps metadata (gender, blood type, allergies) cleanly to separate schemas to prevent bloated columns.
  - `ProviderProfile`: Stores consultant specialties, fees, and verification.
  - `PharmacyProfile`: Houses pharmacies, licensing, and geographic locations.
  - `Payment`: Logs status (`PENDING`, `SUCCESS`, `FAILED`), references, and providers.
  - `Wallet`: Tracks virtual bank account parameters.
  - `WalletTransaction`: Ledger entries featuring a fast-read `balanceAfter` snapshot.
* **Database Migrations**: Initial migration files are successfully registered in the codebase under `packages/db/prisma/migrations/`.

### 4.3 Containerization, DevOps, & CI/CD
* **Docker Configurations**: Each microservice directory contains a multi-stage `Dockerfile` optimizing output size.
* **Kong API Gateway**: Declarative databaseless mode is set up via `gateway/kong.yml` mapping traffic routing on port `8000`:
  - `/api/auth` maps to the Auth Service (`port 3001`).
  - `/api/users` maps to the User Service (`port 3002`).
  - `/api/payments` maps to the Payment Service (`port 3003`).
  - `/api/wallets` maps to the Wallet Service (`port 3007`).
* **CI/CD Workflows**:
  - `.github/workflows/ci.yml`: Performs automated linting, type-checking, and test runs on every pull request.
  - `.github/workflows/cd-eks.yml`: Deploys Docker containers to Amazon EKS cluster using Helm charts.

### 4.4 Automated Testing Stability
The backend has integration tests for the Week 1-4 microservices:
* **Auth tests** (`services/auth/tests/auth.test.ts`): Verify user sign-ups, login JWT issuance, SMS/Email OTP code caching, and Apple/Google OAuth verification.
* **User tests** (`services/user/tests/user.test.ts`): Validate profile updates, search lookups, and S3 upload URL generation.
* **Payment tests** (`services/payment/tests/payment.test.ts`): Verify Paystack initialize and webhook flows.
* **Wallet tests** (`services/wallet/tests/wallet.test.ts`): Check ledger calculations, Virtual Bank Account creation, and automatic transfer processing.

---

## 5. Technical Implementation Recommendations

To ensure absolute system stability, we recommend addressing the following edge cases:

1. **Dedicated Virtual Accounts (DVA) Sandbox Restrictions**: Paystack's Dedicated Virtual Accounts require corporate business verification. During development, mock Wema Bank credentials are returned. Standard top-up web checkout should remain the active fallback if DVA activation is delayed.
2. **Double-Booking Race Conditions**: When two patients click "Confirm" on the same calendar slot at the same instant, standard queries can result in both bookings succeeding. We recommend implementing a database-level transaction lock or a unique constraint on `(providerId, scheduledAt)` where status is confirmed to prevent double-booking.
3. **Wallet Balance Read Speeds**: In production, computing wallet balances by adding up every historical ledger transaction will slow down once a user accumulates thousands of entries. We recommend relying on the ledger's `balanceAfter` column to fetch current wallet balances in $O(1)$ constant time.
4. **Offline Mobile Queueing**: Mobile patients in remote regions with intermittent internet connections may experience network timeouts. The B2C Patient mobile app should queue notification logs and offline states locally, utilizing idempotency keys on payment transactions to prevent duplicate charges when requests are re-sent.
5. **NDPA 2023 & HIPAA Compliance**: Ensure that all logs (Pino, Sentry) are automatically scrubbed of Patient PII (e.g., medical history, phone numbers, email addresses) before being transmitted to cloud observability platforms.
