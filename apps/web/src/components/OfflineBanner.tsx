'use client';

import { useEffect, useState } from 'react';

/**
 * #136 Minimal offline banner: listens to navigator.onLine.
 * Shows "You are offline — actions will retry" bar when offline.
 * Mobile: @react-native-community/netinfo is NOT installed (see
 * apps/mobile/package.json), so mobile keeps AppState-based handling;
 * this web-only banner covers the PWA/desktop path.
 */
export default function OfflineBanner() {
  const [online, setOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine)
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      className="w-full bg-amber-500 text-white text-center text-sm font-semibold px-4 py-2"
    >
      You are offline — actions will retry
    </div>
  );
}
