import { Tabs } from 'expo-router';
import { CalendarDays, ClipboardList, Home, UserRound } from 'lucide-react-native';

import { Screen, StateNotice } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { colors, spacing } from '@/theme/tokens';

export default function PatientTabsLayout() {
  const { user, signOut } = useSession();

  // Explicit staff gate: non-patient roles never reach patient tabs.
  // Shows a friendly card with logout instead of throwing.
  if (user && user.role !== 'PATIENT') {
    return (
      <Screen testID="staff-role-gate">
        <StateNotice
          title="Staff roles use the web dashboard"
          message={`This mobile app is for patients. Signed in as ${user.role} (${user.email ?? 'staff account'}). Please use the Ricton web portal.`}
          actionLabel="Log out"
          onAction={() => void signOut()}
        />
      </Screen>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.blue700,
        tabBarInactiveTintColor: colors.slate600,
        tabBarStyle: {
          minHeight: 66,
          paddingTop: spacing[2],
          paddingBottom: spacing[2],
          borderTopColor: colors.slate200,
          backgroundColor: colors.white,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarButtonTestID: 'navigation.home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarAccessibilityLabel: 'Appointments',
          tabBarButtonTestID: 'navigation.appointments',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Prescriptions',
          tabBarAccessibilityLabel: 'Prescriptions',
          tabBarButtonTestID: 'navigation.prescriptions',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarAccessibilityLabel: 'Account',
          tabBarButtonTestID: 'navigation.account',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
