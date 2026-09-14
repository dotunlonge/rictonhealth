import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PatientHeader } from '@/components/PatientHeader';
import { PrimaryButton, Screen, StateNotice } from '@/components/ui';
import { walletService } from '@/features/wallet/wallet-service';
import { cardShadow, colors, radii, spacing, typography } from '@/theme/tokens';

interface Wallet {
  balance: number | string;
  currency?: string;
  virtualAccountNumber?: string | null;
  virtualBankName?: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number | string;
  description?: string | null;
}

export function money(amount: number | string, currency = 'NGN'): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export default function WalletScreen() {
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [w, t] = await Promise.all([
        walletService.balance() as Promise<Wallet>,
        walletService.transactions({ limit: 20, offset: 0 }) as Promise<{
          transactions: Transaction[];
        }>,
      ]);
      setWallet(w);
      setTransactions(t.transactions);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Wallet could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createAccount = async () => {
    setCreatingAccount(true);
    try {
      setWallet((await walletService.virtualAccount()) as Wallet);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Virtual account could not be created.');
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <Screen testID="wallet.screen" style={styles.content}>
      <PatientHeader
        eyebrow="MONEY"
        title="Wallet"
        subtitle="Balances are set by the server, never this screen."
      />
      {error && !wallet ? (
        <StateNotice
          title="Wallet could not be loaded"
          message={error}
          actionLabel="Try again"
          onAction={() => void load()}
        />
      ) : !wallet ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue600} />
          <Text style={styles.loadingText}>Loading wallet…</Text>
        </View>
      ) : (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balance}>{money(wallet.balance, wallet.currency)}</Text>
            {wallet.virtualAccountNumber ? (
              <Text style={styles.account}>
                {wallet.virtualBankName ?? 'Virtual account'} · {wallet.virtualAccountNumber}
              </Text>
            ) : (
              <PrimaryButton
                label={creatingAccount ? 'Creating…' : 'Get virtual account'}
                loading={creatingAccount}
                onPress={() => void createAccount()}
                testID="wallet.create-account"
              />
            )}
          </View>
          <PrimaryButton
            label="Top up"
            onPress={() => router.push('./topup')}
            testID="wallet.go-topup"
          />
          {transactions === null ? (
            <ActivityIndicator color={colors.blue600} />
          ) : transactions.length ? (
            <View style={styles.list}>
              {transactions.map((tx) => (
                <View key={tx.id} style={styles.row} testID={`wallet.tx-${tx.id}`}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle}>
                      {tx.description || tx.type.replaceAll('_', ' ')}
                    </Text>
                    <Text style={styles.rowMeta}>{tx.type.replaceAll('_', ' ')}</Text>
                  </View>
                  <Text style={styles.rowAmount}>{money(tx.amount, wallet.currency)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View testID="wallet.empty">
              <StateNotice
                title="No transactions yet"
                message="Top-ups and payments will appear here."
              />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5] },
  loading: { paddingVertical: spacing[10], alignItems: 'center', gap: spacing[3] },
  loadingText: { ...typography.body, color: colors.slate600 },
  balanceCard: {
    ...cardShadow,
    borderRadius: radii.lg,
    backgroundColor: colors.navy900,
    padding: spacing[6],
    gap: spacing[2],
  },
  balanceLabel: { ...typography.caption, color: colors.blue100 },
  balance: { ...typography.title, color: colors.white, fontSize: 32 },
  account: { ...typography.bodyStrong, color: colors.white },
  list: { gap: spacing[3] },
  row: {
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  rowCopy: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.navy900 },
  rowMeta: { ...typography.caption, color: colors.slate600, textTransform: 'capitalize' },
  rowAmount: { ...typography.bodyStrong, color: colors.navy900 },
});
