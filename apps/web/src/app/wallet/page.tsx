'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function WalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function loadWallet() {
      const res = await api.get('/wallet/balance');
      if (res.success && res.data) {
        setWallet(res.data);
      }

      const txRes = await api.get('/wallet/transactions');
      if (txRes.success && txRes.data) {
        setTransactions(Array.isArray(txRes.data) ? txRes.data : txRes.data.transactions || []);
      }

      setLoading(false);
    }
    loadWallet();
  }, []);

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setIsProcessing(true);

    const res = await api.post('/payments/initialize', {
      amount: parseFloat(amount),
      paymentType: 'WALLET_TOPUP',
    });

    setIsProcessing(false);

    if (res.success && res.data?.authorizationUrl) {
      window.location.href = res.data.authorizationUrl;
    } else {
      alert(res.error?.message || 'Payment initialization failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold">🏥</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Ricton Wallet</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Dashboard
            </Link>
            <Link href="/providers" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Find Doctors
            </Link>
            <Link href="/wallet" className="text-teal-600 font-semibold">
              Wallet
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card */}
          <div className="md:col-span-2 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-teal-800/30">
            <p className="text-xs uppercase tracking-wider text-teal-300 font-medium">Digital Wallet Balance</p>
            <p className="text-4xl font-extrabold mt-3">
              ₦{wallet?.balance ? parseFloat(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) : '0.00'}
            </p>
            <div className="mt-8 flex items-center justify-between text-xs text-slate-400">
              <span>Account Status: Active</span>
              <span>Currency: NGN</span>
            </div>
          </div>

          {/* Top Up Form */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Top Up Wallet</h3>
              <p className="text-xs text-slate-500 mt-1">Instant Paystack gateway deposit</p>
              <form onSubmit={handleTopUp} className="mt-4 space-y-3">
                <input
                  type="number"
                  placeholder="Enter amount (e.g. 10000)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs shadow transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Connecting Gateway...' : 'Pay with Paystack'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">Transaction History</h3>
          {loading ? (
            <p className="text-sm text-slate-500 py-4">Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No recent wallet transactions.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-xs">{tx.description || tx.type}</p>
                    <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      tx.type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {tx.type === 'CREDIT' ? '+' : '-'}₦{parseFloat(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
