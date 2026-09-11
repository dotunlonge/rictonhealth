import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, minimumTouchTarget, radii, spacing, typography } from '@/theme/tokens';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.brand, compact && styles.brandCompact]} accessibilityLabel="Ricton Health">
      <Text style={[styles.brandLetter, compact && styles.brandLetterCompact]}>R</Text>
      <View style={[styles.brandCross, compact && styles.brandCrossCompact]}>
        <Text style={[styles.brandCrossText, compact && styles.brandCrossTextCompact]}>+</Text>
      </View>
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  keyboardAware = false,
  style,
  testID,
}: PropsWithChildren<{
  scroll?: boolean;
  keyboardAware?: boolean;
  style?: ViewStyle;
  testID?: string;
}>) {
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.screenContentFixed, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']} testID={testID}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  accessibilityLabel,
  testID,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.primaryButton,
        isDisabled && styles.primaryButtonDisabled,
        pressed && !isDisabled && styles.primaryButtonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  trailing,
  ...props
}: TextInputProps & { label: string; error?: string; trailing?: ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputShellError]}>
        <TextInput
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          placeholderTextColor={colors.slate400}
          style={[styles.input, props.style]}
        />
        {trailing}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function StateNotice({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeMessage}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.noticeAction}>
          <Text style={styles.noticeActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { flexGrow: 1, paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  screenContentFixed: { flex: 1 },
  brand: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCompact: { width: 42, height: 42, borderRadius: 13 },
  brandLetter: { color: colors.white, fontSize: 34, fontWeight: '800', letterSpacing: -2 },
  brandLetterCompact: { fontSize: 23, letterSpacing: -1 },
  brandCross: {
    position: 'absolute',
    width: 22,
    height: 22,
    right: -5,
    top: -5,
    borderRadius: 11,
    backgroundColor: colors.navy900,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  brandCrossCompact: { width: 17, height: 17, borderRadius: 9, right: -4, top: -4 },
  brandCrossText: { color: colors.white, fontSize: 17, lineHeight: 19, fontWeight: '800' },
  brandCrossTextCompact: { fontSize: 12, lineHeight: 14 },
  primaryButton: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.blue600,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: { backgroundColor: colors.blue700, transform: [{ scale: 0.99 }] },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { ...typography.bodyStrong, color: colors.white },
  fieldGroup: { gap: spacing[2] },
  fieldLabel: { ...typography.label, color: colors.slate900 },
  inputShell: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.slate300,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputShellError: { borderColor: colors.rose700 },
  input: { ...typography.body, flex: 1, color: colors.slate900, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  fieldError: { ...typography.caption, color: colors.rose700 },
  notice: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  noticeTitle: { ...typography.heading, color: colors.navy900, textAlign: 'center' },
  noticeMessage: { ...typography.body, color: colors.slate600, textAlign: 'center' },
  noticeAction: { minHeight: minimumTouchTarget, paddingHorizontal: spacing[4], justifyContent: 'center' },
  noticeActionText: { ...typography.bodyStrong, color: colors.blue700 },
});
