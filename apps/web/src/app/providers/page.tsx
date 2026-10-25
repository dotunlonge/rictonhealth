'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import {
  Stethoscope,
  Star,
  Clock,
  CheckCircle2,
  User,
  MapPin,
  Navigation,
  List,
  Map as MapIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mapProviderSummary, type ProviderSummary } from '@/lib/api-contract-mappers';
import { SPECIALTIES } from '@/lib/specialties';
import { useCurrentUser } from '@/store/useAppStore';

// Leaflet touches `window`; render it client-side only.
const NearbyDoctorMap = dynamic(() => import('@/components/NearbyDoctorMap'), {
  ssr: false,
  loading: () => (
    <div className="h-80 animate-pulse rounded-3xl border border-blue-100 bg-slate-50" />
  ),
});

export default function ProvidersPage() {
  const router = useRouter();
  const user = useCurrentUser();
  // Provider onboarding is a staff action — patients must never see an
  // "Add / Register Doctor" CTA (it previously routed them into the doctor
  // onboarding flow).
  const canRegisterDoctors = user?.role === 'SUPER_ADMIN' || user?.role === 'HOSPITAL_ADMIN';
  // Booking is a patient action — staff browsing this directory (e.g. a
  // hospital admin reviewing medical staff) must never see a "Book Slot" CTA.
  const canBook = (user?.role ?? 'PATIENT') === 'PATIENT';
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [mapView, setMapView] = useState(true);

  const loadProviders = useCallback(
    async (location = coordinates) => {
      setLoading(true);
      setLoadError(null);
      const query = new URLSearchParams();
      if (location) {
        query.set('latitude', String(location.latitude));
        query.set('longitude', String(location.longitude));
        query.set('radiusKm', String(radiusKm));
      }
      // (Explicit literals: the contract scanner resolves static paths only.)
      const qs = query.toString();
      const res = await api.get(qs ? `/users/providers?${qs}` : '/users/providers');
      if (!res.success) {
        setProviders([]);
        setLoadError(res.error?.message || 'The medical specialist directory could not be loaded.');
        setLoading(false);
        return;
      }
      const rawList = Array.isArray(res.data) ? res.data : res.data?.providers || [];

      setProviders(rawList.map(mapProviderSummary));
      setLoading(false);
    },
    [coordinates, radiusKm]
  );

  useEffect(() => {
    loadProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates?.latitude, coordinates?.longitude, radiusKm]);

  const useMyLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Your browser cannot share a location. You can still browse all doctors.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () =>
        setLocationError(
          'Location was not shared. We have kept the full doctor directory visible.'
        ),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const filteredProviders = providers.filter(
    (p) =>
      selectedSpecialty === 'All' ||
      p.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-[#1877F2]" /> Find Doctors & Medical Specialists
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Book online consultations, view shift availability, and review verified healthcare
              providers
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canBook && (
              <button
                type="button"
                onClick={useMyLocation}
                className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#1877F2] text-xs font-bold rounded-full border border-blue-200 transition-all flex items-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />{' '}
                {coordinates ? 'Nearby doctors' : 'Use my location'}
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Specialty:</span>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
              >
                <option value="All">All Specialties</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {canRegisterDoctors && (
              <button
                onClick={() => router.push('/onboarding/doctor')}
                className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0"
              >
                + Add / Register Doctor
              </button>
            )}
          </div>
        </div>

        {canBook && (
          <section
            className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 flex flex-wrap items-center gap-3"
            aria-label="Nearby doctor search"
          >
            <MapPin className="w-5 h-5 text-[#1877F2]" />
            <div className="min-w-48 flex-1">
              <p className="text-sm font-extrabold text-slate-900">
                {coordinates ? `Doctors within ${radiusKm} km` : 'Search doctors near you'}
              </p>
              <p className="text-xs text-slate-500">
                {coordinates
                  ? 'Showing public clinic and hospital locations only.'
                  : 'Share your location to sort nearby practice locations. Telemedicine remains available to everyone.'}
              </p>
            </div>
            {coordinates && (
              <select
                aria-label="Search radius"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>
            )}
            {coordinates && (
              <button
                type="button"
                onClick={() => setCoordinates(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                Clear location
              </button>
            )}
            {locationError && (
              <p role="status" className="w-full text-xs font-semibold text-amber-700">
                {locationError}
              </p>
            )}
          </section>
        )}

        {/* Doctors Grid */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            Loading verified medical specialists directory...
          </div>
        ) : loadError ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-rose-200/80">
            <Stethoscope className="w-10 h-10 text-rose-300 mx-auto" />
            <p className="text-xs font-bold text-rose-700">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs text-[#1877F2] font-bold hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80">
            <Stethoscope className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              No medical specialists currently registered under this specialty
            </p>
            <button
              type="button"
              onClick={() => setSelectedSpecialty('All')}
              className="text-xs text-[#1877F2] font-bold hover:underline"
            >
              View All Registered Providers
            </button>
          </div>
        ) : (
          <>
            {coordinates && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMapView((value) => !value)}
                  className="text-xs font-bold text-[#1877F2] flex items-center gap-1.5"
                >
                  {mapView ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
                  {mapView ? 'List view' : 'Map view'}
                </button>
              </div>
            )}
            {coordinates && mapView && (
              <NearbyDoctorMap
                providers={filteredProviders}
                onSelect={(id) => router.push(`/providers/${id}`)}
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProviders.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 hover:border-[#1877F2]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1877F2] border border-blue-100 flex items-center justify-center font-bold overflow-hidden shrink-0">
                        {doc.avatarUrl ? (
                          <img
                            src={doc.avatarUrl}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-7 h-7" />
                        )}
                      </div>

                      <div>
                        <h2 className="font-extrabold text-slate-900 text-sm">{doc.name}</h2>
                        <p className="text-xs font-bold text-[#1877F2]">{doc.specialty}</p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {doc.yearsExperience} Years Clinical Experience
                        </p>
                        {doc.distanceKm !== undefined && (
                          <p className="text-[10px] font-bold text-emerald-700 mt-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {doc.distanceKm} km away
                            {doc.practiceCity ? ` · ${doc.practiceCity}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span className="text-xs font-black text-slate-900">
                        {doc.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-600 font-semibold">
                      <Clock className="w-4 h-4 text-[#1877F2]" />
                      <span>View live appointment slots</span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{doc.isVerified ? 'Verified provider' : 'Verification pending'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/providers/${doc.id}`)}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all shadow-xs text-center"
                    >
                      View Doctor Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/telemedicine')}
                      className="flex-1 py-2.5 bg-white hover:bg-slate-50 border border-blue-200 text-[#1877F2] font-bold rounded-2xl text-xs transition-all shadow-xs text-center"
                    >
                      Direct Call
                    </button>
                    {canBook && (
                      <button
                        type="button"
                        onClick={() => router.push(`/appointments?providerId=${doc.id}`)}
                        className="flex-1 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-2xl text-xs transition-all shadow-xs text-center"
                      >
                        Book Slot
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
