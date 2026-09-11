import { useState } from 'react';
import { Link } from 'expo-router';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { ApiClientError } from '@/lib/api/client';
import { colors, minimumTouchTarget, radii, spacing, typography } from '@/theme/tokens';

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError('Enter your email address and password to continue.');
      return;
    }
    if (needsTwoFactor && totpCode.trim().length !== 6) {
      setError('Enter the six-digit code from your authenticator app.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn({
        email: normalizedEmail,
        password,
        ...(needsTwoFactor ? { totpCode: totpCode.trim() } : {}),
      });
      if (result.kind === 'two-factor-required') setNeedsTwoFactor(true);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError || caught instanceof Error
          ? caught.message
          : 'Sign in could not be completed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen keyboardAware testID="auth.signIn.screen" style={styles.content}>
      <View style={styles.brandRow}>
        <BrandMark />
        <View>
          <Text style={styles.productName}>Ricton Health</Text>
          <Text style={styles.productTagline}>Connected care, clearly delivered</Text>
        </View>
      </View>

      <View style={styles.intro}>
        <Text style={styles.eyebrow}>PATIENT PORTAL</Text>
        <Text style={styles.title}>Sign in to Ricton</Text>
        <Text style={styles.subtitle}>
          Appointments, prescriptions and your care details—protected in one place.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email address"
          accessibilityLabel="Email address"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          readOnly={needsTwoFactor}
          returnKeyType="next"
          testID="auth.signIn.email"
          value={email}
        />
        <TextField
          label="Password"
          accessibilityLabel="Password"
          autoCapitalize="none"
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder="Enter your password"
          readOnly={needsTwoFactor}
          secureTextEntry={!showPassword}
          testID="auth.signIn.password"
          value={password}
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={8}
              onPress={() => setShowPassword((current) => !current)}
              style={styles.iconButton}
            >
              {showPassword ? (
                <EyeOff color={colors.slate600} size={21} />
              ) : (
                <Eye color={colors.slate600} size={21} />
              )}
            </Pressable>
          }
        />

        {needsTwoFactor ? (
          <TextField
            label="Authenticator code"
            accessibilityLabel="Authenticator code"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setTotpCode}
            placeholder="000000"
            testID="auth.signIn.totp"
            value={totpCode}
          />
        ) : null}

        {error ? (
          <View accessibilityRole="alert" style={styles.error} testID="auth.signIn.error">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <PrimaryButton
          accessibilityLabel="Sign in securely"
          disabled={needsTwoFactor && totpCode.length !== 6}
          label={needsTwoFactor ? 'Verify and continue' : 'Sign in securely'}
          loading={submitting}
          onPress={() => void submit()}
          testID="auth.signIn.submit"
        />
      </View>

      <View style={styles.authLinks}>
        <Link href="/(auth)/register" testID="auth.signIn.createAccount">
          Create account
        </Link>
        <Link href="/(auth)/forgot" testID="auth.signIn.forgot">
          Forgot password?
        </Link>
      </View>

      <View style={styles.securityNote}>
        <ShieldCheck color={colors.emerald700} size={20} />
        <Text style={styles.securityText}>
          Your session is encrypted and automatically secured when it expires.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[8], gap: spacing[8], justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  productName: { ...typography.heading, color: colors.navy900 },
  productTagline: { ...typography.caption, color: colors.slate600, marginTop: 2 },
  intro: { gap: spacing[2] },
  eyebrow: { ...typography.caption, color: colors.blue700, letterSpacing: 1.4 },
  title: { ...typography.display, color: colors.navy950 },
  subtitle: { ...typography.body, color: colors.slate600, maxWidth: 460 },
  form: { gap: spacing[5] },
  authLinks: { flexDirection: 'row', justifyContent: 'space-between' },
  iconButton: {
    minWidth: minimumTouchTarget,
    minHeight: minimumTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { borderRadius: radii.md, backgroundColor: colors.rose100, padding: spacing[3] },
  errorText: { ...typography.caption, color: colors.rose700 },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    borderRadius: radii.md,
    backgroundColor: colors.emerald100,
    padding: spacing[4],
  },
  securityText: { ...typography.caption, color: colors.emerald700, flex: 1 },
});
