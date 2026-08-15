import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';

export interface BankOption {
  name: string;
  code: string;
}

const FALLBACK_BANKS: BankOption[] = [
  { name: 'Access Bank', code: '044' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Bank', code: '50211' },
  { name: 'Moniepoint MFB', code: '50515' },
  { name: 'OPay Digital Services', code: '999992' },
  { name: 'Palmpay', code: '999991' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

export function usePaystackBanks() {
  const [banks, setBanks] = useState<BankOption[]>(FALLBACK_BANKS);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLiveBanks() {
      try {
        const res = await api.get('/payments/banks');
        if (res.success && Array.isArray(res.data?.banks) && res.data.banks.length > 0) {
          setBanks(res.data.banks);
        }
      } catch (err) {
        console.warn('Failed to load live Paystack banks, using fallback list', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLiveBanks();
  }, []);

  const resolveAccount = async (accountNumber: string, bankCode: string) => {
    if (accountNumber.length !== 10 || !bankCode) return null;
    try {
      const res = await api.get(
        `/payments/bank/resolve?accountNumber=${accountNumber}&bankCode=${bankCode}`
      );
      if (res.success && res.data?.accountName) {
        return res.data.accountName as string;
      }
    } catch {
      return null;
    }
    return null;
  };

  return { banks, loading, resolveAccount };
}
