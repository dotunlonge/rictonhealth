/**
 * Pure geospatial helpers for nearby-doctor discovery.
 *
 * Deliberately dependency-free (no Prisma, no PostGIS) so the Haversine math
 * is unit-testable in isolation and behaves identically wherever it is used.
 * The provider directory may grow past the in-memory window one day; until a
 * PostGIS `ST_DWithin` query lands, this keeps the radius semantics honest.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidLatitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

export function isValidCoordinatePair(latitude: unknown, longitude: unknown): latitude is number {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (value: number) => (value * Math.PI) / 180;

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Clamp a caller-supplied search radius into the platform window.
 * Missing/NaN values fall back to the default (25 km).
 */
export function clampRadiusKm(value: unknown, fallback = 25, min = 1, max = 200): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export interface Located<T> {
  item: T;
  distanceKm: number;
}

/**
 * Attach a one-decimal distance to every item that exposes a valid coordinate
 * pair, drop the rest, and sort nearest-first. Pure: callers decide radius
 * filtering and pagination so the helper stays trivially testable.
 */
export function withDistances<T>(
  items: readonly T[],
  origin: GeoPoint,
  getPoint: (item: T) => Partial<GeoPoint> | null | undefined
): Array<Located<T>> {
  const located: Array<Located<T>> = [];
  for (const item of items) {
    const point = getPoint(item);
    if (!point) continue;
    const { latitude, longitude } = point;
    if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) continue;
    located.push({
      item,
      distanceKm: Math.round(haversineKm(origin, { latitude, longitude }) * 10) / 10,
    });
  }
  return located.sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Keep only entries within `radiusKm` of the origin (inclusive). */
export function withinRadius<T>(
  located: readonly Located<T>[],
  radiusKm: number
): Array<Located<T>> {
  return located.filter((entry) => entry.distanceKm <= radiusKm);
}
