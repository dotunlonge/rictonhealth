import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Link } from 'expo-router';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, TextField } from '@/components/ui';
import { accountService } from '@/features/account/account-service';
import { useSession } from '@/features/auth/session-provider';
import { spacing, typography } from '@/theme/tokens';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const { user } = useSession();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [invalid, setInvalid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setSaving(true);
    setError(null);
    try {
      await accountService.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen testID="account.profile.screen" style={styles.content}>
      <PatientHeader
        eyebrow="PROFILE"
        title="Personal details"
        subtitle="Only you and your care team see these."
      />
      <TextField
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        testID="account.first-name"
      />
      <TextField
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        testID="account.last-name"
      />
      <TextField
        label="Phone (optional)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        testID="account.phone"
      />
      {invalid ? (
        <Text testID="account.invalid" style={styles.error}>
          First and last name are required.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Save changes"
        loading={saving}
        onPress={() => void save()}
        testID="account.save"
      />
      <Link href="./avatar" testID="account.change-photo">
        Change profile photo
      </Link>
      {saved ? (
        <View testID="account.saved">
          <Text style={styles.saved}>Saved.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  error: { ...typography.caption, color: colors.rose700 },
  saved: { ...typography.bodyStrong, color: colors.emerald700 },
});
