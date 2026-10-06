'use client';

import { useEffect, useState, useMemo } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api-client';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Plus, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT';
  description: string;
  amount: number;
  date: string;
  status: 'COMPLETED' | 'PENDING';
}

export default function WalletPage() {
  const { user, walletBalance, walletStatus, walletError, fetchWallet } = useAppStore();
  // Funding/spending is a patient action — staff see balances and history
  // only (earnings land via consultation payouts, never a top-up button).
  const canFund = (user?.role ?? 'PATIENT') === 'PATIENT';
  // walletStatus distinguishes "genuinely ₦0" (success) from "unknown" (error):
  // an unavailable balance must never render as a valid-looking ₦0.
  const balanceKnown = walletStatus !== 'error';
  const balance = balanceKnown ? walletBalance : null;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await fetchWallet();
      const banksRes = await api.get<{ banks: Array<{ name: string; code: string }> }>(
        '/payments/banks'
      );
      if (banksRes.success && Array.isArray(banksRes.data?.banks)) {
        setBanks(banksRes.data.banks);
      }
      const res = await api.get<{ transactions: any[] }>('/wallets/transactions');
      if (res.success && Array.isArray(res.data?.transactions)) {
        setTransactions(
          res.data.transactions.map((t: any) => ({
            id: t.id,
            type: t.type === 'CREDIT' ? 'DEPOSIT' : t.type === 'DEBIT' ? 'WITHDRAWAL' : 'PAYMENT',
            description: t.description || 'Wallet transaction',
            amount: Number(t.amount) || 0,
            date: new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            status: t.status || 'COMPLETED',
          }))
        );
      } else {
        setTransactions([]);
      }
      // Payment history — GET /payments (server-authoritative receipts).
      const payRes = await api.get<unknown>('/payments');
      if (payRes.success && Array.isArray(payRes.data)) {
        setPayments(payRes.data);
      } else if (
        payRes.success &&
        payRes.data &&
        typeof payRes.data === 'object' &&
        Array.isArray((payRes.data as { payments?: unknown }).payments)
      ) {
        setPayments((payRes.data as { payments: any[] }).payments);
      } else {
        setPayments([]);
      }
      setLoading(false);
    }
    loadData();
  }, [fetchWallet]);

  const [topUpAmount, setTopUpAmount] = useState('10000');
  const [toppingUp, setToppingUp] = useState(false);

  const handleTopUp = async () => {
    if (toppingUp) return;
    const amount = Math.floor(Number(topUpAmount));
    if (!Number.isFinite(amount) || amount < 100) {
      setActionMsg('Enter at least ₦100 to fund your wallet.');
      setTimeout(() => setActionMsg(null), 4000);
      return;
    }
    setToppingUp(true);
    // Server-authoritative funding: initialize Paystack checkout, redirect to
    // pay, and let the webhook credit the wallet. Never credit locally.
    const res = await api.post<{ authorizationUrl?: string; reference?: string }>(
      '/wallets/topup',
      { amount },
      {
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`,
      }
    );
    setToppingUp(false);
    if (!res.success || !res.data?.authorizationUrl) {
      setActionMsg(`Failed: ${res.error?.message || 'Could not initialize payment'}`);
      setTimeout(() => setActionMsg(null), 4000);
      return;
    }
    setActionMsg(`Redirecting to Paystack to complete ₦${amount.toLocaleString()} payment…`);
    window.location.href = res.data.authorizationUrl;
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawing) return;
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount < 100) {
      setWithdrawMsg('Enter at least ₦100 to withdraw.');
      setWithdrawError(true);
      return;
    }
    if (!bankCode || accountNumber.trim().length < 10) {
      setWithdrawMsg('Choose a bank and enter the 10-digit account number.');
      setWithdrawError(true);
      return;
    }
    setWithdrawing(true);
    setWithdrawMsg(null);
    setWithdrawError(false);
    const res = await api.post<{
      reference?: string;
      accountName?: string;
      transferStatus?: string;
    }>('/wallets/withdraw', {
      amount,
      bankCode,
      accountNumber: accountNumber.trim(),
    });
    setWithdrawing(false);
    if (res.success && res.data?.reference) {
      setWithdrawMsg(
        `₦${amount.toLocaleString()} sent to ${res.data.accountName || 'your account'}. Ref ${res.data.reference.slice(-8)}.`
      );
      setWithdrawAmount('');
      await fetchWallet();
      const txRes = await api.get<{ transactions: any[] }>('/wallets/transactions');
      if (txRes.success && Array.isArray(txRes.data?.transactions)) {
        setTransactions(
          txRes.data.transactions.map((t: any) => ({
            id: t.id,
            type: t.type === 'CREDIT' ? 'DEPOSIT' : t.type === 'DEBIT' ? 'WITHDRAWAL' : 'PAYMENT',
            description: t.description || 'Wallet transaction',
            amount: Number(t.amount) || 0,
            date: new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            status: t.status || 'COMPLETED',
          }))
        );
      }
    } else {
      setWithdrawMsg(res.error?.message || 'Withdrawal failed. No money moved.');
      setWithdrawError(true);
    }
    setTimeout(() => setWithdrawMsg(null), 6000);
  };

  const monthlyExpenses = useMemo(() => {
    return transactions.filter((t) => t.type !== 'DEPOSIT').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const chartData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals: Record<string, number> = {};
    dayNames.forEach((d) => (dayTotals[d] = 0));
    transactions.forEach((t) => {
      const parsed = new Date(t.date);
      if (!isNaN(parsed.getTime())) {
        const dayName = dayNames[parsed.getDay()];
        dayTotals[dayName] += t.amount;
      }
    });
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
      day,
      revenue: dayTotals[day],
    }));
  }, [transactions]);

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Top Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-[#1877F2]" /> Digital Health Wallet & Earnings
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Secure automated billing, consultation payouts, and prescription transaction history
            </p>
          </div>

          {canFund ? (
            <div className="flex items-center gap-2">
              <input
                aria-label="Top-up amount in naira"
                inputMode="numeric"
                placeholder="Amount (₦, min 100)"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-40 p-2.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
              />
              <button
                type="button"
                onClick={handleTopUp}
                disabled={toppingUp}
                className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] disabled:opacity-50 text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{toppingUp ? 'Starting…' : 'Fund Wallet'}</span>
              </button>
            </div>
          ) : (
            <p className="text-xs font-semibold text-slate-500">
              Staff wallets receive consultation payouts — funding is patient-only.
            </p>
          )}
        </div>

        {actionMsg && (
          <div className="p-4 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {actionMsg}
          </div>
        )}

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-xl space-y-4 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Available Wallet Balance
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-blue-300">₦</span>
              {balanceKnown && balance !== null ? (
                <span className="text-4xl font-black">{balance.toLocaleString()}</span>
              ) : (
                <span role="alert" className="text-sm font-bold text-amber-300">
                  Unavailable — {walletError || 'could not load balance'}
                </span>
              )}
            </div>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ArrowUpRight className="w-4 h-4" /> Live Account Active
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              This Month Expenses
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-500">₦</span>
              <span className="text-3xl font-black text-slate-900">
                {monthlyExpenses.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              {transactions.length} Total Health Transactions
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Payment Account
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {user?.email || 'Ricton Health Wallet'}
                </p>
                <p className="text-[10px] font-semibold text-slate-400">
                  Verified Health Payout Account
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Withdraw to bank — available to every role for their own funds.
            The destination holder is verified server-side before any debit. */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Withdraw to bank account</h2>
            <p className="text-[11px] font-semibold text-slate-500">
              Minimum ₦100. The account name is verified before money moves.
            </p>
          </div>
          {withdrawMsg && (
            <div
              role={withdrawError ? 'alert' : 'status'}
              className={`p-3 rounded-2xl text-xs font-bold border ${
                withdrawError
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {withdrawMsg}
            </div>
          )}
          <form onSubmit={handleWithdraw} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              aria-label="Destination bank"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            >
              <option value="">Select bank</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Account number"
              inputMode="numeric"
              maxLength={10}
              placeholder="10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
            <input
              aria-label="Amount in naira"
              inputMode="decimal"
              placeholder="Amount (₦)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
            <button
              type="submit"
              disabled={withdrawing}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all"
            >
              {withdrawing ? 'Sending…' : 'Withdraw'}
            </button>
          </form>
        </div>

        {/* Analytics & Transactions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart Canvas */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Weekly Health Expense Analytics</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#1877F2" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-[#1877F2]" /> Recent Activity
            </h2>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400 font-bold">
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">
                    No transaction activity recorded
                  </p>
                  {canFund && (
                    <button
                      type="button"
                      onClick={handleTopUp}
                      className="text-xs text-[#1877F2] font-bold hover:underline"
                    >
                      + Fund Wallet Now
                    </button>
                  )}
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          tx.type === 'DEPOSIT'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-[#1877F2]'
                        }`}
                      >
                        {tx.type === 'DEPOSIT' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                          {tx.description}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">{tx.date}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-900">
                      {tx.type === 'DEPOSIT' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Payment history — GET /payments with receipt links. */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-[#1877F2]" /> Payment history
          </h2>
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 font-bold">
              Loading payments...
            </div>
          ) : payments.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">
              No payments recorded yet.
            </p>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {payments.map((p: any) => {
                const ref = p.providerReference || p.reference;
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {p.type || 'Payment'} · ₦{Number(p.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {p.status || 'UNKNOWN'}
                        {p.createdAt
                          ? ` · ${new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : ''}
                      </p>
                    </div>
                    {ref ? (
                      <a
                        href={`/payments/verify?reference=${encodeURIComponent(ref)}`}
                        className="text-xs text-[#1877F2] font-bold hover:underline shrink-0"
                      >
                        Receipt
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
