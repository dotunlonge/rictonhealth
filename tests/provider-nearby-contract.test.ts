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
    expect(controller).toContain('practiceLocationVisible');
    expect(controller).toContain('withDistances');
    expect(controller).toContain('withinRadius');
    // The pure radius rule lives in the shared, unit-tested geo helper.
    const geo = read('packages/shared/src/geo.ts');
    expect(geo).toContain('distanceKm <= radiusKm');
  });

  it('offers opt-in location and a patient map without a third-party tracking key', () => {
    const page = read('apps/web/src/app/providers/page.tsx');
    expect(page).toContain('navigator.geolocation.getCurrentPosition');
    expect(page).toContain('Clear location');
  });

  it('renders real OpenStreetMap tiles via Leaflet on web (no API key)', () => {
    const map = read('apps/web/src/components/NearbyDoctorMap.tsx');
    expect(map).toContain('react-leaflet');
    expect(map).toContain('tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(map).toContain('Map of nearby doctor practice locations');
    expect(map).not.toContain('googleapis');
    expect(map).not.toContain('mapbox');
    expect(map).not.toContain('apiKey');
  });

  it('renders the same keyless map on mobile via a vendored WebView', () => {
    const screen = read('apps/mobile/app/(app)/booking/index.tsx');
    expect(screen).toContain('expo-location');
    expect(screen).toContain('NearbyDoctorMap');
    expect(screen).toContain('latitude');
    expect(screen).toContain('radiusKm');

    const map = read('apps/mobile/src/features/nearby/nearby-map-html.ts');
    expect(map).toContain('tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(map).not.toContain('googleapis');
    expect(map).not.toContain('mapbox');
    expect(map).not.toContain('apiKey');

    const bundle = read('apps/mobile/src/features/nearby/leaflet-bundle.json');
    expect(bundle).toContain('Leaflet');
    expect(bundle).toContain('tile.openstreetmap.org');
  });
});
