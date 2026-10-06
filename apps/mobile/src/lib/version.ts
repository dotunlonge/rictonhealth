import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { GATEWAY_PATHS } from '@ricton/api-contract';

import { apiClient } from '@/lib/api/client';

/** #107 Force-update gate: shape served by GET /version (admin service, gateway /api/version). */
export interface VersionGateInfo {
  latest: string;
  minSupported: {
    ios: string;
    android: string;
    web: string;
  };
}

export type MobilePlatform = keyof VersionGateInfo['minSupported'];

/** Base URL already ends with `/api`, so strip the canonical `/api` prefix. */
function rel(canonical: string): string {
  return canonical.replace(/^\/api/, '');
}

/** Simple numeric semver comparison: -1 when a < b, 0 when equal, 1 when a > b. */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parts = (version: string): number[] =>
    version
      .split('+')[0]
      .split('-')[0]
      .split('.')
      .map((segment) => {
        const parsed = parseInt(segment, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      });
  const left = parts(a.trim());
  const right = parts(b.trim());
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    if (l < r) return -1;
    if (l > r) return 1;
  }
  return 0;
}

/** Build version stamped by EAS/app.json (falls back to the 1.0.0 default). */
export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

export function currentPlatform(): MobilePlatform {
  if (Platform.OS === 'android') return 'android';
  if (Platform.OS === 'ios') return 'ios';
  return 'web';
}

/** Unauthenticated — must stay callable pre-login and on stale builds. */
export async function fetchVersionInfo(): Promise<VersionGateInfo> {
  return apiClient.get<VersionGateInfo>(rel(GATEWAY_PATHS.version), {
    authenticated: false,
  });
}

/** True when the running build is older than the platform minimum. */
export function isUpdateRequired(
  current: string,
  info: VersionGateInfo,
  platform: MobilePlatform = currentPlatform()
): boolean {
  return compareSemver(current, info.minSupported[platform]) < 0;
}
