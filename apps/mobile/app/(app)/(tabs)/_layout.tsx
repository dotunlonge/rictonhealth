import { Tabs } from 'expo-router';
import { CalendarDays, ClipboardList, Home, UserRound } from 'lucide-react-native';

import { colors, spacing, typography } from '@/theme/tokens';

export default function PatientTabsLayout() {
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
        tabBarLabelStyle: { ...typography.caption, fontSize: 11 },
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
