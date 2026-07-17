# Ricton Backend Blueprint & UI/UX Audit Specification

> **Document Type**: Comprehensive UI/UX-Driven Backend Engineering Specification
> **Source of Truth**: Design exports under `RICTON UI_UX/Web/` and `RICTON UI_UX/Mobile/`
> **Audience**: Senior Backend Software Engineers, Lead Architects, Product Owners
> **Goal**: Establish a stable, reliable, high-performance, and compliant backend infrastructure mapping all Web and Mobile UI/UX screens with absolute precision to eliminate blind decisions during development.

---

## 1. Executive Architecture Strategy & System Topologies

The Ricton system is designed as a hybrid backend monorepo comprised of **11 distinct microservices** operating over a shared, logically namespaces PostgreSQL database. It employs **Kong** as an edge API Gateway to handle cross-cutting concerns (TLS termination, JWT signature validation, global rate limiting, and CORS enforcement).

### 1.1 Gateway Routing & Service Boundary Mapping

```
                                      ┌────────────────┐
                                      │  Client Apps   │
                                      │ (Mobile & Web) │
                                      └───────┬────────┘
                                              │ HTTPS
                                              ▼
                                      ┌────────────────┐
                                      │  Kong Gateway  │
                                      └───────┬────────┘
                                              │ Internal Routing
          ┌───────────────┬───────────┼───────────┬───────────────┬───────────────┐
          ▼               ▼           ▼           ▼               ▼               ▼
     ┌─────────┐     ┌─────────┐ ┌─────────┐ ┌──────────┐   ┌───────────┐   ┌───────────┐
     │  Auth   │     │  User   │ │ Payment │ │  Wallet  │   │Appoint_mt │   │ Prescript │
     │ Service │     │ Service │ │ Service │ │ Service  │   │  Service  │   │  Service  │
     └─────────┘     └─────────┘ └─────────┘ └──────────┘   └───────────┘   └───────────┘
          │               │           │           │               │               │
          └───────────────┼───────────┼───────────┼───────────────┼───────────────┘
                          ▼           ▼           ▼               ▼
                   ┌────────────────────────────────────────────────┐
                   │               Shared PostgreSQL                │
                   └────────────────────────────────────────────────┘
```

The gateway routes incoming requests according to namespaces, offloading authorization verification to Kong's custom JWT verification layers, which then proxy enriched headers (`X-User-Id`, `X-User-Role`) down to the internal microservices.

---

## 2. Database Schema & Data Model Auditing (Prisma Mapping)

Based on our meticulous review of the UI/UX flows and current `schema.prisma`, we have identified critical data schema gaps. In order to build a gold-standard production backend, we must append the following models, relations, and fields to the database.

### 2.1 Essential Schema Additions

#### 1. Session & Token Revocation Management (For OAuth/Secure Multi-Device Logins)
* **Design Inferences**: Screen `Acount premium user SP.pdf` details "Login activity" and "Recent devices".
* **Prisma Model**:
```prisma
model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  deviceIp  String?
  deviceOs  String?
  userAgent String?
  isActive  Boolean  @default(true)
  expiresAt DateTime @db.Timestamptz(6)
  createdAt DateTime @default(now()) @db.Timestamptz(6)

  @@map("refresh_tokens")
}
```

#### 2. Address & Geo-Tracking (For Pharmacy Deliveries)
* **Design Inferences**: Screen `Address.pdf` and `Delivery.pdf` show "Delivery address" (e.g., "19 Ehi Street") and specify delivery fees.
* **Prisma Model**:
```prisma
model Address {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @db.Uuid
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  addressLine1 String
  addressLine2 String?
  city         String
  state        String
  country      String   @default("Nigeria")
  postalCode   String?
  latitude     Decimal? @db.Decimal(10, 8)
  longitude    Decimal? @db.Decimal(11, 8)
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now()) @db.Timestamptz(6)

  @@map("addresses")
}
```

#### 3. Realtime Messaging/Inbox Threads
* **Design Inferences**: Screen `Inbox 1 H.pdf` and `Inbox 2 H.pdf` show thread-based clinician-patient secure chat with document attachments (e.g., "Medication for eyes.pdf").
* **Prisma Models**:
```prisma
model ChatThread {
  id          String        @id @default(uuid()) @db.Uuid
  createdAt   DateTime      @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime      @updatedAt @db.Timestamptz(6)
  participants ChatParticipant[]
  messages    ChatMessage[]

  @@map("chat_threads")
}

model ChatParticipant {
  id        String     @id @default(uuid()) @db.Uuid
  threadId  String     @db.Uuid
  thread    ChatThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  userId    String     @db.Uuid
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  joinedAt  DateTime   @default(now()) @db.Timestamptz(6)

  @@unique([threadId, userId])
  @@map("chat_participants")
}

model ChatMessage {
  id         String     @id @default(uuid()) @db.Uuid
  threadId   String     @db.Uuid
  thread     ChatThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  senderId   String     @db.Uuid
  sender     User       @relation(fields: [senderId], references: [id], onDelete: Cascade)
  body       String?
  fileUrl    String?    // S3 URL for attachments e.g. Juwon.pdf
  fileName   String?
  fileSize   Int?       // In bytes
  isRead     Boolean    @default(false)
  createdAt  DateTime   @default(now()) @db.Timestamptz(6)

  @@map("chat_messages")
}
```

#### 4. Multi-Disciplinary Team (MDT) Cases
* **Design Inferences**: Screens `MDTs 1D.pdf` through `MDTs 1D-8.pdf` showcase MDT collaborative diagnosis sessions where clinical experts discuss patient complaints (e.g., "Patient: Micheal Ola, Age 45 years, complaint: blurry vision...").
* **Prisma Models**:
```prisma
enum MDTStatus {
  DRAFT
  OPEN
  ACTIVE
  CLOSED
}

model MDT {
  id          String        @id @default(uuid()) @db.Uuid
  title       String
  patientId   String        @db.Uuid
  patient     User          @relation("MdtPatient", fields: [patientId], references: [id])
  creatorId   String        @db.Uuid
  creator     User          @relation("MdtCreator", fields: [creatorId], references: [id])
  status      MDTStatus     @default(OPEN)
  complaint   String        @db.Text
  history     String?       @db.Text
  pastHistory String?       @db.Text
  diagnosis   String?       @db.Text
  createdAt   DateTime      @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime      @updatedAt @db.Timestamptz(6)

  participants MDTParticipant[]
  rooms        TelemedicineRoom[]

  @@map("mdts")
}

model MDTParticipant {
  id        String   @id @default(uuid()) @db.Uuid
  mdtId     String   @db.Uuid
  mdt       MDT      @relation(fields: [mdtId], references: [id], onDelete: Cascade)
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      String?  // Specialty of participant
  joinedAt  DateTime @default(now()) @db.Timestamptz(6)

  @@unique([mdtId, userId])
  @@map("mdt_participants")
}
```

#### 5. Pharmacy Inventory Product & Catalog Listings
* **Design Inferences**: Screens `Product 1 P.pdf`, `Product 2 P.pdf` (Wholesale and retail inventory displays).
* **Prisma Model**:
```prisma
model Product {
  id          String   @id @default(uuid()) @db.Uuid
  pharmacyId  String   @db.Uuid
  pharmacy    User     @relation(fields: [pharmacyId], references: [id], onDelete: Cascade)
  name        String
  description String?  @db.Text
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  category    String?
  imageUrl    String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now()) @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @db.Timestamptz(6)

  @@map("products")
}
```

#### 6. Loyalty Reward Catalog
* **Design Inferences**: Screen `Reward 1 P.pdf` and `Rewards 1 P.pdf` (redeemable benefits, vouchers, point collection panels).
* **Prisma Model**:
```prisma
model RewardCatalog {
  id          String   @id @default(uuid()) @db.Uuid
  title       String
  description String?
  pointsCost  Int
  stock       Int      @default(100)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now()) @db.Timestamptz(6)

  @@map("reward_catalogs")
}
```

### 2.2 Fields to Append to Existing Models

1. **`User` Table**:
   * Add `consentVersion String?` (capturing legal terms Version e.g. "v1.2026").
   * Add `consentAt DateTime? @db.Timestamptz(6)` (essential for NDPA 2023 compliance).
   * Add `lastLoginAt DateTime? @db.Timestamptz(6)`.
   * Add `twoFactorEnabled Boolean @default(false)`.
   * Add `deletedAt DateTime? @db.Timestamptz(6)` (soft-delete handle for NDPA "Right to Erasure").
2. **`Appointment` Table**:
   * Add `reason String? @db.Text` (symptoms or consultation reason).
   * Add `reminderSentAt DateTime? @db.Timestamptz(6)`.
   * Add `cancelledBy UserRole?` (identifying if Doctor, Patient, or Admin triggered cancelation).
3. **`ProviderProfile` Table**:
   * Add `onboardingStep Int @default(1)` (tracks active onboarding progress across 7 screens).
   * Add `documents Json?` (S3 object keys for credentials, licenses).
   * Add `idVerifiedAt DateTime? @db.Timestamptz(6)`.
4. **`Hospital` Table**:
   * Add `registrationNumber String?` (official registration details).
   * Add `documents Json?` (S3 objects for health facility certification).
   * Add `onboardingComplete Boolean @default(false)`.
   * Add `departments Json?` (JSON list of practice areas e.g., "Cardiology", "Neurology").
5. **`PharmacyProfile` Table**:
   * Add `documents Json?` (license keys, registration proofs).
   * Add `bankDetails Json?` (transit info for Paystack transfers).
   * Add `onboardingComplete Boolean @default(false)`.

---

## 3. High-Quality Route & API Design (Service-by-Service)

Below is the concrete route specification. Each endpoint is annotated with exact HTTP verbs, payload constraints, access policies, standard response types, and strict validation structures.

---

### 3.1 Auth Service (`services/auth/`)

Handles core register, credentials check, OAuth, 2FA, password recovery, and NDPA compliance captures.

#### `POST /api/auth/register`
* **Access**: Public
* **Payload Verification (Zod)**:
  ```typescript
  const RegisterInputSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    password: z.string().min(8).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/),
    role: z.enum(["PATIENT", "CONSULTANT", "PHARMACIST", "HOSPITAL_ADMIN"]),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    consentVersion: z.string().min(1),
  });
  ```
* **Success Output (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "d3b07384-d113-41f3-a55d-85ad2aa48d88",
      "status": "PENDING"
    }
  }
  ```

#### `POST /api/auth/login`
* **Access**: Public
* **Security Middleware**: Express auth-rate limit (Max 5 attempts / 15 minutes per IP/UserKey).
* **Payload Verification**:
  ```typescript
  const LoginInputSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    password: z.string().min(1),
  });
  ```
* **Success Output (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "7d9b4c04-f232-441a-a1b4-7b6bbdf6bc2f",
      "user": {
        "id": "d3b07384-d113-41f3-a55d-85ad2aa48d88",
        "role": "PATIENT",
        "emailVerified": true
      }
    }
  }
  ```

#### `POST /api/auth/otp/send`
* **Access**: Public (Uses strict 60s cooldown limit in Redis)
* **Payload**: `{ "destination": "stade@gmail.com", "channel": "EMAIL", "purpose": "PASSWORD_RESET" }`
* **Success Output (200 OK)**: `{ "success": true, "data": { "cooldown": 60 } }`

#### `POST /api/auth/otp/verify`
* **Access**: Public
* **Payload**: `{ "destination": "stade@gmail.com", "code": "194052", "purpose": "PASSWORD_RESET" }`
* **Success Output (200 OK)**: `{ "success": true, "data": { "verifiedToken": "9e25d204-c373-45ab-bc61..." } }`

#### `POST /api/auth/oauth/google` / `POST /api/auth/oauth/apple`
* **Access**: Public
* **Payload**: `{ "identityToken": "eyJhbGci..." }`
* **Workflow**: Decodes and verifies token against Google APIs / Apple Keys. Resolves matching User or registers a new PENDING Patient account automatically.

#### `POST /api/auth/logout`
* **Access**: Verified Session (`requireAuth`)
* **Payload**: `{ "refreshToken": "7d9b4c04-f232-441a-a1b4-7b6bbdf6bc2f" }`
* **Workflow**: Sets matching `RefreshToken` status to active = false in DB and purges cached session from Redis.

---

### 3.2 User Service (`services/user/`)

Manages Patient, Provider, and Pharmacy Profile details, searching, and geolocation indexing.

#### `GET /api/users/me`
* **Access**: Verified Session (`requireAuth`)
* **Success Output**: Merged User structure containing Profile payload relative to user role.

#### `PUT /api/users/me/medical-history`
* **Access**: `requireAuth` + Role restriction (`PATIENT`)
* **Payload**:
  ```json
  {
    "bloodType": "AA",
    "allergies": ["itchy eyes", "swelling", "Eczema"],
    "currentMedications": ["Amoxicillin", "Penicillin"],
    "conditions": ["Diabetes", "Asthma"]
  }
  ```
* **Success Output (200 OK)**: `{ "success": true, "data": { "updated": true } }`

#### `GET /api/users/providers`
* **Access**: Public/Authenticated
* **Parameters**: `specialty` (string), `latitude` (decimal), `longitude` (decimal), `maxDistanceKm` (integer), `page` (int)
* **Success Output**: Array of Doctors matching search criteria, ordered by proximity/rating.

---

### 3.3 Appointment Service (`services/appointment/`) (NEW SERVICE)

Coordinates calendar slot generation, double-booking safety invariants, and appointment state transition.

#### `GET /api/appointments/slots`
* **Access**: Authenticated (`requireAuth`)
* **Parameters**: `providerId` (UUID), `date` (YYYY-MM-DD)
* **Implementation Algorithm**:
  1. Retrieve Doctor's standard schedule from `ProviderAvailability` for day-of-week.
  2. Map schedule into blocks based on `slotDurationMinutes` (e.g., 30 mins).
  3. Load all ACTIVE, CONFIRMED, or IN_PROGRESS appointments for doctor on target date.
  4. Subtract booked slots from generated blocks.
  5. Return available slots array: `["09:00:00", "09:30:00", "10:00:00"]`.

#### `POST /api/appointments`
* **Access**: `requireAuth` + `PATIENT`
* **Payload**:
  ```json
  {
    "providerId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "scheduledAt": "2026-08-27T15:00:00.000Z",
    "type": "VIDEO",
    "reason": "Blurry vision and eye strain"
  }
  ```
* **Transaction Invariants (Atomic Operations)**:
  * Select with exclusive lock (`SELECT FOR UPDATE`) matching slot.
  * Check for conflicts: If overlapping appointment exists -> Throw `409 APPOINTMENT_CONFLICT`.
  * If validation succeeds, insert `Appointment` with status `PENDING`.
  * Auto-initiate payment record with `amount` set to Doctor’s `consultationFee`.
* **Success Output (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "appointmentId": "f784bfd1-4122-491a-b33c-3b09228cd412",
      "paymentReference": "PAYSTACK_REF_9384729"
    }
  }
  ```

#### `PATCH /api/appointments/:id/cancel`
* **Access**: `requireAuth` (`PATIENT`, `CONSULTANT`)
* **Payload**: `{ "reason": "Conflict with surgery schedule" }`
* **Business Logic**:
  * Set status to `CANCELLED`.
  * Release telemedicine booking resource.
  * If cancelled > 24 hours before: trigger refund to `Wallet` if paid.

---

### 3.4 Prescription Service (`services/prescription/`) (NEW SERVICE)

Manages clinical medication ordering, digital signatures, and dispensing verification.

#### `POST /api/prescriptions`
* **Access**: `requireAuth` + `CONSULTANT`
* **Payload**:
  ```json
  {
    "patientId": "e283b4c1-411a-493a-be22-3bb0221ac411",
    "appointmentId": "f784bfd1-4122-491a-b33c-3b09228cd412",
    "items": [
      {
        "drugName": "Amoxicillin",
        "dosage": "500mg",
        "quantity": 20,
        "frequency": "Every 12hrs",
        "duration": "7 days",
        "instructions": "Take with meals"
      }
    ]
  }
  ```
* **Success Output (210 Created)**: Returns Prescription record (Status: `DRAFT`).

#### `POST /api/prescriptions/:id/sign`
* **Access**: `requireAuth` + `CONSULTANT`
* **Payload**: `{ "otpCode": "847293" }`
* **Digital Trust Sign-off (Algorithm)**:
  1. Validate consultant's active `isVerified` license.
  2. Verify transaction signing OTP against consultant's registered device.
  3. Transition status to `SIGNED`. Generate secure cryptographic audit block:
     `Hash(prescriptionId + items + consultantLicense + timestamp)` saved on audit ledger.

---

### 3.5 Telemedicine Service (`services/telemedicine/`) (NEW SERVICE)

Wraps live signaling, session tracking, Twilio integrations, and MDT calls.

#### `POST /api/telemedicine/rooms/token`
* **Access**: Authenticated participant
* **Payload**: `{ "roomId": "e1837492-311a-4a2a-bc33-28bc83f0812b" }`
* **Business Logic**:
  * Verify requesting user belongs to room's participant list (`patientId` or `providerId` for appointment).
  * Request secure token from Twilio using API secrets:
    ```typescript
    const token = new Twilio.jwt.AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET);
    const videoGrant = new Twilio.jwt.AccessToken.VideoGrant({ room: roomId });
    token.addGrant(videoGrant);
    ```
  * Return signed access token back to caller.

#### `POST /api/telemedicine/mdt/invite`
* **Access**: `requireAuth` + `CONSULTANT`
* **Payload**: `{ "mdtId": "9ab1-bc...", "invitedDoctorId": "7d2c-ea..." }`

---

### 3.6 Pharmacy Service (`services/pharmacy/`) (NEW SERVICE)

Catalog, inventory, ordering mechanics, delivery fees, and order dispatch triggers.

#### `POST /api/pharmacies/orders`
* **Access**: `requireAuth` + `PATIENT`
* **Payload**:
  ```json
  {
    "pharmacyId": "b182cb3c-399a-412b-bc22-38b93ac831e1",
    "prescriptionId": "c3b94204-1b1a-4223-bd92-3ba022cc411b",
    "deliveryType": "DELIVERY",
    "deliveryAddressId": "8b9ac32e-1a2b-3c4d-5e6f-7a8b9c0d1e2f"
  }
  ```
* **Business Logic**:
  * Deduce items from Prescription if supplied.
  * Verify inventory stock availability.
  * Compute Delivery Fee (dynamic radius check or flat fee N1000).
  * Success transitions order to `PLACED` pending payment clearing.

---

### 3.7 Payment Service (`services/payment/`)

Central Paystack transaction gateway.

#### `POST /api/payments/initialize`
* **Access**: `requireAuth`
* **Payload**: `{ "amount": 5000.00, "type": "PHARMACY_ORDER", "referenceId": "order-uuid-here" }`
* **Success Output**: Returns Paystack checkout configuration & reference.

#### `POST /api/payments/webhook`
* **Access**: Public / Paystack IP Whitelisted (`webhook-sig` matching key)
* **Integration Logic**:
  * Parse Payload event `charge.success`.
  * Read reference metadata: Retrieve `referenceId` and `type`.
  * Update `Payment` record status to `SUCCESS`.
  * Dispatch internal event message (e.g., to Appointment service to transition state to `CONFIRMED`, or to Wallet to process credit).

---

### 3.8 Wallet Service (`services/wallet/`)

Ledger, atomic credits, and virtual accounts.

#### `POST /api/wallets/virtual-account`
* **Access**: `requireAuth`
* **Workflow**: Leverages Paystack's Dedicated Virtual Accounts (DVA) endpoint to generate user-specific bank details (Wema, Titan Trust).
* **Success Output (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "virtualAccountNumber": "8493038433344",
      "virtualBankName": "Titan Trust Bank"
    }
  }
  ```

---

### 3.9 Notification Service (`services/notification/`) (NEW SERVICE)

Distributes notifications through multi-channel transports.

#### `POST /api/notifications/send`
* **Access**: Internal Microservice Call ONLY
* **Payload**: `{ "userId": "uuid", "channel": "SMS", "title": "...", "body": "..." }`
* **Transports**: Twilio SMS client, SendGrid Email client, Firebase FCM (push notifications).

---

### 3.10 Admin Service (`services/admin/`) (NEW SERVICE)

Compliance monitoring, licensing reviews, system stats.

#### `PATCH /api/admin/providers/:id/verify`
* **Access**: `requireAuth` + `SUPER_ADMIN`
* **Business logic**: Updates `isVerified = true` on Doctor profile. Emits registration-approved notifications.

---

### 3.11 Analytics Service (`services/analytics/`) (NEW SERVICE)

Read-only analytical aggregates for administrative insights.

#### `GET /api/analytics/dashboard`
* **Access**: `requireAuth` + `SUPER_ADMIN` / `HOSPITAL_ADMIN`
* **Operation**: Computes high-performance read-only database metrics using Postgres materialized view aggregates.

---

## 4. Multi-Portal User Flow Breakdown

We now describe the exact backend execution paths required for each screen sequence.

### 4.1 Patient Mobile App Flow (B2C)

```
[Onboarding] ──▶ [Home Discovery] ──▶ [62-Step Wizard] ──▶ [Telemedicine Call] ──▶ [Delivery Track]
```

1. **Onboarding & Authentication Flow**:
   * Screens: `Welcome to Ricton.pdf` -> `Login.pdf` -> `Phone number.pdf` -> `Temporary code.pdf`.
   * Backend Execution: User submits a phone number. Backend generates a 6-digit OTP code, stores it in Redis with a 5-minute TTL, and triggers Twilio SMS. User replies with the verification code. The system checks it, issues JWTs, sets status to `ACTIVE`, and routes the client home.
2. **Home Discovery**:
   * Screens: `Home page.jpg`, `Home (after booking).jpg`.
   * Backend Execution: Pulls dynamic dashboard: checks if user has active, pending subscriptions (`Subscription` table); searches nearest open Pharmacies (`PharmacyProfile` coordinates); matches upcoming medical sessions.
3. **62-Step Booking & Checkout Wizard**:
   * Screens: `Booking - 1.pdf` to `Booking - 62.pdf`, `Pickup.pdf`, `Payment.pdf`.
   * Backend Execution:
     * User searches pharmacies or consults.
     * Selects prescriptions upload (`Booking - 50.pdf`). S3 presigned key generated.
     * Completes cart creation. Selects Delivery or Pickup.
     * Screen triggers checkout with 3-tab payment options: **Bank Transfer** (Paystack DVA virtual numbers), **Card** (Paystack inline validation), or **Wallet** (checking ledger balance).
     * Backend executes checkout. If `Wallet`, performs database lock to prevent race-condition overdrafts.
4. **Active Consult & Telemedicine Call**:
   * Screens: `Tele medicine page.pdf`, `Booking - 60.pdf` ("Calling...").
   * Backend Execution: Triggers session on Twilio video rooms. Client updates room state to `ACTIVE`, signaling peer connection.
5. **My Order Tracking**:
   * Screens: `My order.pdf` to `My order-9.pdf`.
   * Backend Execution: Real-time queries on order states. Transitions through `PLACED` -> `CONFIRMED` -> `PREPARING` -> `OUT_FOR_DELIVERY` -> `DELIVERED`.

---

### 4.2 Consultant Portal Flow (Web & Mobile)

```
[7-Step Doc Onboarding] ──▶ [Provider Dashboard] ──▶ [MDT Diagnostic Room] ──▶ [Prescription Signing]
```

1. **Onboarding**:
   * Screens: `1 doctor onboarding page.pdf` -> `2-7 doctor onboarding page.pdf`.
   * Backend Execution: Multi-step data capture. Consultant fills license, specialization, and upload documents (presigned URL uploads). User stays in state `PENDING` until validated by administrator.
2. **Dashboard**:
   * Screens: `1 Doctor home page.pdf`.
   * Backend Execution: Aggregates patient queues, upcoming telemedicine bookings, and calculates `ProviderEarning` balances.
3. **MDT Panel**:
   * Screens: `MDTs 1D.pdf` to `MDTs 1D-8.pdf`.
   * Backend Execution: Consultant opens an MDT case, links a Patient ID, and adds peers. System sets up a team messaging thread (`ChatThread` + participants) and maps room type to `MDT` in the Telemedicine registry, opening collaboration pathways.
4. **E-Prescription Creation**:
   * Screens: `E-Prescription page 1 H.pdf` to `12 H.pdf`.
   * Backend Execution: Complete medical panel. Doctor inputs patient diagnosis details, drug names, and doses. Doctor signs with OTP token, changing the prescription status from `DRAFT` to `SIGNED`, which instantly notifies the patient on mobile.

---

### 4.3 Hospital Portal Flow (Web)

```
[Hospital Sign-up] ──▶ [Department Config] ──▶ [Doctor Rostering] ──▶ [Aggregated Billing]
```

1. **Hospital Onboarding**:
   * Screens: `1 Hospital onboarding page H.pdf` to `H-7.pdf`.
   * Backend Execution: Collects corporate license numbers, logo assets, and sets up medical departments (e.g., Cardiology, Dermatology).
2. **Operations Dashboard**:
   * Screens: `1 hospital home page H.jpg`, `Patient page 4 H.pdf`.
   * Backend Execution: Displays aggregate list of clinic-associated appointments, lists linked doctors, reviews active patient rosters, and monitors hospital earnings.

---

### 4.4 Pharmacy Portal Flow (Web)

```
[Store Registration] ──▶ [Catalog Management] ──▶ [Order Fulfillment] ──▶ [Wholesale Restock]
```

1. **Onboarding**:
   * Screens: `Pharmacy onboarding page P 1.pdf` to `P 7.pdf`.
   * Backend Execution: Stores corporate location profiles, bank account routing, operating schedules, and verification certs.
2. **Catalog & Order Management**:
   * Screens: `Product 1 P.pdf`, `Sales 1 P.pdf`.
   * Backend Execution:
     * List, add, update, or soft-delete products (`Product` table).
     * View inbound pharmacy order queues, marking orders ready for pickup or dispatched for delivery. Updates trigger SMS/Push updates to patient devices.

---

### 4.5 Admin/CMS/Marketing Portal Flow (Web)

* **Screens**: `1 Landing page.jpg`, `About us.pdf`, `Pricing.pdf`, `Services.pdf`, `Resources.pdf`, `Ricton-1.pdf` to `166.pdf`.
* **Backend Execution**: Serves dynamic content grids, pricing configurations, and FAQ catalogs. Monitors audit trails and resolves compliance reports.

---

## 5. Security Engineering, Standards, & NDPA Compliance Checklist

Ricton must adhere to security gold standards and comply fully with Nigeria Data Protection Act (NDPA) 2023 regulations.

### 5.1 NDPA 2023 Compliance Controls
1. **Informed Consent Capture**:
   * **Implementation**: Registration APIs MUST capture the specific terms version (`consentVersion`) and timestamp (`consentAt`). Accounts cannot transition to `ACTIVE` without consent.
2. **Right to Erasure (Soft Delete)**:
   * **Implementation**: Deletion requests must not perform raw `DELETE` operations on `User` records. Instead:
     * Set `deletedAt` to current timestamp.
     * Mask PII fields (e.g., replace names with `"DELETED_USER"`, scramble emails).
     * Keep historical financial records intact for tax/audit purposes, unlinked from PII.
3. **Data Minimization**:
   * **Implementation**: Do not store unnecessary user details. Strict schema profiles (Section 2) ensure patient-specific clinical data remains isolated from other user roles.

### 5.2 API Security Framework
1. **Strict Input Validation**:
   * Every endpoint must enforce type and length constraints using strict Zod validation schemas. Escape raw inputs before database interaction to prevent SQL injection (handled inherently by Prisma parameterized queries).
2. **OWASP Best Practices**:
   * Deploy **Helmet.js** to inject essential secure HTTP headers (Strict-Transport-Security, Content-Security-Policy).
   * Limit file uploads (e.g. `Juwon.pdf`, `Medication for eyes.pdf`) to a max size of 10MB, strictly whitelisting MIMEs (`application/pdf`, `image/jpeg`, `image/png`) using magic-bytes scanning.
3. **Cryptographic Ledger**:
   * Signing transactions (e.g., Doctors signing prescriptions or Admins approving payouts) must be recorded on the database-backed `AuditLog` using SHA-256 hashes of the signed payload.

---

## 6. Open Product Questions

To build with absolute precision, the engineering team requires product clarification on the following items:

1. **E-Prescription Dispensation Verification**:
   * Do pharmacists require an OTP code sent to the patient's device to mark a prescription as `DISPENSED`, or is scanning a barcode on the mobile app sufficient?
2. **Dynamic Delivery Costing**:
   * How should delivery fees be calculated? A flat fee (e.g., N1000 flat) or integrated with third-party logistics APIs (e.g., GIG Logistics, Gokada) for real-time distance-based costing?
3. **MDT Consultation Access Controls**:
   * Are patient consent records required before adding their clinical details to an MDT consultation room, or does the initiating consultant have implicit authority?
4. **Subscription Plan Trial Policies**:
   * Does transitioning from Free to Premium subscription include a trial period (e.g., 7 days), or is payment required immediately upon checkout?

---

_End of Blueprint Document._
**Designed with professional excellence by Senior Backend Software Engineers.**
