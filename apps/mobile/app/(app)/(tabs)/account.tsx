import { LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

export default function AccountScreen() {
  const { user, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Ricton patient';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen testID="patient.account.screen" style={styles.content}>
      <PatientHeader eyebrow="PRIVATE PROFILE" title="Account" subtitle="Your identity and session security." />
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>Patient account</Text>
        </View>
        <ShieldCheck color={colors.emerald700} size={22} accessibilityLabel="Secure account" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile details</Text>
        <View style={styles.detailCard}>
          <View style={styles.row}><View style={styles.rowIcon}><Mail color={colors.blue700} size={19} /></View><View style={styles.rowCopy}><Text style={styles.rowLabel}>Email address</Text><Text style={styles.rowValue}>{user?.email || 'Not provided'}</Text></View></View>
          <View style={styles.rule} />
          <View style={styles.row}><View style={styles.rowIcon}><UserRound color={colors.blue700} size={19} /></View><View style={styles.rowCopy}><Text style={styles.rowLabel}>Account status</Text><Text style={styles.rowValue}>{user?.status || 'Active'}</Text></View></View>
        </View>
      </View>

      <View style={styles.securityCard}>
        <ShieldCheck color={colors.navy900} size={22} />
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>Session protection</Text>
          <Text style={styles.securityText}>Signing out removes both secure tokens from this device.</Text>
        </View>
      </View>

      <PrimaryButton
        accessibilityLabel="Sign out of Ricton"
        label="Sign out"
        loading={signingOut}
        onPress={() => void handleSignOut()}
        testID="account.signOut"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[6] },
  profileCard: { ...cardShadow, flexDirection: 'row', alignItems: 'center', gap: spacing[4], borderWidth: 1, borderColor: colors.slate200, borderRadius: radii.lg, backgroundColor: colors.white, padding: spacing[5] },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.navy900, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.title, color: colors.white },
  profileCopy: { flex: 1 },
  name: { ...typography.heading, color: colors.navy950 },
  role: { ...typography.caption, color: colors.slate600 },
  section: { gap: spacing[3] },
  sectionTitle: { ...typography.heading, color: colors.navy900 },
  detailCard: { borderWidth: 1, borderColor: colors.slate200, borderRadius: radii.lg, backgroundColor: colors.white, paddingHorizontal: spacing[4] },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.blue50, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowLabel: { ...typography.caption, color: colors.slate600 },
  rowValue: { ...typography.bodyStrong, color: colors.slate900, textTransform: 'capitalize' },
  rule: { height: 1, backgroundColor: colors.slate100 },
  securityCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], borderRadius: radii.lg, backgroundColor: colors.blue100, padding: spacing[4] },
  securityCopy: { flex: 1 },
  securityTitle: { ...typography.label, color: colors.navy900 },
  securityText: { ...typography.caption, color: colors.slate700, marginTop: spacing[1] },
});
