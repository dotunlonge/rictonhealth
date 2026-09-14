import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { BrandMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { authService } from '@/features/auth/auth-service';
import { useSession } from '@/features/auth/session-provider';
import { ApiClientError } from '@/lib/api/client';
import { spacing, typography } from '@/theme/tokens';
import { colors } from '@/theme/tokens';

export default function VerifyOtpScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { verifyOtp } = useSession();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verifyOtp({ email: String(email ?? ''), code: code.trim() });
    } catch (caught) {
      setError(
        caught instanceof ApiClientError || caught instanceof Error
          ? caught.message
          : 'Verification failed. Check the code and try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await authService.resendOtp(String(email ?? ''));
      setResent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Code could not be resent.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen keyboardAware testID="auth.verify.screen" style={styles.content}>
      <BrandMark />
      <Text style={styles.title}>Check your inbox</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code sent to {email || 'your email'}.</Text>
      <TextField
        label="Verification code"
        accessibilityLabel="Verification code"
        autoComplete="one-time-code"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setCode}
        placeholder="000000"
        testID="auth.verify.code"
        value={code}
      />
      {error ? (
        <Text testID="auth.verify.error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        label="Verify"
        loading={verifying}
        onPress={() => void submit()}
        testID="auth.verify.submit"
      />
      <PrimaryButton
        label={resent ? 'Code resent' : 'Resend code'}
        loading={resending}
        onPress={() => void resend()}
        testID="auth.verify.resend"
      />
      {resent ? (
        <Text testID="auth.verify.resent" style={styles.ok}>
          A fresh code is on its way.
        </Text>
      ) : null}
      <Link href="/(auth)" testID="auth.verify.back">
        Back to sign in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[8], gap: spacing[5], justifyContent: 'center' },
  title: { ...typography.display, color: colors.navy950 },
  subtitle: { ...typography.body, color: colors.slate600 },
  error: { ...typography.caption, color: colors.rose700 },
  ok: { ...typography.bodyStrong, color: colors.emerald700 },
});
