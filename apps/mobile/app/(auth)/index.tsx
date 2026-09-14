import * as AppleAuthentication from 'expo-apple-authentication';
import { Link } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark, PrimaryButton, Screen, TextField } from '@/components/ui';
import { useSession } from '@/features/auth/session-provider';
import { ApiClientError } from '@/lib/api/client';
import { colors, minimumTouchTarget, radii, spacing, typography } from '@/theme/tokens';

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim();

/**
 * Google button lives in its own component so `useAuthRequest` (which throws
 * without platform client IDs) only ever runs when a client ID is configured.
 */
function GoogleSignInButton({
  busy,
  onError,
  onStart,
  onTwoFactor,
  signInWithProvider,
}: {
  busy: boolean;
  onError: (message: string) => void;
  onStart: () => void;
  onTwoFactor: () => void;
  signInWithProvider: (provider: 'GOOGLE', idToken: string) => Promise<{ kind: string }>;
}) {
  const [request, response, prompt] = Google.useAuthRequest({
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
    ...(GOOGLE_WEB_CLIENT_ID ? { webClientId: GOOGLE_WEB_CLIENT_ID } : {}),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (!idToken) {
        onError('Google did not return an identity token.');
        return;
      }
      onStart();
      void signInWithProvider('GOOGLE', idToken)
        .then((result) => {
          if (result.kind === 'two-factor-required') onTwoFactor();
        })
        .catch((caught: unknown) =>
          onError(caught instanceof Error ? caught.message : 'Google sign-in failed.')
        );
    } else if (response?.type === 'error') {
      onError('Google sign-in was cancelled or failed.');
    }
  }, [response, signInWithProvider, onError, onStart, onTwoFactor]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      disabled={!request || busy}
      onPress={() => prompt()}
      style={styles.socialButton}
      testID="auth.signIn.google"
    >
      <Text style={styles.socialText}>{busy ? 'Connecting…' : 'Continue with Google'}</Text>
    </Pressable>
  );
}

export default function SignInScreen() {
  const { signIn, signInWithProvider } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState<'GOOGLE' | 'APPLE' | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
    setSocialBusy(null);
  }, []);

  const signInWithApple = async () => {
    setSocialBusy('APPLE');
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        setError('Apple did not return an identity token.');
        return;
      }
      const result = await signInWithProvider('APPLE', credential.identityToken);
      if (result.kind === 'two-factor-required') setNeedsTwoFactor(true);
    } catch (caught) {
      if (caught instanceof Error && 'code' in caught && caught.code === 'ERR_REQUEST_CANCELED')
        return;
      setError(caught instanceof Error ? caught.message : 'Apple sign-in failed.');
    } finally {
      setSocialBusy(null);
    }
  };

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

      <View style={styles.socialRow}>
        {GOOGLE_IOS_CLIENT_ID ? (
          <GoogleSignInButton
            busy={socialBusy !== null}
            onError={handleGoogleError}
            onStart={() => setSocialBusy('GOOGLE')}
            onTwoFactor={() => {
              setSocialBusy(null);
              setNeedsTwoFactor(true);
            }}
            signInWithProvider={signInWithProvider}
          />
        ) : null}
        {appleAvailable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
            disabled={socialBusy !== null}
            onPress={() => void signInWithApple()}
            style={styles.socialButton}
            testID="auth.signIn.apple"
          >
            <Text style={styles.socialText}>
              {socialBusy === 'APPLE' ? 'Connecting…' : 'Continue with Apple'}
            </Text>
          </Pressable>
        ) : null}
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
  socialRow: { gap: spacing[3] },
  socialButton: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: { ...typography.bodyStrong, color: colors.navy900 },
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
