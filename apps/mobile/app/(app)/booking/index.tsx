import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { List, MapPin, Map as MapIcon, Navigation } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { Screen, StateNotice, TextField } from '@/components/ui';
import { bookingService } from '@/features/booking/booking-service';
import NearbyDoctorMap from '@/features/nearby/NearbyDoctorMap';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface RawProvider {
  id: string;
  userId?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  specialty?: string | null;
  distanceKm?: number | string | null;
  practiceLatitude?: number | string | null;
  practiceLongitude?: number | string | null;
  providerProfile?: {
    firstName?: string | null;
    lastName?: string | null;
    specialty?: string | null;
    practiceLatitude?: number | string | null;
    practiceLongitude?: number | string | null;
  } | null;
}

interface Provider {
  id: string; // resolved clinician userId for scheduling
  profileId?: string;
  email?: string | null;
  name: string;
  specialty: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
}

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function normalizeProvider(raw: RawProvider): Provider {
  const clinicianUserId = raw.userId || raw.id;
  const firstName = raw.firstName || raw.providerProfile?.firstName || '';
  const lastName = raw.lastName || raw.providerProfile?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const displayName = fullName || raw.email || 'Ricton clinician';
  const specialty = raw.specialty || raw.providerProfile?.specialty || 'General care';
  const latitude = toFiniteNumber(raw.practiceLatitude ?? raw.providerProfile?.practiceLatitude);
  const longitude = toFiniteNumber(raw.practiceLongitude ?? raw.providerProfile?.practiceLongitude);
  const distanceKm = toFiniteNumber(raw.distanceKm);

  return {
    id: clinicianUserId,
    profileId: raw.id,
    email: raw.email,
    name: displayName,
    specialty,
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
    ...(distanceKm !== undefined ? { distanceKm } : {}),
  };
}

// Canonical specialty list — mirrors apps/web/src/lib/specialties.ts.
// Tapping a chip sets the search query, which passes through as the
// `specialty` filter in bookingService.listProviders.
export const SPECIALTIES = [
  'General Practice',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Psychiatry',
  'Orthopedics',
  'Gynecology',
  'Neurology',
  'Ophthalmology',
  'ENT',
] as const;

export const NEARBY_RADIUS_OPTIONS = [5, 10, 25, 50] as const;

export default function DiscoverScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [mapView, setMapView] = useState(false);

  const load = useCallback(
    async (query: string) => {
      setLoading(true);
      setError(null);
      try {
        const q = query.trim() || undefined;
        const result = (await bookingService.listProviders({
          search: q,
          specialty: q,
          limit: 50,
          offset: 0,
          ...(location
            ? { latitude: location.latitude, longitude: location.longitude, radiusKm }
            : {}),
        })) as { providers: RawProvider[] };
        const rawList = Array.isArray(result?.providers) ? result.providers : [];
        setProviders(rawList.map(normalizeProvider));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Providers could not be loaded.');
      } finally {
        setLoading(false);
      }
    },
    [location, radiusKm]
  );

  useEffect(() => {
    const t = setTimeout(() => void load(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, load]);

  const useMyLocation = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location was not shared. You can still search the full directory.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setMapView(true);
    } catch {
      setLocationError('We could not get your location. You can still search the full directory.');
    } finally {
      setLocating(false);
    }
  };

  const locatedProviders = (providers ?? []).filter(
    (provider) => provider.latitude !== undefined && provider.longitude !== undefined
  );
  const showMap = Boolean(location) && mapView && locatedProviders.length > 0;

  return (
    <Screen testID="booking.discover.screen" style={styles.content}>
      <PatientHeader
        eyebrow="FIND CARE"
        title="Book a consultation"
        subtitle="Search verified clinicians by name or specialty."
      />
      <TextField
        label="Search providers"
        accessibilityLabel="Search providers"
        onChangeText={(text) => {
          setSearch(text);
        }}
        placeholder="Name or specialty"
        returnKeyType="search"
        testID="booking.search"
        value={search}
      />
      <View style={styles.chips}>
        {SPECIALTIES.map((specialty) => {
          const active = search === specialty;
          return (
            <Pressable
              key={specialty}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${specialty}`}
              accessibilityState={{ selected: active }}
              onPress={() => setSearch(active ? '' : specialty)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`booking.specialty-${specialty}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{specialty}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={location ? 'Showing doctors near you' : 'Use my location'}
        onPress={() => void useMyLocation()}
        style={[styles.locationButton, location && styles.locationButtonActive]}
        testID="booking.use-location"
      >
        {locating ? (
          <ActivityIndicator color={colors.blue700} size="small" />
        ) : (
          <Navigation color={colors.blue700} size={16} />
        )}
        <Text style={styles.locationButtonText}>
          {location ? 'Showing doctors near you' : 'Use my location'}
        </Text>
      </Pressable>

      {locationError ? (
        <Text testID="booking.location-error" style={styles.locationError}>
          {locationError}
        </Text>
      ) : null}

      {location ? (
        <View style={styles.nearbyBar}>
          <View style={styles.nearbyCopy}>
            <Text style={styles.nearbyTitle}>Doctors within {radiusKm} km</Text>
            <Text style={styles.nearbySubtitle}>
              Public practice locations only · telemedicine available to everyone.
            </Text>
          </View>
          <View style={styles.radiusRow}>
            {NEARBY_RADIUS_OPTIONS.map((option) => {
              const active = option === radiusKm;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Search radius ${option} kilometres`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setRadiusKm(option)}
                  style={[styles.radiusChip, active && styles.chipActive]}
                  testID={`booking.radius-${option}`}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {option} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mapView ? 'Switch to list view' : 'Switch to map view'}
            onPress={() => setMapView((value) => !value)}
            style={styles.viewToggle}
            testID="booking.map-toggle"
          >
            {mapView ? (
              <List color={colors.blue700} size={16} />
            ) : (
              <MapIcon color={colors.blue700} size={16} />
            )}
            <Text style={styles.viewToggleText}>{mapView ? 'List view' : 'Map view'}</Text>
          </Pressable>
        </View>
      ) : null}

      {showMap ? (
        <NearbyDoctorMap
          center={location ? [location.latitude, location.longitude] : undefined}
          providers={locatedProviders.map((provider) => ({
            id: provider.id,
            name: provider.name,
            specialty: provider.specialty,
            latitude: provider.latitude!,
            longitude: provider.longitude!,
            distanceKm: provider.distanceKm,
          }))}
          radiusKm={radiusKm}
          onSelect={(id) => router.push(`./${id}` as const)}
        />
      ) : loading && providers === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Finding clinicians…</Text>
        </View>
      ) : error ? (
        <StateNotice
          title="Providers could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load(search)}
        />
      ) : providers?.length ? (
        <View style={styles.list}>
          {providers.map((provider) => (
            <Pressable
              key={provider.id}
              accessibilityRole="button"
              accessibilityLabel={`Book with ${provider.name}`}
              onPress={() => router.push(`./${provider.id}` as const)}
              style={styles.card}
              testID={`booking.provider-${provider.id}`}
            >
              <View style={styles.icon}>
                <MapPin color={colors.blue700} size={20} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.provider}>{provider.name}</Text>
                <Text style={styles.specialty}>{provider.specialty}</Text>
                {provider.distanceKm !== undefined ? (
                  <Text style={styles.distance}>{provider.distanceKm} km away</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View testID="booking.empty">
          <StateNotice title="No clinicians found" message="Try a different name or specialty." />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
  },
  chipActive: { borderColor: colors.blue600, backgroundColor: colors.blue50 },
  chipText: { ...typography.caption, color: colors.slate600 },
  chipTextActive: { color: colors.blue700 },
  locationButton: {
    ...cardShadow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.blue100,
    borderRadius: radii.md,
    backgroundColor: colors.blue50,
    paddingVertical: spacing[3],
  },
  locationButtonActive: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  locationButtonText: { ...typography.bodyStrong, color: colors.blue700 },
  locationError: { ...typography.caption, color: colors.amber700 },
  nearbyBar: {
    ...cardShadow,
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
  },
  nearbyCopy: { gap: spacing[1] },
  nearbyTitle: { ...typography.bodyStrong, color: colors.navy900 },
  nearbySubtitle: { ...typography.caption, color: colors.slate600 },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  radiusChip: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
  },
  viewToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  viewToggleText: { ...typography.bodyStrong, color: colors.blue700 },
  list: { gap: spacing[3] },
  card: {
    ...cardShadow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: { flex: 1 },
  provider: { ...typography.bodyStrong, color: colors.navy900 },
  specialty: { ...typography.caption, color: colors.slate600 },
  distance: { ...typography.caption, color: colors.emerald700 },
});
