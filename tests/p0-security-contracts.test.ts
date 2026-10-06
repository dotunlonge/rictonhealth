/**
 * G1 Security-freeze regression guards (TDD GREEN).
 * Pure + source-static: no Docker/DB required. Run: npx jest tests/p0-security-contracts.test.ts
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('G1: public role allowlist', () => {
  it('RegisterInputSchema rejects SUPER_ADMIN/HOSPITAL_ADMIN, accepts PATIENT', async () => {
    const { RegisterInputSchema } = await import('../packages/shared/src/schemas/auth.schema');
    expect(
      RegisterInputSchema.safeParse({
        email: 'a@example.com',
        password: 'Password123!',
        role: 'SUPER_ADMIN',
        consentVersion: 'v1',
      }).success
    ).toBe(false);
    expect(
      RegisterInputSchema.safeParse({
        email: 'a@example.com',
        password: 'Password123!',
        role: 'HOSPITAL_ADMIN',
        consentVersion: 'v1',
      }).success
    ).toBe(false);
    expect(
      RegisterInputSchema.safeParse({
        email: 'a@example.com',
        phone: '+2348012345678',
        password: 'Password123!',
        role: 'PATIENT',
        consentVersion: 'v1',
      }).success
    ).toBe(true);
    expect(
      RegisterInputSchema.safeParse({
        password: 'Password123!',
        role: 'PATIENT',
        consentVersion: 'v1',
      }).success
    ).toBe(false);
  });

  it('OAuthInputSchema rejects SUPER_ADMIN/ADMIN, accepts CONSULTANT', async () => {
    const { OAuthInputSchema } = await import('../packages/shared/src/schemas/auth.schema');
    expect(OAuthInputSchema.safeParse({ token: 't', role: 'SUPER_ADMIN' }).success).toBe(false);
    expect(OAuthInputSchema.safeParse({ token: 't', role: 'ADMIN' }).success).toBe(false);
    expect(OAuthInputSchema.safeParse({ token: 't', role: 'CONSULTANT' }).success).toBe(true);
  });

  it('auth controller enforces allowlist; PENDING may authenticate for onboarding', () => {
    const src = read('services/auth/src/controllers/auth.controller.ts');
    expect(src).toMatch(/PUBLIC_REGISTRABLE_ROLES/);
    expect(src).toMatch(/Registration is limited to PATIENT, CONSULTANT, or PHARMACIST/);
    // Disabled accounts are rejected everywhere…
    expect(src).toMatch(/Account is disabled/);
    // …but PENDING is NOT blanket-blocked (onboarding/verification need auth).
    expect(src).not.toMatch(/Account is pending verification/);
    expect(src).not.toMatch(/Account is not active/);
  });

  it('verified contact promotes self-serve roles to ACTIVE; OAuth starts ACTIVE', () => {
    const src = read('services/auth/src/controllers/auth.controller.ts');
    expect(src).toMatch(/activatableRoles/);
    expect(src).toMatch(/shouldActivate/);
    const oauthCreates =
      src.match(/status: UserStatus\.ACTIVE,[\s\S]{0,200}oauthProvider: '(GOOGLE|APPLE)'/g) || [];
    expect(oauthCreates.length).toBeGreaterThanOrEqual(2);
  });

  it('admin service rejects non-ACTIVE tokens even with the right role', () => {
    const routes = read('services/admin/src/routes/admin.routes.ts');
    expect(routes).toMatch(/requireActiveStatus/);
    const mw = read('packages/auth-middleware/src/index.ts');
    expect(mw).toMatch(/export const requireActiveStatus/);
    expect(mw).toMatch(/Account must be active/);
  });
});

describe('G1: secure OTP + encrypted TOTP', () => {
  it('uses crypto.randomInt for OTPs, never Math.random', () => {
    const src = read('services/auth/src/controllers/auth.controller.ts');
    expect(src).toMatch(/crypto\.randomInt\(100000/);
    expect(src).not.toMatch(/Math\.random\(\) \* 900000/);
  });

  it('TOTP secrets encrypt at rest with legacy passthrough', async () => {
    process.env.TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || 'test-totp-key';
    const { generateTotpSecret, encryptTotpSecret, decryptTotpSecret } =
      await import('../packages/shared/src/totp');
    const secret = generateTotpSecret();
    const enc = encryptTotpSecret(secret);
    expect(enc.startsWith('enc:')).toBe(true);
    expect(decryptTotpSecret(enc)).toBe(secret);
    expect(decryptTotpSecret(secret)).toBe(secret); // legacy plaintext rows
  });

  it('settings page never sends TOTP secret to external QR service', () => {
    const src = read('apps/web/src/app/settings/page.tsx');
    expect(src).not.toMatch(/api\.qrserver\.com/);
  });
});

describe('G1: token revocation enforced', () => {
  it('middleware compares tokenVersion with DB/cache (source-static)', () => {
    const src = read('packages/auth-middleware/src/index.ts');
    expect(src).toMatch(/tokenVersion/);
    expect(src).toMatch(/user:tokenVersion/);
    expect(src).toMatch(/Token has been revoked/);
  });

  it('password change / logout-all / reset bump version + evict cache', () => {
    const src = read('services/auth/src/controllers/auth.controller.ts');
    expect(src).toMatch(/tokenVersion: \{ increment: 1 \}/);
    expect(src).toMatch(/user:tokenVersion:\$\{user\.id\}/);
  });

  it('validates password changes with the same strong-password policy as registration', () => {
    const schema = read('packages/shared/src/schemas/auth.schema.ts');
    const routes = read('services/auth/src/routes/auth.routes.ts');
    expect(schema).toMatch(/ChangePasswordInputSchema/);
    expect(routes).toMatch(
      /\/password\/change',\s*requireAuth,\s*validateRequest\(ChangePasswordInputSchema\)/
    );
  });
});

describe('G1: PHI + admin + prescription scoping', () => {
  it('web never persists authenticated user profiles in browser localStorage', () => {
    const store = read('apps/web/src/store/useAppStore.ts');
    const registration = read('apps/web/src/app/(auth)/register/page.tsx');
    const roleSelection = read('apps/web/src/app/(auth)/oauth/select-role/page.tsx');
    const dashboard = read('apps/web/src/app/dashboard/page.tsx');
    const sidebar = read('apps/web/src/components/layout/SidebarLayout.tsx');

    expect(store).not.toMatch(/createJSONStorage|persist\(/);
    expect([registration, roleSelection].join('\n')).not.toMatch(
      /localStorage\.setItem\(['"]ricton_user/
    );
    expect([dashboard, sidebar].join('\n')).not.toMatch(/localStorage\.getItem\(['"]ricton_user/);
  });

  it('keeps OAuth credentials out of navigation URLs and privileged roles out of self-signup', () => {
    const login = read('apps/web/src/app/(auth)/login/page.tsx');
    const roleSelection = read('apps/web/src/app/(auth)/oauth/select-role/page.tsx');
    const oauth = read('apps/web/src/lib/oauth.ts');

    expect(login).not.toMatch(/oauth\/select-role[^`]*token=/);
    expect(roleSelection).not.toMatch(/searchParams\.get\(['"]token['"]\)/);
    expect(oauth).toMatch(/setPendingOAuthRoleSelection/);
    expect(oauth).toMatch(/getPendingOAuthRoleSelection/);

    const roleState = roleSelection.slice(
      roleSelection.indexOf('const [selectedRole'),
      roleSelection.indexOf('const [isLoading')
    );
    expect(roleState).not.toMatch(/HOSPITAL_ADMIN/);
    const roleCards = roleSelection.slice(
      roleSelection.indexOf('const roles'),
      roleSelection.indexOf('return (')
    );
    expect(roleCards).not.toMatch(/HOSPITAL_ADMIN/);
  });

  it('accepts only audience-bound Google credentials for OAuth login', () => {
    const authController = read('services/auth/src/controllers/auth.controller.ts');
    expect(authController).toMatch(/GOOGLE_CLIENT_ID, process\.env\.GOOGLE_IOS_CLIENT_ID/);
    expect(authController).toMatch(
      /verifyIdToken\(\{[\s\S]{0,360}audience:\s*audiences\.length\s*>\s*0\s*\?\s*audiences/
    );
    const tokenInfo = authController.indexOf('oauth2.googleapis.com/tokeninfo');
    const audienceCheck = authController.indexOf('info.aud !== appId');
    const userInfo = authController.indexOf('googleapis.com/oauth2/v3/userinfo');
    expect(tokenInfo).toBeGreaterThanOrEqual(0);
    expect(audienceCheck).toBeGreaterThan(tokenInfo);
    expect(userInfo).toBeGreaterThan(audienceCheck);
    expect(authController).toMatch(/AbortSignal\.timeout/);
    expect(authController).toMatch(/if \(!process\.env\.APPLE_CLIENT_ID\)/);
    expect(authController).toMatch(/audience:\s*process\.env\.APPLE_CLIENT_ID/);
  });

  it('patient list requires clinical roles; detail checks relationship', () => {
    const routes = read('services/user/src/routes/user.routes.ts');
    expect(routes).toMatch(/requireRole\('CONSULTANT', 'HOSPITAL_ADMIN', 'SUPER_ADMIN'\)/);
    const ctrl = read('services/user/src/controllers/user.controller.ts');
    expect(ctrl).toMatch(/No clinical relationship with this patient/);
    expect(ctrl).toMatch(/Hospital scope mismatch/);
    expect(ctrl).not.toMatch(/Ward \$\{|Dr\. Oluwaseun Davies/);
  });

  it('patient list is relationship-scoped for consultants and hospital-scoped for admins', () => {
    const src = read('services/user/src/controllers/user.controller.ts');
    const listFn = src.slice(
      src.indexOf('export const getPatients'),
      src.indexOf('export const getPatientById')
    );
    expect(listFn).toMatch(
      /appointmentsAsPatient:\s*\{\s*some:\s*\{\s*providerId:\s*userPayload\.userId/s
    );
    expect(listFn).toMatch(/hospitalId:\s*adminHospitalId/);
  });

  it('admin never selects passwordHash/twoFactorSecret', () => {
    const src = read('services/admin/src/controllers/admin.controller.ts');
    expect(src).toMatch(/sanitizeAdminUser/);
    // No raw user passthrough: every successResponse wraps sanitized/selected data.
    const raws = src.match(/successResponse\(user\)/g) || [];
    expect(raws.length).toBe(0);
    // The getUserById select block must not include secrets (the strip-list
    // inside sanitizeAdminUser is the only legitimate mention).
    const selectBlocks = src.match(/select:\s*\{[^}]*\}/g) || [];
    for (const b of selectBlocks) {
      expect(b).not.toMatch(/passwordHash|twoFactorSecret/);
    }
  });

  it('prescriptions deny by default + scope pharmacists + require relationship', () => {
    const src = read('services/prescription/src/controllers/prescription.controller.ts');
    expect(src).toMatch(/You are not authorized to list prescriptions/);
    expect(src).toMatch(/Appointment does not establish a provider-patient relationship/);
    expect(src).toMatch(/Prescription is assigned to another pharmacy/);
  });
});
