(global as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 1,
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// AsyncStorage has no native module under jest; the pay-ref persistence
// layer only needs the key/value surface, so back it with a Map.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  // Test isolation: clears persisted pay-refs between tests.
  (global as Record<string, unknown>).__resetAsyncStorageMock = () => store.clear();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) =>
        Promise.resolve(store.has(key) ? (store.get(key) as string) : null)
      ),
      setItem: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store.clear();
        return Promise.resolve();
      }),
    },
  };
});

// The nearby-doctor map renders inside a WebView. Jest has no native webview,
// so back it with a plain View that keeps the testID + onMessage handler and
// exposes the imperative injectJavaScript bridge the component uses.
jest.mock('react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  // Shared spy so tests can assert the RN→WebView injection bridge.
  const injectJavaScript = jest.fn();
  (global as Record<string, unknown>).__rictonWebViewInject = injectJavaScript;
  const MockWebView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({ injectJavaScript }));
    return React.createElement(View, props, null);
  });
  return { __esModule: true, default: MockWebView };
});

// expo-location has no native module under jest; return a fixed Lagos fix.
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4, Low: 2, Lowest: 1 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 6.5244, longitude: 3.3792 },
  })),
}));

// lucide-react-native ships ESM (.mjs) that jest won't transform; icons are
// presentational, so stub them globally for component tests.
jest.mock('lucide-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_target, name) => {
        if (name === '__esModule') return true;
        return () => React.createElement(React.Fragment);
      },
    }
  );
});
