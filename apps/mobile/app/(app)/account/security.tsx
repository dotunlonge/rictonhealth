import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { accountService } from '@/features/account/account-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

export default function SecurityScreen() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const load = useCallback(async () => {
    try {
      const status = await accountService.twoFactorStatus();
      setEnabled(status.twoFactorEnabled);
    } catch {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changePassword = async () => {
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await accountService.changePassword({ currentPassword: current, newPassword: next });
      setPasswordChanged(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password could not be changed.');
    } finally {
      setWorking(false);
    }
  };

  const enable = async () => {
    setWorking(true);
    try {
      const result = await accountService.twoFactorSetup();
      setSecret(result.secret ?? 'setup-started');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '2FA could not be started.');
    } finally {
      setWorking(false);
    }
  };

  const verify = async () => {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setWorking(true);
    try {
      await accountService.twoFactorVerify(code.trim());
      setSecret(null);
      setCode('');
      setEnabled(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Code could not be verified.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen testID="account.security.screen" style={styles.content}>
      <PatientHeader
        eyebrow="SECURITY"
        title="Password and 2FA"
        subtitle="Keep this account yours alone."
      />
      <Text style={styles.section}>Change password</Text>
      <TextField
        label="Current password"
        secureTextEntry
        value={current}
        onChangeText={setCurrent}
        testID="account.current-password"
      />
      <TextField
        label="New password (min 8)"
        secureTextEntry
        value={next}
        onChangeText={setNext}
        testID="account.new-password"
      />
      <TextField
        label="Confirm new password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
        testID="account.confirm-password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Update password"
        loading={working}
        onPress={() => void changePassword()}
        testID="account.change-password"
      />
      {passwordChanged ? (
        <Text testID="account.password-changed" style={styles.ok}>
          Password updated.
        </Text>
      ) : null}
      <Text style={styles.section}>Two-factor authentication</Text>
      {enabled === null ? (
        <ActivityIndicator color={colors.blue600} />
      ) : enabled ? (
        <View testID="account.2fa-on">
          <StateNotice title="2FA is on" message="Authenticator codes protect every sign-in." />
        </View>
      ) : secret ? (
        <View style={styles.stack}>
          <Text testID="account.2fa-secret" style={styles.secret}>
            {secret}
          </Text>
          <TextField
            label="6-digit code"
            accessibilityLabel="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setCode}
            testID="account.2fa-code"
            value={code}
          />
          <PrimaryButton
            label="Verify and turn on"
            loading={working}
            onPress={() => void verify()}
            testID="account.2fa-verify"
          />
        </View>
      ) : (
        <PrimaryButton
          label="Set up 2FA"
          loading={working}
          onPress={() => void enable()}
          testID="account.2fa-enable"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  section: { ...typography.heading, color: colors.navy900 },
  error: { ...typography.caption, color: colors.rose700 },
  ok: { ...typography.bodyStrong, color: colors.emerald700 },
  stack: { gap: spacing[3] },
  secret: {
    ...typography.bodyStrong,
    color: colors.blue700,
    backgroundColor: colors.blue50,
    borderRadius: radii.md,
    padding: spacing[3],
    textAlign: 'center',
  },
});
