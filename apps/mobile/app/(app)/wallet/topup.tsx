import { openURL } from 'expo-linking';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice, TextField } from '@/components/ui';
import { MAX_TOPUP_NGN, MIN_TOPUP_NGN, walletService } from '@/features/wallet/wallet-service';
import { spacing, typography } from '@/theme/tokens';
import { colors } from '@/theme/tokens';

export default function TopUpScreen() {
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const launch = async () => {
    const value = Number(amount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(value) || value < MIN_TOPUP_NGN || value > MAX_TOPUP_NGN) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    Alert.alert('Confirm top-up', `Top up ₦${value.toLocaleString('en-NG')}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => void doLaunch(value) },
    ]);
  };

  const doLaunch = async (value: number) => {
    setLaunching(true);
    setError(null);
    try {
      const result = await walletService.launchTopUp({ amount: value });
      setReference(result.reference);
      await openURL(result.authorizationUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Top-up could not be started.');
    } finally {
      setLaunching(false);
    }
  };

  const verify = async () => {
    if (!reference) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await walletService.verifyTopUp({ reference });
      if (result.status === 'SUCCESS') {
        setVerified(true);
      } else {
        setError(
          `Payment is ${result.status.toLowerCase()}. Your wallet updates once it succeeds.`
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Screen testID="wallet.topup.screen" style={styles.content}>
      <PatientHeader
        eyebrow="TOP UP"
        title="Add money"
        subtitle="Paystack checkout opens in your browser. We never see card details."
      />
      <TextField
        label={`Amount in NGN (min ${MIN_TOPUP_NGN}, max ${MAX_TOPUP_NGN})`}
        accessibilityLabel="Top-up amount in naira"
        keyboardType="number-pad"
        onChangeText={setAmount}
        placeholder="5000"
        testID="wallet.amount"
        value={amount}
      />
      {amountError ? (
        <Text testID="wallet.amount-error" style={styles.error}>
          Enter between {MIN_TOPUP_NGN} and {MAX_TOPUP_NGN} NGN.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        label="Continue to Paystack"
        loading={launching}
        onPress={() => void launch()}
        testID="wallet.launch"
      />
      {reference ? (
        <View testID="wallet.checkout-opened" style={styles.stack}>
          <StateNotice
            title="Checkout opened"
            message="Complete payment in your browser, then come back and confirm below."
          />
          <PrimaryButton
            label="I have paid — verify"
            loading={verifying}
            onPress={() => void verify()}
            testID="wallet.verify"
          />
        </View>
      ) : null}
      {verified ? (
        <View testID="wallet.verified">
          <StateNotice title="Top-up verified" message="Your balance now reflects the payment." />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  stack: { gap: spacing[4] },
  error: { ...typography.caption, color: colors.rose700 },
});
