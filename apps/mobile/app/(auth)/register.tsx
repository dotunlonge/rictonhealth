import { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { ApiClientError } from '@/lib/api/client';
import { spacing, typography } from '@/theme/tokens';

export default function RegisterScreen() {
  const { register, verifyOtp } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || password.length < 8) {
      setError('Enter a valid email and a password of at least 8 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await register({
        email: email.trim(),
        password,
        firstName: firstName.trim() || undefined,
      });
      if (result.kind === 'verification-required') {
        setVerificationEmail(result.email);
        setMessage(`Check ${result.email} for your verification code.`);
      } else {
        setMessage('Registration complete.');
      }
    } catch (caught) {
      setError(
        caught instanceof ApiClientError || caught instanceof Error
          ? caught.message
          : 'Registration failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitVerification = async () => {
    if (!verificationEmail || otp.trim().length !== 6) {
      setError('Enter the six-digit verification code.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await verifyOtp({ email: verificationEmail, code: otp.trim() });
    } catch (caught) {
      setError(
        caught instanceof ApiClientError || caught instanceof Error
          ? caught.message
          : 'Verification failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen testID="auth.register.screen" style={styles.content}>
      <BrandMark />
      <Text style={styles.title}>Create your patient account</Text>
      {verificationEmail ? (
        <>
          <Text style={styles.instructions}>
            Enter the code sent to {verificationEmail}. It expires in ten minutes.
          </Text>
          <TextField
            label="Verification code"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(value) => setOtp(value.replace(/\D/g, ''))}
            testID="auth.register.otp"
          />
        </>
      ) : (
        <>
          <TextField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            testID="auth.register.firstName"
          />
          <TextField
            label="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            testID="auth.register.email"
          />
          <TextField
            label="Password (min 8)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            testID="auth.register.password"
          />
        </>
      )}
      {error ? (
        <View testID="auth.register.error">
          <Text>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View testID="auth.register.message">
          <Text>{message}</Text>
        </View>
      ) : null}
      <PrimaryButton
        label={verificationEmail ? 'Verify account' : 'Create account'}
        disabled={Boolean(verificationEmail) && otp.length !== 6}
        loading={submitting}
        onPress={() => void (verificationEmail ? submitVerification() : submit())}
        testID="auth.register.submit"
      />
      <Link href="/(auth)" testID="auth.register.haveAccount">
        Already have an account? Sign in
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[8], gap: spacing[5], justifyContent: 'center' },
  title: { ...typography.heading },
  instructions: { ...typography.body },
});
