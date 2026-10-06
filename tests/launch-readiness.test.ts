/**
 * Launch-readiness audit guards (TDD RED->GREEN).
 * Static + unit: no Docker/DB. Encodes Ricton-launch-readiness-audit P0/P1/P2.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

// P0: image-build pipeline passes Google IDs into the actual build step
describe('P0 image build pipeline', () => {
  it('passes Google/Apple client IDs into build-and-push-ecr step', () => {
    const wf = read('.github/workflows/deploy-aws-ecr.yml');
    const buildStep = wf.split('Build & Push All Microservices')[1] || '';
    expect(buildStep).toMatch(/NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
    expect(buildStep).toMatch(/GOOGLE_CLIENT_ID/);
  });
  it('mobile typecheck runs via workspace script (TS6)', () => {
    const wf = read('.github/workflows/deploy-aws-ecr.yml');
    expect(wf).toMatch(/npm -w apps\/mobile run typecheck/);
    expect(wf).not.toMatch(/npx tsc --noEmit -p apps\/mobile\/tsconfig\.json/);
    // legacy buggy command must not remain
    expect(wf).not.toMatch(/npx tsc -p apps\/mobile\/tsconfig\.json/);
  });
  it('web Dockerfile generates the Prisma client before next build', () => {
    const dockerfile = read('apps/web/Dockerfile');
    const genIdx = dockerfile.search(/prisma generate|generate --workspace=@ricton\/db/);
    const buildIdx = dockerfile.search(/npm --workspace=web run build/);
    expect(genIdx).toBeGreaterThanOrEqual(0);
    expect(buildIdx).toBeGreaterThan(genIdx);
  });
});

// P0: single delivery worker owns credentials
describe('P0 delivery workers', () => {
  const compose = () => read('docker-compose.prod.yml');
  it('worker has SendGrid/Twilio/FRONTEND_URL credentials', () => {
    const src = compose();
    const workerBlock = src.split('worker:')[1].split('auth-service:')[0];
    for (const k of [
      'SENDGRID_API_KEY',
      'SENDGRID_FROM_EMAIL',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'TWILIO_PHONE_NUMBER',
      'FRONTEND_URL',
    ]) {
      expect(workerBlock).toMatch(new RegExp(k));
    }
  });
  it('notification-service does not duplicate delivery ownership', () => {
    const src = compose();
    const notifBlock = src.split('notification-service:')[1].split('smartguard-service:')[0];
    expect(notifBlock).toMatch(/START_WORKERS:\s*'false'/);
    // must not carry delivery creds that imply dual ownership
    expect(notifBlock).not.toMatch(/SENDGRID_API_KEY/);
  });
});

// P0: canonical slot path + schema
describe('P0 appointment slots contract', () => {
  it('query schema does not require providerId in query (path param supported)', () => {
    const schema = read('packages/shared/src/schemas/appointment.schema.ts');
    // providerId must be optional so ?date= alone validates for /slots/:providerId
    expect(schema).toMatch(/providerId: z\.string\(\).uuid\(\).optional\(\)/);
  });
  it('routes serve both /slots (query) and /slots/:providerId (path)', () => {
    const routes = read('services/appointment/src/routes/appointment.routes.ts');
    expect(routes).toMatch(/router\.get\(\s*'\/slots'/);
    expect(routes).toMatch(/router\.get\(\s*'\/slots\/:providerId'/);
  });
  it('controller merges path + query and resolves profileId->userId', () => {
    const ctrl = read('services/appointment/src/controllers/appointment.controller.ts');
    expect(ctrl).toMatch(
      /req\.params\.providerId.*req\.query\.providerId|req\.query\.providerId.*req\.params\.providerId/
    );
    expect(ctrl).toMatch(/providerProfile\.findFirst/);
  });
  it('web client uses path shape with ?date=', () => {
    const web = read('apps/web/src/app/providers/[id]/page.tsx');
    expect(web).toMatch(/\/appointments\/slots\/.*\?date=/);
  });
});

// P0: mobile provider discovery
describe('P0 mobile provider discovery', () => {
  it('backend accepts both name and search', () => {
    const schema = read('packages/shared/src/schemas/user.schema.ts');
    expect(schema).toMatch(/name:.*optional/);
    expect(schema).toMatch(/search:.*optional/);
    const ctrl = read('services/user/src/controllers/user.controller.ts');
    expect(ctrl).toMatch(/name \|\| search/);
  });
  it('mobile listProviders sends canonical name param', () => {
    const svc = read('apps/mobile/src/features/booking/booking-service.ts');
    expect(svc).toMatch(/params\.set\('name'/);
  });
  it('mobile normalizes flat ProviderProfile using userId for booking', () => {
    const screen = read('apps/mobile/app/(app)/booking/index.tsx');
    expect(screen).toMatch(/raw\.userId \|\| raw\.id/);
    expect(screen).toMatch(/profileId:\s*raw\.id/);
  });
  it('mobile slot detail handles backend {data} envelope', () => {
    const detail = read('apps/mobile/app/(app)/booking/[providerId].tsx');
    expect(detail).toMatch(/result\.data|data.*slots|Array\.isArray\(.*data/);
  });
});

// P1: PENDING gate
describe('P1 PENDING access gate', () => {
  it('requireActiveStatus rejects non-ACTIVE', () => {
    const mw = read('packages/auth-middleware/src/index.ts');
    expect(mw).toMatch(/requireActiveStatus/);
    expect(mw).toMatch(/status !==.*ACTIVE/);
  });
  it('booking POST requires verified ACTIVE patient', () => {
    const routes = read('services/appointment/src/routes/appointment.routes.ts');
    const postBlock = routes.split("router.post(\n  '/'")[1] || routes;
    expect(postBlock).toMatch(/requireActiveStatus/);
    expect(postBlock).toMatch(/requireRole\('PATIENT'\)/);
  });
});

// P1: patient dashboard
describe('P1 patient dashboard', () => {
  it('patient dashboard route exists with PATIENT role', () => {
    const routes = read('services/user/src/routes/user.routes.ts');
    expect(routes).toMatch(/\/dashboard\/patient/);
    expect(routes).toMatch(/requireRole\('PATIENT'\)/);
  });
  it('web dashboard maps {appointments} envelope (not bare array)', () => {
    const dash = read('apps/web/src/app/dashboard/page.tsx');
    expect(dash).toMatch(/apptRes\.data\?\.appointments|data\.appointments/);
  });
  it('profile completion uses avatarUrl, not email-as-photo', () => {
    const dash = read('apps/web/src/app/dashboard/page.tsx');
    expect(dash).toMatch(/hasAvatar/);
    // must not count email as photo
    const completionFn = dash.split('computeProfileCompletion')[1].split('buildMonthlyChart')[0];
    expect(completionFn).not.toMatch(/email/);
  });
});

// P1: subscription renewal + success page
describe('P1 subscription renewal', () => {
  it('success page exists and verifies server-side', () => {
    expect(fs.existsSync(path.join(root, 'apps/web/src/app/subscription/success/page.tsx'))).toBe(
      true
    );
    const page = read('apps/web/src/app/subscription/success/page.tsx');
    expect(page).toMatch(/\/payments\/verify|\/subscriptions\/my/);
  });
  it('renewal callback derives from FRONTEND_URL helper (no silent localhost in prod)', () => {
    const src = read('packages/shared/src/jobs/renewals.ts');
    expect(src).toMatch(/FRONTEND_URL/);
    expect(src).toMatch(/getRenewalCallbackUrl|callbackUrl/);
  });
  it('renewal worker receives FRONTEND_URL', () => {
    const compose = read('docker-compose.prod.yml');
    const workerBlock = compose.split('worker:')[1].split('auth-service:')[0];
    expect(workerBlock).toMatch(/FRONTEND_URL/);
    const subBlock = compose.split('subscription-service:')[1].split('admin-service:')[0];
    expect(subBlock).toMatch(/FRONTEND_URL/);
  });
});

// P1: provider availability provisioning
describe('P1 provider availability', () => {
  it('registration auto-provisions weekly availability', () => {
    const auth = read('services/auth/src/controllers/auth.controller.ts');
    expect(auth).toMatch(/providerAvailability\.createMany/);
  });
  it('web exposes availability setup calling POST /appointments/availability', () => {
    // availability page or component must exist and call the endpoint
    const candidates = [
      'apps/web/src/app/availability/page.tsx',
      'apps/web/src/app/dashboard/availability/page.tsx',
      'apps/web/src/components/AvailabilityEditor.tsx',
    ];
    const exists = candidates.some((c) => fs.existsSync(path.join(root, c)));
    expect(exists).toBe(true);
    const hit = candidates
      .filter((c) => fs.existsSync(path.join(root, c)))
      .map((c) => read(c))
      .join('\n');
    expect(hit).toMatch(/\/appointments\/availability/);
  });
});

// P1: mobile video + appointments linkage
describe('P1 mobile video lifecycle', () => {
  it('calls backend join after RTC connect', () => {
    const screen = read('apps/mobile/app/(app)/telemedicine/[roomId].tsx');
    expect(screen).toMatch(/videoClient\.connect/);
    expect(screen).toMatch(/telemedicineService\.join/);
  });
  it('active phase renders call UI (not bare text notice)', () => {
    const screen = read('apps/mobile/app/(app)/telemedicine/[roomId].tsx');
    // must reference remote/local video or mic/camera controls
    expect(screen).toMatch(/Video|mic|camera|Mute|Camera|participants|remote/i);
  });
  it('appointment cards link to video room', () => {
    const appts = read('apps/mobile/app/(app)/(tabs)/appointments.tsx');
    expect(appts).toMatch(/telemedicine\/\[roomId\]|Join Video/);
  });
  it('booking success language is pending, not confirmed', () => {
    const detail = read('apps/mobile/app/(app)/booking/[providerId].tsx');
    expect(detail).toMatch(/awaiting provider confirmation|Booking requested/i);
    expect(detail).not.toMatch(/Booking confirmed/);
  });
});

// P2: UX + marketing
describe('P2 launch quality', () => {
  it('web providers page separates error from empty', () => {
    const page = read('apps/web/src/app/providers/page.tsx');
    expect(page).toMatch(/error|failed|could not be loaded|Try again/i);
  });
  it('mobile home isolates wallet failure from appointments', () => {
    const home = read('apps/mobile/app/(app)/(tabs)/index.tsx');
    expect(home).toMatch(/allSettled/);
  });
  it('landing stats are goals with disclaimer, not hard claims', () => {
    const landing = read('apps/web/src/app/page.tsx');
    expect(landing).toMatch(/goal|target|Illustrative/i);
    expect(landing).not.toMatch(/10,000\+.*providers/i);
  });
  it('emergency dispatch links to a specific anchor, not generic services', () => {
    const landing = read('apps/web/src/app/page.tsx');
    const emergencyLink = landing.match(/<Link[^>]+href="([^"]+)"[^>]*>\s*Emergency Dispatch/);
    expect(emergencyLink?.[1]).toBeTruthy();
    expect(emergencyLink?.[1]).not.toBe('/#services');
  });
});

// P0: real-env provisions — every prod compose variable must be documented in
// .env.example with a non-secret placeholder, so staging/prod can be wired
// the moment real provider credentials arrive (no code change needed).
describe('P0 real-env provisions', () => {
  const REQUIRED = [
    'DATABASE_URL',
    'REDIS_URL',
    'REDIS_PASSWORD',
    'JWT_SECRET',
    'REFRESH_SECRET',
    'OTP_SECRET',
    'TOTP_ENCRYPTION_KEY',
    'PAYSTACK_PREFERRED_BANK',
    'MESSAGING_PORT',
    'PHARMACY_PORT',
    'NOTIFICATION_PORT',
    'INTERNAL_API_SECRET',
    'INTERNAL_NOTIFICATION_URL',
    'ALLOWED_ORIGINS',
    'FRONTEND_URL',
    'NEXT_PUBLIC_API_URL',
    'PAYSTACK_SECRET_KEY',
    'PAYSTACK_PUBLIC_KEY',
    'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_IOS_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    'APPLE_CLIENT_ID',
    'APPLE_IOS_BUNDLE_ID',
    'NEXT_PUBLIC_APPLE_CLIENT_ID',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_API_KEY',
    'TWILIO_API_SECRET',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'LIVEKIT_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'TELEMEDICINE_CALLBACK_URL',
    'TELEMEDICINE_JOIN_EARLY_MINUTES',
    'TELEMEDICINE_JOIN_LATE_MINUTES',
    'EXPO_PUBLIC_API_URL',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    'AWS_ACCOUNT_ID',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET_NAME',
    'SENTRY_DSN',
  ];
  it.each(REQUIRED)('.env.example provisions %s', (key) => {
    const example = read('.env.example');
    expect(example).toMatch(new RegExp(`^#?\\s*${key}=`, 'm'));
  });
  it('provisions carry no real secrets (placeholders only)', () => {
    const example = read('.env.example');
    expect(example).not.toMatch(/sk_live_[A-Za-z0-9]{10,}/);
    expect(example).not.toMatch(/SG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
  });
});

describe('production domain wiring', () => {
  it('derives CORS from the frontend origin, not the API host', () => {
    const workflow = read('.github/workflows/deploy-aws-ecr.yml');
    expect(workflow).toMatch(/FRONTEND_ORIGIN="\$\{FRONTEND_URL%\/\}"/);
    expect(workflow).toMatch(/ALLOWED_ORIGINS="\$\{ALLOWED_ORIGINS\},\$\{FRONTEND_ORIGIN\}"/);
    expect(workflow).not.toMatch(
      /ALLOWED_ORIGINS="\$\{ALLOWED_ORIGINS\},https:\/\/\$\{API_DOMAIN\}"/
    );
  });
});
