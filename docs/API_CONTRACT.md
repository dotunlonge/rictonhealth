# API Contract Reference

> **Purpose**: This document is the canonical request/response contract for frontend and mobile developers. It supplements `openapi.yaml` and Swagger UI with practical examples, edge cases, and implementation notes.

---

## Table of Contents

1. [Global Conventions](#global-conventions)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Endpoints](#user-endpoints)
4. [Appointment Endpoints](#appointment-endpoints)
5. [Prescription Endpoints](#prescription-endpoints)
6. [Telemedicine Endpoints](#telemedicine-endpoints)
7. [Address Endpoints](#address-endpoints)
8. [Analytics Endpoints](#analytics-endpoints)
9. [Pharmacy Endpoints](#pharmacy-endpoints)
10. [Error Codes Reference](#error-codes-reference)

---

## Global Conventions

### Base URL

```
http://localhost:8000
```

### Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Response Envelope

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { "field": ["error detail"] }
  }
}
```

### Date Formats

All dates are ISO 8601 strings:

```
"2026-07-20T15:30:00.000Z"
```

### Pagination

List endpoints return:

```json
{
  "success": true,
  "data": {
    "items": [],
    "meta": {
      "total": 100,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

Query parameters:

- `limit` (default: 20, max: 100)
- `offset` (default: 0)

---

## Authentication Endpoints

### Register

```http
POST /api/auth/register
```

**Request:**

```json
{
  "email": "patient@example.com",
  "phone": "+234801234567",
  "password": "SecurePass1!",
  "role": "PATIENT",
  "firstName": "Jane",
  "lastName": "Doe",
  "consentVersion": "1.0"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a1b2c3d4-0000-0000-0000-000000000000",
      "email": "patient@example.com",
      "phone": "+234801234567",
      "role": "PATIENT",
      "status": "PENDING"
    }
  }
}
```

**Notes:**

- `status: PENDING` means email/phone verification is required before full access
- Password must be 8+ chars with uppercase, lowercase, number, and special char
- `consentVersion` is required for NDPA 2023 compliance

### Login

```http
POST /api/auth/login
```

**Request:**

```json
{
  "email": "patient@example.com",
  "password": "SecurePass1!"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a1b2c3d4-0000-0000-0000-000000000000",
      "email": "patient@example.com",
      "phone": "+234801234567",
      "role": "PATIENT",
      "status": "ACTIVE"
    }
  }
}
```

**Error 401:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### Send OTP

```http
POST /api/auth/otp/send
```

**Request:**

```json
{
  "email": "patient@example.com",
  "purpose": "LOGIN"
}
```

**Purpose values:**

- `LOGIN` - For login flow
- `REGISTER` - For registration verification
- `PASSWORD_RESET` - For password reset
- `VERIFY_EMAIL` - For email confirmation
- `VERIFY_PHONE` - For phone confirmation

**Response 200:**

```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 300
  }
}
```

### Verify OTP

```http
POST /api/auth/otp/verify
```

**Request:**

```json
{
  "email": "patient@example.com",
  "otp": "123456"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

### OAuth (Google)

```http
POST /api/auth/oauth/google
```

**Request:**

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "PATIENT"
}
```

**Notes:**

- `token` is the Google ID token (not access token)
- `role` is required for new users only

### Refresh Token

```http
POST /api/auth/refresh
```

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "token": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

**Notes:**

- Refresh token rotation: each call returns a new refresh token
- Old refresh token is immediately invalidated
- If refresh fails, redirect to login

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**

```json
{
  "success": true,
  "data": null
}
```

### Password Forgot

```http
POST /api/auth/password/forgot
```

**Request:**

```json
{
  "email": "patient@example.com"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "message": "OTP sent to email"
  }
}
```

### Password Reset

```http
POST /api/auth/password/reset
```

**Request:**

```json
{
  "email": "patient@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass1!"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": null
}
```

---

## User Endpoints

### Get Profile

```http
GET /api/users/me
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-0000-0000-0000-000000000000",
    "email": "patient@example.com",
    "phone": "+234801234567",
    "role": "PATIENT",
    "status": "ACTIVE",
    "patientProfile": {
      "firstName": "Jane",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-15",
      "gender": "FEMALE",
      "bloodType": "O+",
      "allergies": ["Penicillin", "Peanuts"],
      "medicalHistory": [
        {
          "condition": "Hypertension",
          "diagnosedAt": "2020-03-15",
          "notes": "Managed with medication"
        }
      ],
      "emergencyContact": {
        "name": "John Doe",
        "relationship": "Spouse",
        "phone": "+234809876543"
      }
    },
    "providerProfile": null
  }
}
```

**Notes:**

- `providerProfile` is null for non-providers
- `patientProfile` is null for non-patients
- Fields may be null until onboarding is complete

### Update Profile

```http
PUT /api/users/me
Authorization: Bearer <token>
```

**Request:**

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "dateOfBirth": "1990-01-15",
  "gender": "FEMALE",
  "bloodType": "O+",
  "allergies": ["Penicillin"],
  "specialty": "Cardiology",
  "consultationFee": 15000,
  "title": "Dr.",
  "pharmacyName": "Smith Pharmacy"
}
```

**Notes:**

- Only include fields you want to update
- Provider-specific fields (`specialty`, `consultationFee`, `title`, `pharmacyName`) are ignored for patients
- Patient-specific fields are ignored for providers

### Upload Avatar

```http
PUT /api/users/me/avatar
Authorization: Bearer <token>
```

**Request:**

```json
{
  "fileType": "image/jpeg"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "fileUrl": "https://ricton-avatars.s3.amazonaws.com/a1b2c3d4-0000-0000-0000-000000000000.jpg"
  }
}
```

**Implementation:**

1. Call this endpoint to get a presigned S3 URL
2. PUT the file directly to the returned `uploadUrl`
3. The public URL is returned in `fileUrl`

### Search Providers

```http
GET /api/users/providers?specialty=Cardiology&name=Smith&limit=10&offset=0
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": "b2c3d4e5-0000-0000-0000-000000000000",
        "firstName": "John",
        "lastName": "Smith",
        "specialty": "Cardiology",
        "consultationFee": 15000,
        "title": "Dr.",
        "hospital": {
          "id": "c3d4e5f6-0000-0000-0000-000000000000",
          "name": "Ricton Hospital",
          "address": "123 Health St, Lagos"
        }
      }
    ],
    "meta": {
      "total": 1,
      "limit": 10,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### Hospital Dashboard

```http
GET /api/users/dashboard/hospital
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "hospital": {
      "id": "c3d4e5f6-0000-0000-0000-000000000000",
      "name": "Ricton Hospital",
      "phone": "+234801234567",
      "email": "admin@rictonhospital.com",
      "logoUrl": "https://...",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "stats": {
      "totalDoctors": 25,
      "totalAppointments": 156,
      "activePatients": 892
    }
  }
}
```

**RBAC:** Only accessible by `HOSPITAL_ADMIN` role.

### Provider Dashboard

```http
GET /api/users/dashboard/provider
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalAppointments": 342,
      "pendingAppointments": 12,
      "completedAppointments": 320,
      "totalEarnings": 4500000
    },
    "upcomingAppointments": [
      {
        "id": "d4e5f6a7-0000-0000-0000-000000000000",
        "patientId": "a1b2c3d4-0000-0000-0000-000000000000",
        "scheduledAt": "2026-07-21T10:00:00.000Z",
        "type": "VIDEO",
        "status": "CONFIRMED"
      }
    ]
  }
}
```

**RBAC:** Only accessible by `CONSULTANT` role.

---

## Appointment Endpoints

### Get Availability

```http
GET /api/appointments/availability?providerId=<uuid>&date=2026-07-21
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": ["2026-07-21T09:00:00.000Z", "2026-07-21T10:00:00.000Z", "2026-07-21T11:00:00.000Z"]
}
```

**Notes:**

- Returns UTC timestamps of available 1-hour slots
- Slots are provider-specific
- Check daily; availability changes as appointments are booked

### Book Appointment

```http
POST /api/appointments
Authorization: Bearer <token>
```

**Request:**

```json
{
  "providerId": "b2c3d4e5-0000-0000-0000-000000000000",
  "hospitalId": "c3d4e5f6-0000-0000-0000-000000000000",
  "scheduledAt": "2026-07-21T10:00:00.000Z",
  "type": "VIDEO",
  "notes": "Follow-up consultation",
  "reason": "Persistent headache",
  "durationMinutes": 30
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "e5f6a7b8-0000-0000-0000-000000000000",
    "patientId": "a1b2c3d4-0000-0000-0000-000000000000",
    "providerId": "b2c3d4e5-0000-0000-0000-000000000000",
    "hospitalId": "c3d4e5f6-0000-0000-0000-000000000000",
    "scheduledAt": "2026-07-21T10:00:00.000Z",
    "durationMinutes": 30,
    "type": "VIDEO",
    "status": "PENDING",
    "notes": "Follow-up consultation",
    "reason": "Persistent headache",
    "reminderSentAt": null,
    "cancelledBy": null,
    "createdAt": "2026-07-20T15:00:00.000Z",
    "updatedAt": "2026-07-20T15:00:00.000Z"
  }
}
```

**Error 409:**

```json
{
  "success": false,
  "error": {
    "code": "SLOT_CONFLICT",
    "message": "This time slot is no longer available"
  }
}
```

### List Appointments

```http
GET /api/appointments?status=CONFIRMED&type=VIDEO&from=2026-07-01&to=2026-07-31&limit=20&offset=0
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "appointments": [...],
    "meta": {
      "total": 5,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### Cancel Appointment

```http
PATCH /api/appointments/:id/cancel
Authorization: Bearer <token>
```

**Request:**

```json
{
  "cancellationReason": "No longer needed"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "e5f6a7b8-0000-0000-0000-000000000000",
    "status": "CANCELLED",
    "cancellationReason": "No longer needed",
    "cancelledBy": "PATIENT"
  }
}
```

---

## Prescription Endpoints

### Create Prescription

```http
POST /api/prescriptions
Authorization: Bearer <token>
```

**Request:**

```json
{
  "patientId": "a1b2c3d4-0000-0000-0000-000000000000",
  "appointmentId": "e5f6a7b8-0000-0000-0000-000000000000",
  "notes": "Take after meals",
  "items": [
    {
      "drugName": "Amoxicillin",
      "dosage": "500mg",
      "quantity": 21,
      "frequency": "3 times daily",
      "duration": "7 days",
      "instructions": "Complete the full course"
    }
  ]
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "f6a7b8c9-0000-0000-0000-000000000000",
    "appointmentId": "e5f6a7b8-0000-0000-0000-000000000000",
    "patientId": "a1b2c3d4-0000-0000-0000-000000000000",
    "providerId": "b2c3d4e5-0000-0000-0000-000000000000",
    "pharmacyId": null,
    "status": "PENDING",
    "signedAt": null,
    "notes": "Take after meals",
    "items": [
      {
        "id": "a7b8c9d0-0000-0000-0000-000000000000",
        "prescriptionId": "f6a7b8c9-0000-0000-0000-000000000000",
        "drugName": "Amoxicillin",
        "dosage": "500mg",
        "quantity": 21,
        "frequency": "3 times daily",
        "duration": "7 days",
        "instructions": "Complete the full course",
        "createdAt": "2026-07-20T15:00:00.000Z"
      }
    ],
    "createdAt": "2026-07-20T15:00:00.000Z",
    "updatedAt": "2026-07-20T15:00:00.000Z"
  }
}
```

### Sign Prescription

```http
POST /api/prescriptions/:id/sign
Authorization: Bearer <token>
```

**Request:**

```json
{
  "otpCode": "123456"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "f6a7b8c9-0000-0000-0000-000000000000",
    "status": "SIGNED",
    "signedAt": "2026-07-20T15:05:00.000Z"
  }
}
```

**Notes:**

- Requires OTP verification for provider
- Once signed, prescription cannot be modified

---

## Telemedicine Endpoints

### Create Room

```http
POST /api/telemedicine/rooms
Authorization: Bearer <token>
```

**Request:**

```json
{
  "appointmentId": "e5f6a7b8-0000-0000-0000-000000000000",
  "roomType": "ONE_ON_ONE"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "b8c9d0e1-0000-0000-0000-000000000000",
    "appointmentId": "e5f6a7b8-0000-0000-0000-000000000000",
    "providerId": "b2c3d4e5-0000-0000-0000-000000000000",
    "roomType": "ONE_ON_ONE",
    "externalRoomId": "ricton-a1b2c3d4",
    "externalRoomUrl": "https://telemedicine.ricton.health/room/ricton-a1b2c3d4",
    "status": "CREATED",
    "startedAt": null,
    "endedAt": null,
    "createdAt": "2026-07-20T15:00:00.000Z",
    "updatedAt": "2026-07-20T15:00:00.000Z"
  }
}
```

### Get Room Token

```http
GET /api/telemedicine/rooms/:id/token
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "room": {
      "id": "b8c9d0e1-0000-0000-0000-000000000000",
      "externalRoomUrl": "https://telemedicine.ricton.health/room/ricton-a1b2c3d4",
      "status": "ACTIVE"
    }
  }
}
```

**Notes:**

- Token is short-lived (expires in 1 hour)
- Pass token to video SDK (Agora/Twilio/Daily.co)
- Room status changes to `ACTIVE` when first participant joins

---

## Address Endpoints

### List Addresses

```http
GET /api/addresses
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "addresses": [
    {
      "id": "c9d0e1f2-0000-0000-0000-000000000000",
      "userId": "a1b2c3d4-0000-0000-0000-000000000000",
      "addressLine1": "123 Health Street",
      "addressLine2": "Apt 4B",
      "city": "Lagos",
      "state": "Lagos",
      "country": "Nigeria",
      "postalCode": "100001",
      "latitude": 6.5244,
      "longitude": 3.3792,
      "isDefault": true,
      "createdAt": "2026-07-20T15:00:00.000Z"
    }
  ]
}
```

### Create Address

```http
POST /api/addresses
Authorization: Bearer <token>
```

**Request:**

```json
{
  "addressLine1": "123 Health Street",
  "addressLine2": "Apt 4B",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "postalCode": "100001",
  "latitude": 6.5244,
  "longitude": 3.3792,
  "isDefault": true
}
```

**Notes:**

- `country` defaults to `Nigeria`
- `postalCode` must be 6 digits
- `isDefault` marks the primary delivery address

### Validate Address

```http
POST /api/addresses/validate
Authorization: Bearer <token>
```

**Request:**

```json
{
  "addressLine1": "123 Health Street",
  "city": "Lagos",
  "state": "Lagos",
  "country": "Nigeria",
  "postalCode": "100001"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "formatted": "123 Health Street, Apt 4B, Lagos, Lagos, Nigeria, 100001",
    "latitude": 6.5244,
    "longitude": 3.3792
  }
}
```

---

## Analytics Endpoints

All analytics endpoints require authentication. Some require admin roles.

### Overview

```http
GET /api/analytics/overview
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 12500,
    "totalPatients": 10000,
    "totalProviders": 2000,
    "totalPharmacists": 300,
    "totalHospitals": 200,
    "totalAppointments": 45000,
    "completedAppointments": 42000,
    "totalRevenue": 1250000000,
    "activeSubscriptions": 5000
  }
}
```

### Appointments Trend

```http
GET /api/analytics/appointments?range=30d&from=2026-06-20&to=2026-07-20
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "total": 1500,
    "byStatus": {
      "COMPLETED": 1200,
      "PENDING": 200,
      "CANCELLED": 100
    },
    "byType": {
      "IN_PERSON": 900,
      "VIDEO": 600
    },
    "trend": [
      {
        "period": "2026-07-01",
        "count": 50
      }
    ]
  }
}
```

**Range values:**

- `7d`, `30d`, `90d`, `12m`, `all`

---

## Pharmacy Endpoints

### List Products

```http
GET /api/pharmacy/products?limit=20&offset=0&category=Antibiotics
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "d0e1f2a3-0000-0000-0000-000000000000",
        "name": "Amoxicillin 500mg",
        "description": "Broad-spectrum antibiotic",
        "price": 2500.0,
        "category": "Antibiotics",
        "imageUrl": "https://ricton-pharmacy.s3.amazonaws.com/...",
        "stock": 150,
        "isActive": true,
        "pharmacyId": "e1f2a3b4-0000-0000-0000-000000000000",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

### Create Order

```http
POST /api/pharmacy/orders
Authorization: Bearer <token>
```

**Request:**

```json
{
  "pharmacyId": "e1f2a3b4-0000-0000-0000-000000000000",
  "items": [
    {
      "productId": "d0e1f2a3-0000-0000-0000-000000000000",
      "quantity": 2
    }
  ],
  "deliveryType": "HOME_DELIVERY",
  "deliveryAddress": "123 Health Street, Lagos"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "f2a3b4c5-0000-0000-0000-000000000000",
    "userId": "a1b2c3d4-0000-0000-0000-000000000000",
    "pharmacyId": "e1f2a3b4-0000-0000-0000-000000000000",
    "status": "PENDING",
    "totalAmount": 5000.0,
    "deliveryType": "HOME_DELIVERY",
    "deliveryAddress": "123 Health Street, Lagos",
    "items": [
      {
        "productId": "d0e1f2a3-0000-0000-0000-000000000000",
        "quantity": 2,
        "unitPrice": 2500.0
      }
    ],
    "createdAt": "2026-07-20T15:00:00.000Z"
  }
}
```

---

## Error Codes Reference

| Code                          | HTTP Status | Meaning                  | Developer Action                           |
| ----------------------------- | ----------- | ------------------------ | ------------------------------------------ |
| `VALIDATION_ERROR`            | 400         | Input validation failed  | Display field errors from `details`        |
| `UNAUTHORIZED`                | 401         | Missing or invalid token | Redirect to login, clear session           |
| `FORBIDDEN`                   | 403         | Insufficient permissions | Show access denied                         |
| `NOT_FOUND`                   | 404         | Resource doesn't exist   | Show 404 state                             |
| `CONFLICT_ERROR`              | 409         | Business rule conflict   | Display specific message                   |
| `RATE_LIMITED`                | 429         | Too many requests        | Wait and retry, check `Retry-After` header |
| `INTERNAL_ERROR`              | 500         | Server error             | Retry once, then report                    |
| `SLOT_CONFLICT`               | 409         | Appointment slot taken   | Refresh availability and retry             |
| `INVALID_CREDENTIALS`         | 401         | Wrong email/password     | Show error, allow retry                    |
| `TOKEN_EXPIRED`               | 401         | Refresh token expired    | Redirect to login                          |
| `OTP_INVALID`                 | 400         | Wrong OTP code           | Allow retry, show attempts remaining       |
| `INSUFFICIENT_BALANCE`        | 402         | Wallet balance too low   | Prompt top-up                              |
| `PRESCRIPTION_ALREADY_SIGNED` | 409         | Already signed           | Refresh prescription state                 |

---

## Rate Limits

| Endpoint Category           | Limit        | Window     |
| --------------------------- | ------------ | ---------- |
| Auth (login, register, OTP) | 5 requests   | 15 minutes |
| General API                 | 100 requests | 1 minute   |
| File uploads                | 10 requests  | 1 hour     |

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1690000000
```

---

## Webhooks

### Paystack Events

| Event              | Meaning                | Action                               |
| ------------------ | ---------------------- | ------------------------------------ |
| `charge.success`   | Payment successful     | Credit wallet, update payment status |
| `charge.failed`    | Payment failed         | Notify user, log failure             |
| `transfer.success` | Bank transfer complete | Update transaction                   |
| `transfer.failed`  | Transfer failed        | Notify user, retry or refund         |

### Verification

```typescript
// Verify Paystack signature
function verifyPaystackSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(body)
    .digest('hex');

  return hash === signature;
}
```

---

## SDKs and Codegen

### TypeScript Client

```bash
npx openapi-typescript-codegen --input ./openapi.yaml --output ./src/api
```

### Swift Client

```bash
npx openapi-generator-cli generate \
  -i openapi.yaml \
  -g swift5 \
  -o ./ios/RictonAPI
```

### Kotlin Client

```bash
npx openapi-generator-cli generate \
  -i openapi.yaml \
  -g kotlin \
  -o ./android/ricton-api
```

---

## Support

- **API Status**: Check `/health` endpoint
- **Issues**: Report at `https://github.com/YourOrg/Ricton/issues`
- **Slack**: `#ricton-api` channel
