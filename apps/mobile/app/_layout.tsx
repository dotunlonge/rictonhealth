import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionGate } from '@/features/auth/SessionGate';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { UpdateRequiredCard, useVersionGate } from '@/components/VersionGate';

function RootNavigator() {
  const { status } = useSession();
  // #107 Force-update gate: blocks the whole navigator (auth + app) when the
  // running build is below GET /version minSupported. Fail-open while
  // checking/offline so a down endpoint never bricks the app.
  const { blocked, retry } = useVersionGate();

  if (blocked) return <UpdateRequiredCard onRetry={retry} />;

  if (status === 'booting' || status === 'unavailable') return <SessionGate />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === 'unauthenticated'}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'authenticated'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
