/**
 * G2 Frontend↔backend contract guards (TDD RED → GREEN).
 * Static source guards: no browser needed. Run: npx jest tests/frontend-contracts.test.ts
 *
 * Canonical backend mounts (gateway/kong.yml + service index):
 *  messages=/api/messages  wallets=/api/wallets  prescriptions=/api/prescriptions
 *  rewards={GET /balance→{balance}, GET /catalog→{items}, POST /redeem|/claim→{rewardId}}
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const web = (p: string) => read(`apps/web/src/${p}`);

describe('G2: messaging contract', () => {
  it('inbox uses /messages (not /messaging) with participant IDs', () => {
    const src = web('app/inbox/page.tsx');
    expect(src).not.toMatch(/['"]\/messaging\//);
    expect(src).toMatch(/['"]\/messages\//);
    expect(src).toMatch(/participantIds|participant_ids/);
  });
});

describe('G2: wallet contract', () => {
  it('wallet + dashboards use /wallets (not singular /wallet)', () => {
    for (const f of [
      'app/wallet/page.tsx',
      'app/dashboard/page.tsx',
      'app/dashboard/hospital/page.tsx',
      'store/useAppStore.ts',
    ]) {
      const src = web(f);
      const apiCalls = src.match(/api\.(get|post|put|patch|delete)\(['"][^'"]*['"]/g) || [];
      for (const call of apiCalls) {
        expect(`${f} ${call}`).not.toMatch(/['"]\/wallet\//);
      }
    }
    expect(web('app/wallet/page.tsx')).toMatch(/\/wallets\//);
  });

  it('top-up is server-authoritative (no instant local credit)', () => {
    const src = web('app/wallet/page.tsx');
    expect(src).not.toMatch(/balance \+ amount|setBalance\(newBal\)/);
  });
});

describe('G2: prescriptions contract', () => {
  it('uses /prescriptions (not /pharmacy/prescriptions) with server shape', () => {
    const src = web('app/prescriptions/page.tsx');
    expect(src).not.toMatch(/api\.get[^\n]*pharmacy\/prescriptions/);
    expect(src).toMatch(/\/prescriptions/);
    expect(src).not.toMatch(/Math\.random\(\)/); // no synthetic local prescriptions
  });
});

describe('G2: rewards contract', () => {
  it('reads {balance} + {items}, redeems with {rewardId}', () => {
    const src = web('app/rewards/page.tsx');
    expect(src).toMatch(/\.balance\b/);
    expect(src).not.toMatch(/data\?\.points\b.*setBalance|data\?\.catalog\b/);
    expect(src).toMatch(/rewardId/);
    expect(src).not.toMatch(/voucherId/);
  });
});

describe('G2: auth client + logout + route protection', () => {
  it('uses the official Google-rendered button and an ID credential callback', () => {
    const googleButton = web('components/auth/GoogleSignInButton.tsx');
    const oauth = web('lib/oauth.ts');
    const login = web('app/(auth)/login/page.tsx');
    const register = web('app/(auth)/register/page.tsx');

    expect(googleButton).toMatch(/accounts\.id/);
    expect(googleButton).toMatch(/renderButton/);
    expect(googleButton).toMatch(/response\.credential/);
    expect(login).toMatch(/<GoogleSignInButton/);
    expect(register).toMatch(/<GoogleSignInButton/);
    expect(oauth).not.toMatch(/accounts\.id\.prompt|initTokenClient|requestAccessToken/);
  });

  it('turns Google SDK failures into a visible retry instead of an endless loading state', () => {
    const googleButton = web('components/auth/GoogleSignInButton.tsx');
    const oauth = web('lib/oauth.ts');

    expect(googleButton).toMatch(/Retry Google sign-in/);
    expect(googleButton).toMatch(/setFailed\(true\)/);
    expect(oauth).toMatch(/script\.remove\(\)/);
  });

  it('api-client routes via gateway /api (no direct localhost ports)', () => {
    const src = web('lib/api-client.ts');
    expect(src).not.toMatch(/localhost:\$\{targetPort\}|LOCAL_SERVICE_PORTS/);
    expect(src).toMatch(/\/api\//);
  });

  it('api-client has silent refresh queue + timeout + no localStorage tokens', () => {
    const src = web('lib/api-client.ts');
    expect(src).not.toMatch(/localStorage\.(getItem|setItem)\([^)]*(token|refresh)/i);
    expect(src).toMatch(/refresh/i);
    expect(src).toMatch(/AbortController|timeout/i);
  });

  it('logout invalidates the server session (refreshToken) instead of local-only clear', () => {
    const logoutSrc = web('app/(auth)/logout/page.tsx');
    const clientSrc = web('lib/api-client.ts');
    // Page must go through the server-authoritative logout path…
    expect(logoutSrc).toMatch(/api\.logout\(\)|refreshToken/);
    // …whose implementation sends { refreshToken } to /auth/logout.
    expect(clientSrc).toMatch(/\/auth\/logout/);
    expect(clientSrc).toMatch(/refreshToken/);
  });
});

describe('G2: scalable media uploads', () => {
  it('uploads avatars directly to the presigned object-store URL, never into profile JSON', () => {
    const src = web('app/settings/page.tsx');
    expect(src).toMatch(/\/users\/me\/avatar/);
    expect(src).toMatch(/method:\s*['"]PUT['"]/);
    expect(src).toMatch(/body:\s*file/);
    expect(src).not.toMatch(/FileReader|readAsDataURL/);
  });
});

describe('G2: patient records are backend-authoritative', () => {
  it('does not invent wards, beds, clinicians, statuses, or default patient IDs', () => {
    for (const file of [
      'app/patients/page.tsx',
      'app/patients/[id]/page.tsx',
      'app/patients/[id]/medical-history/[historyId]/page.tsx',
    ]) {
      const src = web(file);
      expect(src).not.toMatch(/Dr\. Oluwaseun Davies|Clinical Ward|PT-1001|Ward \$\{|Bed \$\{/);
      expect(src).not.toMatch(/Downloading medical report attachment/);
    }
  });

  it('medical-history detail loads the patient record and selects the requested entry', () => {
    const src = web('app/patients/[id]/medical-history/[historyId]/page.tsx');
    expect(src).toMatch(/api\.get[\s\S]{0,180}`\/users\/patients\/\$\{patientId\}`/);
    expect(src).toMatch(/medicalHistory/);
    expect(src).not.toMatch(/Persistent chest pain|Severe headache|Difficulty breathing at night/);
  });
});

describe('G2: every linked workflow has a wired page', () => {
  it('implements password recovery against the existing forgot/reset endpoints', () => {
    expect(fs.existsSync(path.join(root, 'apps/web/src/app/(auth)/forgot-password/page.tsx'))).toBe(
      true
    );
    const src = web('app/(auth)/forgot-password/page.tsx');
    expect(src).toMatch(/\/auth\/password\/forgot/);
    expect(src).toMatch(/\/auth\/password\/reset/);
  });

  it('implements hospital view/edit and pharmacy product create/edit', () => {
    expect(fs.existsSync(path.join(root, 'apps/web/src/app/admin/hospitals/[id]/page.tsx'))).toBe(
      true
    );
    expect(fs.existsSync(path.join(root, 'apps/web/src/app/pharmacy/products/[id]/page.tsx'))).toBe(
      true
    );

    const hospital = web('app/admin/hospitals/[id]/page.tsx');
    expect(hospital).toMatch(/api\.get[\s\S]{0,120}\/admin\/hospitals\/\$\{id\}/);
    expect(hospital).toMatch(/api\.put[\s\S]{0,120}\/admin\/hospitals\/\$\{id\}/);

    const product = web('app/pharmacy/products/[id]/page.tsx');
    expect(product).toMatch(/\/pharmacy\/products/);
    expect(product).toMatch(/api\.post/);
    expect(product).toMatch(/api\.put/);
  });

  it('does not link pharmacy navigation to nonexistent sales or earnings pages', () => {
    const src = web('app/pharmacy/products/page.tsx');
    expect(src).not.toMatch(/href:\s*['"]\/pharmacy\/(sales|earnings)['"]/);
  });
});

describe('G2: pharmacist inventory and earnings are tenant-authoritative', () => {
  it('management screens use the caller-scoped inventory endpoint', () => {
    expect(web('app/pharmacy/products/page.tsx')).toMatch(/\/pharmacy\/inventory/);
    expect(web('app/pharmacy/products/[id]/page.tsx')).toMatch(/\/pharmacy\/inventory\/\$\{id\}/);
    expect(web('app/dashboard/pharmacy/page.tsx')).toMatch(/\/pharmacy\/inventory/);
  });

  it('dashboard uses real order states and totals with no fabricated amount fallback', () => {
    const src = web('app/dashboard/pharmacy/page.tsx');
    expect(src).not.toMatch(/\|\|\s*4500/);
    expect(src).not.toMatch(/status\s*===\s*['"]PENDING['"]/);
    expect(src).toMatch(/OrderStatus|PLACED|CONFIRMED/);
    expect(src).toMatch(/DELIVERED/);
  });
});

describe('G2: pharmacy storefront does not fabricate clinical or financial data', () => {
  it('renders nullable product fields honestly and sends only server-priced order inputs', () => {
    const src = web('app/pharmacy/page.tsx');
    expect(src).not.toMatch(/Pharmaceutical Product|General Health|Verified pharmaceutical grade/);
    expect(src).not.toMatch(/items:\s*\[\{[^}]*price:/);
    expect(src).not.toMatch(/totalAmount:\s*product\.price/);
    expect(src).toMatch(/requiresPrescription/);
  });

  it('does not allow a prescription-only product through the direct order button', () => {
    const src = web('app/pharmacy/page.tsx');
    expect(src).toMatch(/disabled=\{[^}]*requiresPrescription/);
    expect(src).toMatch(/Send prescription|prescription/i);
  });

  it('wires prescription assignment to the live backend endpoint', () => {
    const src = web('app/prescriptions/page.tsx');
    expect(src).toMatch(/\/prescriptions\/\$\{[^}]+\}\/send-to-pharmacy/);
    expect(src).toMatch(/pharmacyId/);
    expect(src).toMatch(/SIGNED/);
    expect(src).toMatch(/SENT_TO_PHARMACY/);
  });
});

describe('G2: route protection (middleware + no-flash guards)', () => {
  it('Next middleware gates protected routes and admin by role', () => {
    const src = web('../middleware.ts');
    expect(src).toMatch(/export function middleware/);
    expect(src).toMatch(/export const config/);
    expect(src).toMatch(/ricton_session/);
    expect(src).toMatch(/\/admin/);
    expect(src).toMatch(/SUPER_ADMIN/);
  });

  it('api-client maintains middleware-readable session hints (never credentials)', () => {
    const src = web('lib/api-client.ts');
    expect(src).toMatch(/ricton_session/);
    expect(src).toMatch(/ricton_role/);
    expect(src).not.toMatch(/localStorage\.setItem\('ricton_token'/);
    expect(src).not.toMatch(/localStorage\.setItem\('ricton_refresh_token'/);
  });

  it('SidebarLayout never renders protected children before session check', () => {
    const src = web('components/layout/SidebarLayout.tsx');
    expect(src).toMatch(/sessionChecked/);
    expect(src).toMatch(/Verifying session/);
    expect(src).not.toMatch(/if \(!user\) return;/);
  });
});

describe('G2: appointments + admin + onboarding envelopes', () => {
  it('appointments send RFC datetime + IN_PERSON|VIDEO', () => {
    const src = web('app/appointments/page.tsx');
    expect(src).toMatch(/scheduledAt|toISOString/);
    expect(src).toMatch(/IN_PERSON|VIDEO/);
    expect(src).not.toMatch(/General Consultation/);
  });

  it('patients pay consultation fees via provider-hosted checkout (advisory)', () => {
    // Backend prices from consultationFee; the client never sends an amount.
    // Payment marks PAID but never blocks care (cash/offline flows exist).
    const src = web('app/appointments/page.tsx');
    expect(src).toMatch(/\/payments\/initialize/);
    expect(src).toMatch(/APPOINTMENT/);
    expect(src).toMatch(/referenceId/);
    expect(src).toMatch(/authorization_url/);
    expect(src).toMatch(/Paid/);
    expect(src).not.toMatch(/amount:\s*consultationFee/);
  });

  it('patients reschedule through the availability grid, never free text', () => {
    // Reschedule reuses the slot grid (server revalidates window/alignment)
    // and PATCHes the reschedule endpoint with the chosen slot.
    const src = web('app/appointments/page.tsx');
    expect(src).toMatch(/\/reschedule/);
    expect(src).toMatch(/reschedul/i);
  });

  it('patient cancel carries an optional reason to the provider', () => {
    const src = web('app/appointments/page.tsx');
    expect(src).toMatch(/\/cancel/);
    expect(src).toMatch(/reason/);
  });

  it('in-person visits show where to go (hospital name + address)', () => {
    const src = web('app/appointments/page.tsx');
    expect(src).toMatch(/hospitalName|hospitalAddress/);
    expect(src).toMatch(/confirm venue/i);
  });

  it('privileged roles are provisioned by admins, never self-registered', () => {
    const register = web('app/(auth)/register/page.tsx');
    expect(register).not.toMatch(/HOSPITAL_ADMIN/);
    expect(register).not.toMatch(/SUPER_ADMIN/);
    const picker = web('app/(auth)/oauth/select-role/page.tsx');
    expect(picker).not.toMatch(/HOSPITAL_ADMIN/);
    const usersPage = web('app/admin/users/page.tsx');
    expect(usersPage).toMatch(/\/admin\/users/);
    expect(usersPage).toMatch(/HOSPITAL_ADMIN/);
  });

  it('admin verify sends {verified}, hospital create sends city/state/country', () => {
    const src = web('app/admin/page.tsx');
    const providerSrc = web('app/admin/providers/page.tsx');
    expect(src).toMatch(/verified/);
    expect(providerSrc).toMatch(/verified:\s*true/);
    expect(src).toMatch(/city/);
    expect(src).toMatch(/country/);
  });

  it('appointment creation is patient-only at the backend boundary', () => {
    const routes = read('services/appointment/src/routes/appointment.routes.ts');
    const createRoute = routes.slice(routes.indexOf("router.post(\n  '/',"));
    expect(createRoute.slice(0, 500)).toMatch(/requireRole\('PATIENT'\)/);
  });

  it('onboarding persists profile via envelope + no redirect on failure', () => {
    for (const f of [
      'app/onboarding/doctor/page.tsx',
      'app/onboarding/pharmacy/page.tsx',
      'app/onboarding/hospital/page.tsx',
    ]) {
      const src = web(f);
      // Reads the API envelope before deciding…
      expect(`${f}`).not.toEqual('');
      expect(src).toMatch(/res\.success && res\.data/);
      // …and never redirects inside a failure path.
      expect(src).not.toMatch(/catch[\s\S]{0,200}router\.push/);
    }
  });
});

describe('G2: analytics response contracts', () => {
  it('renders the backend field names and trend arrays', () => {
    const src = web('app/admin/analytics/page.tsx');
    expect(src).toMatch(/revenue(?:\?|)\.totalRevenue/);
    expect(src).toMatch(/revenue\?\.trend/);
    expect(src).toMatch(/appointments\?\.trend/);
    expect(src).toMatch(/users\?\.totalUsers/);
    expect(src).toMatch(/providers\?\.providers/);
    expect(src).toMatch(/byStatus\?\.COMPLETED/);
    expect(src).not.toMatch(/revenue\?\.total\b|revenue\?\.data\b/);
    expect(src).not.toMatch(/providers\?\.performers/);
  });
});
