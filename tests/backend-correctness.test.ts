/**
 * Backend correctness guards (TDD RED → GREEN).
 * Source-static + schema-static: no Docker/DB. Run: npx jest tests/backend-correctness.test.ts
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Wallet: double-credit and overdraft races', () => {
  const src = () => read('services/wallet/src/controllers/wallet.controller.ts');
  const schema = () => read('packages/db/prisma/schema.prisma');

  it('wallet_transactions has a unique idempotency constraint on (walletId, referenceId)', () => {
    expect(schema()).toMatch(/@@unique\(\[walletId,\s*referenceId\]\)/);
  });

  it('credit path relies on the constraint (P2002-tolerant), not check-then-insert alone', () => {
    expect(src()).toMatch(/P2002/);
  });

  it('debit is conditional at the database level (no read-then-decrement overdraft)', () => {
    // A conditional updateMany (balance >= amount) or equivalent guard.
    expect(src()).toMatch(/updateMany[\s\S]{0,400}gte|balance:\s*\{\s*gte/m);
  });

  it('webhook reconciles provider amount/currency before crediting', () => {
    expect(src()).toMatch(/currency/i);
    expect(src()).toMatch(/amountInNaira\s*(>|>=|<=|<)|expectedAmount|reconcile/i);
  });
});

describe('Appointments: availability management', () => {
  it('POST /availability validates SetAvailabilityInput and calls setAvailability', () => {
    const routes = read('services/appointment/src/routes/appointment.routes.ts');
    expect(routes).toMatch(/validateRequest\(SetAvailabilityInputSchema\)/);
    expect(routes).toMatch(/appointmentController\.setAvailability/);
    expect(routes).not.toMatch(/validateRequest\(BookAppointmentInputSchema\)/);
    const ctrl = read('services/appointment/src/controllers/appointment.controller.ts');
    expect(ctrl).toMatch(/export const setAvailability/);
    expect(ctrl).toMatch(/providerId_dayOfWeek/);
  });

  it('maps serializable booking conflicts to an explicit retryable 409', () => {
    const ctrl = read('services/appointment/src/controllers/appointment.controller.ts');
    const create = ctrl.slice(
      ctrl.indexOf('export const createAppointment'),
      ctrl.indexOf('export const getAppointments')
    );
    expect(create).toMatch(/isSlotConflictError/);
    expect(create).toMatch(/APPOINTMENT_CONFLICT/);
    // The mapper itself covers serializable conflicts + the exclusion guard.
    expect(read('services/appointment/src/controllers/appointment.controller.ts')).toMatch(/P2034/);
  });
});

describe('Analytics: hospital tenant isolation', () => {
  it('hospital admins are confined to their hospital (no platform-wide reads)', () => {
    const src = read('services/analytics/src/controllers/analytics.controller.ts');
    expect(src).toMatch(/resolveScope/);
    expect(src).toMatch(/PLATFORM_ADMIN|SUPER_ADMIN.*platform|scope.*hospitalId/s);
    expect(src).not.toMatch(/prisma\.appointment\.findMany\(\{\s*select/s);
    expect(src).not.toMatch(/prisma\.user\.findMany\(\{\s*select:\s*\{\s*role/s);
  });
});

describe('Appointments: timezone-safe slot math', () => {
  it('evaluates windows/days in UTC (never server-local time)', () => {
    const src = read('services/appointment/src/controllers/appointment.controller.ts');
    expect(src).toMatch(/getUTCHours/);
    expect(src).toMatch(/getUTCMinutes/);
    expect(src).toMatch(/getUTCDay/);
    expect(src).toMatch(/setUTCHours/);
    expect(src).not.toMatch(/\.getHours\(\)/);
    expect(src).not.toMatch(/\.getMinutes\(\)/);
    expect(src).not.toMatch(/\.getDay\(\)/);
    expect(src).not.toMatch(/\.setHours\(/);
    expect(src).not.toMatch(/\.setMinutes\(/);
  });
});

describe('Appointments: overlapping bookings', () => {
  it('booking checks interval overlap inside a serializable transaction', () => {
    const ctrl = read('services/appointment/src/controllers/appointment.controller.ts');
    expect(ctrl).toMatch(/slotStart < aptEnd && slotEnd > aptStart/);
    expect(ctrl).toMatch(/isolationLevel:\s*'Serializable'/);
  });
});

describe('Rewards: redemption isolation', () => {
  it('redeem requests serializable isolation on the transaction (not just a comment)', () => {
    const src = read('services/rewards/src/controllers/rewards.controller.ts');
    expect(src).toMatch(/isolationLevel:\s*'Serializable'/);
  });

  it('makes redemption retries idempotent at the HTTP boundary', () => {
    const routes = read('services/rewards/src/routes/rewards.routes.ts');
    expect(routes).toMatch(/router\.post\('\/redeem',\s*idempotency\(prisma\)/);
    expect(routes).toMatch(/router\.post\('\/claim',\s*idempotency\(prisma\)/);
  });
});

describe('Notifications: payment webhook parity', () => {
  it('internal payment handlers accept the flat {paymentId,userId,…} payload', () => {
    const src = read('services/notification/src/controllers/internal.controller.ts');
    expect(src).toMatch(/normalizePaymentPayload/);
    expect(src).toMatch(/paymentId/);
    // No nested-only destructuring that rejects the payment-service shape.
    expect(src).not.toMatch(/const \{\s*payment,\s*user\s*\} = req\.body/);
  });
});

describe('Notifications: workers really deliver', () => {
  it('email/SMS workers call providers (no sleep-and-log fake "sent")', () => {
    const processors = read('packages/shared/src/jobs/processors.ts');
    expect(processors).not.toMatch(/setTimeout\(resolve/);
    expect(processors).toMatch(/api\.sendgrid\.com/);
    expect(processors).toMatch(/Messages\.json/);
  });
});

describe('Internal service authentication', () => {
  it('has no hard-coded or JWT-secret fallback for internal endpoints', () => {
    for (const file of [
      'services/rewards/src/routes/rewards.routes.ts',
      'services/notification/src/routes/internal.routes.ts',
      'services/payment/src/controllers/payment.controller.ts',
    ]) {
      const src = read(file);
      expect(src).not.toMatch(/ricton-internal-service-key/);
      expect(src).not.toMatch(/INTERNAL_API_SECRET\s*\|\|\s*process\.env\.JWT_SECRET/);
    }
  });
});

describe('Authentication identifier and recovery safety', () => {
  it('requires exactly one email-or-phone identifier on ambiguous sign-in and recovery inputs', () => {
    const schema = read('packages/shared/src/schemas/auth.schema.ts');
    expect(schema).toMatch(/hasExactlyOneIdentifier/);
    for (const schemaName of [
      'LoginInputSchema',
      'SendOtpInputSchema',
      'VerifyOtpInputSchema',
      'PasswordResetInputSchema',
    ]) {
      const start = schema.indexOf(`export const ${schemaName}`);
      const next = schema.indexOf('export const ', start + 20);
      const definition = schema.slice(start, next === -1 ? undefined : next);
      expect(definition).toMatch(/hasExactlyOneIdentifier/);
    }
  });

  it('allows registration to capture both verified-contact candidates while requiring at least one', () => {
    const schema = read('packages/shared/src/schemas/auth.schema.ts');
    const start = schema.indexOf('export const RegisterInputSchema');
    const next = schema.indexOf('export const ', start + 20);
    const definition = schema.slice(start, next);
    expect(definition).toMatch(/hasAtLeastOneIdentifier/);
    expect(definition).not.toMatch(/hasExactlyOneIdentifier/);
  });

  it('fails password recovery closed before lookup when its delivery provider is unavailable', () => {
    const controller = read('services/auth/src/controllers/auth.controller.ts');
    const forgot = controller.slice(
      controller.indexOf('export const passwordForgot'),
      controller.indexOf('export const passwordReset')
    );
    expect(forgot).toMatch(/SERVICE_NOT_CONFIGURED/);
    expect(forgot.indexOf('SERVICE_NOT_CONFIGURED')).toBeLessThan(
      forgot.indexOf('prisma.user.findFirst')
    );
  });
});

describe('Object storage: no mock production credentials', () => {
  it('uses the AWS credential provider chain unless an explicit key pair is supplied', () => {
    const src = read('services/user/src/config/s3.ts');
    expect(src).not.toMatch(/mock-access-key|mock-secret-key/);
    expect(src).toMatch(/credentials/);
  });

  it('fails closed when no avatar bucket is configured', () => {
    const src = read('services/user/src/controllers/user.controller.ts');
    const uploadFn = src.slice(src.indexOf('export const getAvatarUploadUrl'));
    expect(uploadFn).toMatch(/S3_BUCKET_NAME/);
    expect(uploadFn).toMatch(/SERVICE_NOT_CONFIGURED|not configured/i);
  });
});

describe('Admin hospitals: validated request maps to the real Prisma model', () => {
  it('does not pass non-model city/state/country keys directly to Prisma', () => {
    const src = read('services/admin/src/controllers/admin.controller.ts');
    const createFn = src.slice(
      src.indexOf('export const createHospital'),
      src.indexOf('export const getHospitalById')
    );
    expect(createFn).not.toMatch(/data:\s*hospitalData/);
    expect(createFn).toMatch(/address:[\s\S]{0,160}city[\s\S]{0,160}state[\s\S]{0,160}country/);
  });
});

describe('Pharmacy inventory tenant isolation', () => {
  it('exposes authenticated inventory routes scoped to the pharmacist user id', () => {
    const routes = read('services/pharmacy/src/routes/pharmacy.routes.ts');
    const controller = read('services/pharmacy/src/controllers/pharmacy.controller.ts');
    expect(routes).toMatch(/\/inventory/);
    expect(controller).toMatch(/export const getInventory/);
    const inventoryFn = controller.slice(controller.indexOf('export const getInventory'));
    expect(inventoryFn).toMatch(/pharmacyId:\s*userPayload\.userId/);
  });
});

describe('Large-account query bounds', () => {
  it('bounds high-growth history and directory reads', () => {
    for (const [file, functionName] of [
      ['services/prescription/src/controllers/prescription.controller.ts', 'listPrescriptions'],
      ['services/telemedicine/src/controllers/telemedicine.controller.ts', 'listRooms'],
      ['services/payment/src/controllers/payment.controller.ts', 'getPayments'],
      ['services/admin/src/controllers/admin.controller.ts', 'listHospitals'],
      ['services/auth/src/controllers/auth.controller.ts', 'getSessions'],
    ] as const) {
      const src = read(file);
      const start = src.indexOf(`export const ${functionName}`);
      const next = src.indexOf('export const ', start + 20);
      const implementation = src.slice(start, next === -1 ? undefined : next);
      expect(implementation).toMatch(/take[,:]/);
    }
  });

  it('applies both analytics time bounds and paginates provider results with an exact total', () => {
    const analytics = read('services/analytics/src/controllers/analytics.controller.ts');
    const timeRange = read('services/analytics/src/time-range.ts');
    expect(timeRange).toMatch(/from[\s\S]*to[\s\S]*gte[\s\S]*lte/);
    expect(analytics).toMatch(/parseAnalyticsTimeWindow/);
    expect(analytics).toMatch(/prisma\.user\.count\(\{ where: providerWhere \}\)/);
    expect(analytics).toMatch(/skip:\s*offset/);
    expect(analytics).toMatch(/take:\s*limit/);
  });

  it('keeps hospital and pharmacy analytics tenant-scoped', () => {
    const analytics = read('services/analytics/src/controllers/analytics.controller.ts');
    expect(analytics).toMatch(/prisma\.hospital\.count\(\)/);
    expect(analytics).not.toMatch(/totalHospitals[\s\S]{0,300}role:\s*'HOSPITAL_ADMIN'/);
    expect(analytics).toMatch(/pharmacyUserWhere/);
    expect(analytics).toMatch(/pharmacy:\s*\{ hospitalId \}/);
  });
});

describe('Pharmacy prescription and commerce contracts', () => {
  it('bounds the active-pharmacy directory query', () => {
    const src = read('services/pharmacy/src/controllers/pharmacy.controller.ts');
    const pharmacies = src.slice(
      src.indexOf('export const getPharmacies'),
      src.indexOf('export const updateProduct')
    );
    expect(pharmacies).toMatch(/take[,:]/);
  });

  it('keeps shared and service order schemas aligned with the Prisma model', () => {
    for (const file of [
      'packages/shared/src/schemas/pharmacy.schema.ts',
      'services/pharmacy/src/schemas/pharmacy.schema.ts',
    ]) {
      const src = read(file);
      expect(src).toMatch(/patientId/);
      expect(src).not.toMatch(/userId/);
      expect(src).toMatch(/PLACED/);
      expect(src).toMatch(/PREPARING/);
      expect(src).toMatch(/READY_FOR_PICKUP/);
      expect(src).toMatch(/OUT_FOR_DELIVERY/);
      expect(src).not.toMatch(/HOME_DELIVERY|PROCESSING|SHIPPED/);
      expect(src).toMatch(/prescriptionId/);
      expect(src).toMatch(/requiresPrescription/);
    }
  });

  it('models and migrates prescription-required products', () => {
    expect(read('packages/db/prisma/schema.prisma')).toMatch(
      /model Product[\s\S]*requiresPrescription\s+Boolean/
    );
    const migrationRoot = path.join(root, 'packages/db/prisma/migrations');
    const migrations = fs
      .readdirSync(migrationRoot)
      .map((directory) => path.join(migrationRoot, directory, 'migration.sql'))
      .filter((file) => fs.existsSync(file))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    expect(migrations).toMatch(/requiresPrescription/);
  });

  it('rejects direct purchase of prescription products without an assigned prescription', () => {
    const src = read('services/pharmacy/src/controllers/pharmacy.controller.ts');
    const createOrder = src.slice(
      src.indexOf('export const createOrder'),
      src.indexOf('export const getOrders')
    );
    expect(createOrder).toMatch(/requiresPrescription/);
    expect(createOrder).toMatch(/prescriptionId/);
    expect(createOrder).toMatch(/patientId:\s*userPayload\.userId/);
    expect(createOrder).toMatch(/SENT_TO_PHARMACY/);
  });

  it('fulfills assigned prescriptions with priced items and stock mutations, never zero-value empty orders', () => {
    const src = read('services/pharmacy/src/controllers/pharmacy.controller.ts');
    const fulfill = src.slice(src.indexOf('export const fulfillPrescription'));
    expect(fulfill).toMatch(/prescription\.pharmacyId/);
    expect(fulfill).toMatch(/OrderStatus\.PLACED/);
    expect(fulfill).toMatch(/items:\s*\{/);
    expect(fulfill).toMatch(/stock:\s*\{\s*decrement/);
    expect(fulfill).toMatch(/PrescriptionStatus\.DISPENSED/);
    expect(fulfill).not.toMatch(/totalAmount:\s*0/);
  });

  it('lets only the patient assign a signed prescription to one pharmacy', () => {
    const routes = read('services/prescription/src/routes/prescription.routes.ts');
    const controller = read('services/prescription/src/controllers/prescription.controller.ts');
    expect(routes).toMatch(/send-to-pharmacy/);
    expect(controller).toMatch(/export const sendPrescriptionToPharmacy/);
    const send = controller.slice(controller.indexOf('export const sendPrescriptionToPharmacy'));
    expect(send).toMatch(/UserRole\.PATIENT/);
    expect(send).toMatch(/PrescriptionStatus\.SIGNED/);
    expect(send).toMatch(/pharmacyId/);
  });
});
