/**
 * Role separation guards (static, no Docker).
 *
 * A signed-in doctor sees "My Patients" — but must never see the patient
 * booking flow (booking other doctors, themselves included), and staff roles
 * must never see patient purchase actions. Backend APIs already gate by role;
 * these guards lock the UI to the same contract.
 */
import fs from 'fs';
import path from 'path';
import { homeForRole, landingForUser, pendingOnboarding } from '../apps/web/src/lib/role-home';

const web = (...parts: string[]) => path.join('apps/web/src', ...parts);
const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('role separation (component-level)', () => {
  it('consultant sidebar offers a schedule, never patient booking entries', () => {
    const sidebar = read(web('components/layout/SidebarLayout.tsx'));
    const consultantBlock = sidebar.slice(
      sidebar.indexOf('CONSULTANT: ['),
      sidebar.indexOf('PHARMACIST: [')
    );
    expect(consultantBlock).not.toMatch(/Find Doctors/);
    expect(consultantBlock).toMatch(/My Schedule/);
  });

  it('appointments page branches: patient books, consultant runs a schedule', () => {
    const page = read(web('app/appointments/page.tsx'));
    // Patient-only booking CTA.
    expect(page).toMatch(/Book New Appointment/);
    // Consultant schedule branch with confirm action, no booking modal.
    expect(page).toMatch(/My clinic schedule/);
    expect(page).toMatch(/CONFIRMED/);
  });

  it('providers directory hides booking for non-patients', () => {
    const page = read(web('app/providers/page.tsx'));
    expect(page).toMatch(/Book Slot/);
    expect(page).toMatch(/PATIENT/);
  });

  it('wallet funding CTA is patient-only', () => {
    const page = read(web('app/wallet/page.tsx'));
    expect(page).toMatch(/Fund Wallet/);
    expect(page).toMatch(/PATIENT/);
  });

  it('pharmacy ordering is patient-only (staff browse read-only)', () => {
    const page = read(web('app/pharmacy/page.tsx'));
    expect(page).toMatch(/Order Now/);
    expect(page).toMatch(/PATIENT/);
  });

  it('availability setup is closed to patients', () => {
    const page = read(web('app/dashboard/availability/page.tsx'));
    expect(page).toMatch(/allowedRoles/);
    expect(page).toMatch(/CONSULTANT/);
    expect(page).not.toMatch(/allowedRoles=\{\[\s*'PATIENT'/);
  });

  it('returning staff land in their workspace, not onboarding', () => {
    expect(
      landingForUser({ role: 'CONSULTANT', providerProfile: { licenseNumber: 'MDCN-1' } })
    ).toBe('/dashboard');
    expect(landingForUser({ role: 'PHARMACIST', pharmacyProfile: { pharmacyName: 'E2E' } })).toBe(
      '/dashboard/pharmacy'
    );
    expect(landingForUser({ role: 'HOSPITAL_ADMIN', hospitalId: 'h-1' })).toBe(
      '/dashboard/hospital'
    );
    expect(landingForUser({ role: 'PATIENT' })).toBe('/dashboard');
    expect(landingForUser({ role: 'SUPER_ADMIN' })).toBe('/admin');
  });

  it('incomplete staff profiles still route to setup', () => {
    // Registration pre-fills specialty, so only the license proves setup.
    expect(
      pendingOnboarding({ role: 'CONSULTANT', providerProfile: { specialty: 'Cardiology' } })
    ).toBe('/onboarding/doctor');
    expect(pendingOnboarding({ role: 'PHARMACIST', pharmacyProfile: null })).toBe(
      '/onboarding/pharmacy'
    );
    expect(pendingOnboarding({ role: 'HOSPITAL_ADMIN', hospitalId: null })).toBe(
      '/onboarding/hospital'
    );
    expect(pendingOnboarding({ role: 'PATIENT' })).toBeNull();
    expect(homeForRole('PHARMACIST')).toBe('/dashboard/pharmacy');
  });

  it('login consults the profile before routing (no unconditional onboarding)', () => {
    const login = read(web('app/(auth)/login/page.tsx'));
    expect(login).toMatch(/landingForUser/);
    expect(login).not.toMatch(/router\.replace\('\/onboarding\/doctor'\)/);
  });

  it('onboarding completion lands on the role home, never the generic dashboard', () => {
    const hospital = read(web('app/onboarding/hospital/page.tsx'));
    const pharmacy = read(web('app/onboarding/pharmacy/page.tsx'));
    expect(hospital).toMatch(/router\.push\('\/dashboard\/hospital'\)/);
    expect(pharmacy).toMatch(/router\.push\('\/dashboard\/pharmacy'\)/);
  });

  it('non-schedule roles never see the appointments oversight table', () => {
    const page = read(web('app/appointments/page.tsx'));
    expect(page).toMatch(/PHARMACIST/);
    expect(page).toMatch(/router\.replace\('\/dashboard\/pharmacy'\)/);
    expect(page).toMatch(/router\.replace\('\/admin'\)/);
  });
});
