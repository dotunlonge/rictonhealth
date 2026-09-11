import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { authService } from '@/features/auth/auth-service';
import { ApiClientError } from '@/lib/api/client';
import { spacing, typography } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) {
      setError('Enter your account email.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authService.requestPasswordReset({ email: email.trim() });
      setCodeRequested(true);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError || caught instanceof Error
          ? caught.message
          : 'Request failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async () => {
    if (otp.length !== 6) {
      setError('Enter the six-digit reset code.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authService.confirmPasswordReset({
        email: email.trim(),
        otp,
        newPassword,
      });
      setResetComplete(true);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError || caught instanceof Error
          ? caught.message
          : 'Password reset failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen testID="auth.forgot.screen" style={styles.content}>
      <BrandMark />
      <Text style={styles.title}>Reset your password</Text>
      {resetComplete ? (
        <View testID="auth.forgot.done">
          <Text>Your password has been reset. You can now sign in.</Text>
        </View>
      ) : codeRequested ? (
        <>
          <Text>A six-digit reset code was sent if the account exists.</Text>
          <TextField
            label="Reset code"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(value) => setOtp(value.replace(/\D/g, ''))}
            testID="auth.forgot.otp"
          />
          <TextField
            label="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            testID="auth.forgot.newPassword"
          />
          <TextField
            label="Confirm new password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            testID="auth.forgot.confirmPassword"
          />
          {error ? (
            <View testID="auth.forgot.error">
              <Text>{error}</Text>
            </View>
          ) : null}
          <PrimaryButton
            label="Reset password"
            disabled={otp.length !== 6 || !newPassword || !confirmPassword}
            loading={submitting}
            onPress={() => void resetPassword()}
            testID="auth.forgot.reset"
          />
        </>
      ) : (
        <>
          <TextField
            label="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            testID="auth.forgot.email"
          />
          {error ? (
            <View testID="auth.forgot.error">
              <Text>{error}</Text>
            </View>
          ) : null}
          <PrimaryButton
            label="Send reset code"
            loading={submitting}
            onPress={() => void submit()}
            testID="auth.forgot.submit"
          />
        </>
      )}
      <Link href="/(auth)" testID="auth.forgot.back">
        Back to sign in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[8], gap: spacing[5], justifyContent: 'center' },
  title: { ...typography.heading },
});
