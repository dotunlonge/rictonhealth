import { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { ApiClientError } from '@/lib/api/client';
import { colors, spacing, typography } from '@/theme/tokens';

type RegisterRole = 'PATIENT' | 'CONSULTANT' | 'PHARMACIST';

export default function RegisterScreen() {
  const { register, verifyOtp } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RegisterRole>('PATIENT');
  const [consent, setConsent] = useState(false);
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
    if (!consent) {
      setError('Please accept the consent to continue.');
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
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
        consentVersion: '1.0',
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
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            testID="auth.register.lastName"
          />
          <TextField
            label="Phone (optional)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            testID="auth.register.phone"
          />
          <View style={styles.roleRow} testID="auth.register.role">
            {(['PATIENT', 'CONSULTANT', 'PHARMACIST'] as const).map((r) => (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ selected: role === r }}
                onPress={() => setRole(r)}
                style={[styles.roleChip, role === r && styles.roleChipActive]}
                testID={`auth.register.role-${r}`}
              >
                <Text style={role === r ? styles.roleTextActive : styles.roleText}>{r}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent((c) => !c)}
            style={styles.consentRow}
            testID="auth.register.consent"
          >
            <Text style={styles.consentBox}>{consent ? '☑' : '☐'}</Text>
            <Text style={styles.consentText}>I consent to processing of my data (v1.0)</Text>
          </Pressable>
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
  roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleChip: {
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipActive: { backgroundColor: colors.blue600, borderColor: colors.blue600 },
  roleText: { ...typography.caption, color: colors.slate600 },
  roleTextActive: { ...typography.caption, color: colors.white },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consentBox: { fontSize: 18 },
  consentText: { ...typography.caption, color: colors.slate600, flex: 1 },
});
