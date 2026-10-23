import {
  type ComponentPropsWithoutRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import WebViewComponent from 'react-native-webview';

import {
  buildNearbyMapHtml,
  parseNearbyMapMessage,
  type NearbyMapPayload,
  type NearbyMapProvider,
} from './nearby-map-html';
import { radii } from '@/theme/tokens';

interface NearbyMapWebViewRef {
  injectJavaScript: (js: string) => void;
}

// The installed typings model WebView as a plain FunctionComponent even though
// the runtime component forwards a ref. Cast to the shape we actually use.
const WebView = WebViewComponent as unknown as ForwardRefExoticComponent<
  ComponentPropsWithoutRef<typeof WebViewComponent> & RefAttributes<NearbyMapWebViewRef>
>;

export interface NearbyDoctorMapProps {
  providers: NearbyMapProvider[];
  center?: [number, number];
  radiusKm?: number;
  onSelect: (id: string) => void;
}

/**
 * Keyless interactive nearby-doctor map for mobile.
 *
 * Leaflet + OpenStreetMap tiles run inside a WebView; Leaflet itself is
 * vendored (no CDN, no API/tracking key). Tapping a pin posts a message back
 * to React Native, which routes the patient to the doctor's booking screen.
 */
export default function NearbyDoctorMap({
  providers,
  center,
  radiusKm,
  onSelect,
}: NearbyDoctorMapProps) {
  const html = useRef(buildNearbyMapHtml()).current;
  const webRef = useRef<NearbyMapWebViewRef>(null);
  const payload = JSON.stringify({ providers, center, radiusKm } satisfies NearbyMapPayload);
  const [ready, setReady] = useState(false);

  // The vendored page posts a `ready` message once Leaflet is live; injecting
  // before that would run against a document without `window.RictonMap`.
  useEffect(() => {
    if (!ready) return;
    webRef.current?.injectJavaScript(`window.RictonMap.setProviders(${payload}); true;`);
  }, [ready, payload]);

  return (
    <View
      style={styles.shell}
      accessibilityLabel="Map of nearby doctor practice locations"
      testID="booking.nearby-map-shell"
    >
      <WebView
        ref={webRef}
        testID="booking.nearby-map"
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={styles.webview}
        onMessage={(event) => {
          const message = parseNearbyMapMessage(event.nativeEvent.data);
          if (message?.type === 'ready') setReady(true);
          if (message?.type === 'select' && message.id) onSelect(message.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 320,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FAFC',
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
