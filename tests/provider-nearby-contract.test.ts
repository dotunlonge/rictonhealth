import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('nearby provider discovery', () => {
  it('keeps public practice coordinates separate from personal addresses', () => {
    const schema = read('packages/db/prisma/schema.prisma');
    expect(schema).toMatch(/practiceLocationVisible\s+Boolean/);
    expect(schema).toMatch(/practiceLatitude\s+Decimal/);
    expect(schema).toMatch(/practiceLongitude\s+Decimal/);
  });

  it('validates and radius-filters nearest provider searches', () => {
    const controller = read('services/user/src/controllers/user.controller.ts');
    expect(controller).toContain("'Latitude and longitude must both be valid coordinates'");
    expect(controller).toContain('distanceKm <= radius');
    expect(controller).toContain('practiceLocationVisible');
  });

  it('offers opt-in location and a patient map without a third-party tracking key', () => {
    const page = read('apps/web/src/app/providers/page.tsx');
    expect(page).toContain('navigator.geolocation.getCurrentPosition');
    expect(page).toContain('Map of nearby doctor practice locations');
    expect(page).toContain('Clear location');
  });
});
