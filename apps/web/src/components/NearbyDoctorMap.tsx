'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import type { ProviderSummary } from '@/lib/api-contract-mappers';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

interface NearbyDoctorMapProps {
  providers: ProviderSummary[];
  onSelect: (id: string) => void;
}

/**
 * Keyless interactive map of public practice locations.
 *
 * Leaflet renders OpenStreetMap raster tiles directly — no Google/Mapbox key,
 * no third-party tracking key. Only providers that opted into a public
 * practice location are pinned.
 */
export default function NearbyDoctorMap({ providers, onSelect }: NearbyDoctorMapProps) {
  const located = providers.filter(
    (provider) => provider.latitude !== undefined && provider.longitude !== undefined
  );

  if (!located.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-xs font-semibold text-slate-500">
        No public practice locations fall within this area. Try a wider search or browse
        telemedicine doctors.
      </div>
    );
  }

  const center: [number, number] = [located[0].latitude!, located[0].longitude!];

  return (
    <div
      className="relative h-80 overflow-hidden rounded-3xl border border-blue-100"
      role="region"
      aria-label="Map of nearby doctor practice locations"
    >
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
        <FitBounds providers={located} />
        {located.map((provider) => (
          <Marker
            key={provider.id}
            position={[provider.latitude!, provider.longitude!]}
            icon={pinIcon()}
          >
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{provider.name}</p>
                <p className="text-xs font-semibold text-[#1877F2]">{provider.specialty}</p>
                {provider.distanceKm !== undefined ? (
                  <p className="text-xs text-slate-500">{provider.distanceKm} km away</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelect(provider.id)}
                  className="mt-1 rounded-full bg-[#1877F2] px-3 py-1 text-xs font-bold text-white"
                >
                  View profile
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="pointer-events-none absolute bottom-3 left-4 z-[400] text-[10px] font-bold text-slate-500">
        Public clinic locations · Tap a pin for doctor details
      </p>
    </div>
  );
}

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1877F2;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });
}

function FitBounds({ providers }: { providers: ProviderSummary[] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(
      providers.map((provider) => [provider.latitude!, provider.longitude!] as [number, number])
    );
    map.fitBounds(bounds.pad(0.15), { maxZoom: 14 });
  }, [map, providers]);
  return null;
}
