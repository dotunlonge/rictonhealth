import {
  clampRadiusKm,
  haversineKm,
  isValidCoordinatePair,
  isValidLatitude,
  isValidLongitude,
  withDistances,
  withinRadius,
  type GeoPoint,
} from '../src/geo';

describe('geo helpers', () => {
  describe('coordinate validation', () => {
    it('accepts in-range latitude/longitude pairs', () => {
      expect(isValidCoordinatePair(6.5244, 3.3792)).toBe(true);
      expect(isValidCoordinatePair(-90, 180)).toBe(true);
      expect(isValidCoordinatePair(0, 0)).toBe(true);
    });

    it('rejects out-of-range, partial and non-finite values', () => {
      expect(isValidCoordinatePair(91, 0)).toBe(false);
      expect(isValidCoordinatePair(0, -181)).toBe(false);
      expect(isValidCoordinatePair(Number.NaN, 0)).toBe(false);
      expect(isValidCoordinatePair(undefined, 0)).toBe(false);
      expect(isValidCoordinatePair(null, null)).toBe(false);
    });

    it('validates latitude and longitude independently', () => {
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(90.1)).toBe(false);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude('3.3')).toBe(false);
    });
  });

  describe('haversineKm', () => {
    it('returns zero for identical points', () => {
      expect(
        haversineKm({ latitude: 6.5, longitude: 3.3 }, { latitude: 6.5, longitude: 3.3 })
      ).toBe(0);
    });

    it('measures one degree of latitude as ~111 km', () => {
      const km = haversineKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
      expect(km).toBeGreaterThan(110);
      expect(km).toBeLessThan(112);
    });

    it('measures one degree of longitude at the equator as ~111 km', () => {
      const km = haversineKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 });
      expect(km).toBeGreaterThan(110);
      expect(km).toBeLessThan(112);
    });

    it('is symmetric', () => {
      const a: GeoPoint = { latitude: 6.5244, longitude: 3.3792 };
      const b: GeoPoint = { latitude: 9.0765, longitude: 7.3986 };
      expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
    });
  });

  describe('clampRadiusKm', () => {
    it('defaults missing or non-numeric values to 25 km', () => {
      expect(clampRadiusKm(undefined)).toBe(25);
      expect(clampRadiusKm(Number.NaN)).toBe(25);
      expect(clampRadiusKm('not-a-number')).toBe(25);
    });

    it('clamps into the 1–200 km window', () => {
      expect(clampRadiusKm(0)).toBe(1);
      expect(clampRadiusKm(-5)).toBe(1);
      expect(clampRadiusKm(500)).toBe(200);
      expect(clampRadiusKm(25)).toBe(25);
    });
  });

  describe('withDistances', () => {
    const origin: GeoPoint = { latitude: 0, longitude: 0 };

    it('sorts nearest-first and rounds to one decimal', () => {
      const result = withDistances(
        [
          { id: 'far', latitude: 0, longitude: 2 },
          { id: 'near', latitude: 0, longitude: 0.5 },
          { id: 'mid', latitude: 0, longitude: 1 },
        ],
        origin,
        (item) => ({ latitude: item.latitude, longitude: item.longitude })
      );
      expect(result.map((entry) => entry.item.id)).toEqual(['near', 'mid', 'far']);
      expect(result[0].distanceKm).toBe(55.6);
      expect(result[1].distanceKm).toBe(111.2);
    });

    it('drops items without a valid coordinate pair', () => {
      const result = withDistances(
        [
          { id: 'ok', latitude: 0, longitude: 1 },
          { id: 'no-coords' },
          { id: 'out-of-range', latitude: 120, longitude: 0 },
        ],
        origin,
        (item: { id: string; latitude?: number; longitude?: number }) => ({
          latitude: item.latitude,
          longitude: item.longitude,
        })
      );
      expect(result.map((entry) => entry.item.id)).toEqual(['ok']);
    });
  });

  describe('withinRadius', () => {
    it('keeps entries on the inclusive boundary and drops the rest', () => {
      const located = [
        { item: 'on', distanceKm: 10 },
        { item: 'under', distanceKm: 5 },
        { item: 'over', distanceKm: 10.1 },
      ];
      expect(withinRadius(located, 10).map((entry) => entry.item)).toEqual(['on', 'under']);
    });
  });
});
