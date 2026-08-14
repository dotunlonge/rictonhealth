'use client';

import { useEffect, useState, useMemo } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api-client';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Plus, History } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT';
  description: string;
  amount: number;
  date: string;
  status: 'COMPLETED' | 'PENDING';
}

export default function WalletPage() {
  const { user, walletBalance, fetchWallet } = useAppStore();
  const [balance, setBalance] = useState<number>(walletBalance || 0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await fetchWallet();
      const res = await api.get('/wallet/transactions');
      if (res.success && Array.isArray(res.data)) {
        setTransactions(
          res.data.map((t: any, idx: number) => ({
            id: t.id || `TX-${100 + idx}`,
            type: t.type || 'PAYMENT',
            description: t.description || 'Health Consultation Service',
            amount: Number(t.amount) || 0,
            date: new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            status: 'COMPLETED',
          }))
        );
      } else {
        setTransactions([]);
      }
      setLoading(false);
    }
    loadData();
  }, [fetchWallet]);

  const handleTopUp = async () => {
    const amount = 10000;
    const res = await api.post('/wallet/topup', { amount });
    const newBal = balance + amount;
    setBalance(newBal);
    setTransactions((prev) => [
      {
        id: res.data?.id || `TX-${Date.now().toString().slice(-4)}`,
        type: 'DEPOSIT',
        description: 'Instant Wallet Fund Deposit',
        amount,
        date: 'Just now',
        status: 'COMPLETED',
      },
      ...prev,
    ]);
    setActionMsg(`Wallet successfully funded with ₦${amount.toLocaleString()}`);
    setTimeout(() => setActionMsg(null), 4000);
  };

  const monthlyExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type !== 'DEPOSIT')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day) => {
      const total = transactions
        .filter((t) => t.date.toLowerCase().includes(day.toLowerCase()))
        .reduce((sum, t) => sum + t.amount, 0);
      return { day, revenue: total };
    });
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

          <button
            type="button"
            onClick={handleTopUp}
            className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Fund Wallet (₦10,000)</span>
          </button>
        </div>

        {actionMsg && (
          <div className="p-4 rounded-2xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {actionMsg}
          </div>
        )}

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-xl space-y-4 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Wallet Balance</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-blue-300">₦</span>
              <span className="text-4xl font-black">{balance.toLocaleString()}</span>
            </div>
            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ArrowUpRight className="w-4 h-4" /> Live Account Active
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">This Month Expenses</span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-bold text-slate-500">₦</span>
              <span className="text-3xl font-black text-slate-900">{monthlyExpenses.toLocaleString()}</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">{transactions.length} Total Health Transactions</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Account</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{user?.email || 'Ricton Health Wallet'}</p>
                <p className="text-[10px] font-semibold text-slate-400">Verified Health Payout Account</p>
              </div>
            </div>
          </div>
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
                <div className="p-4 text-center text-xs text-slate-400 font-bold">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No transaction activity recorded</p>
                  <button
                    type="button"
                    onClick={handleTopUp}
                    className="text-xs text-[#1877F2] font-bold hover:underline"
                  >
                    + Fund Wallet Now
                  </button>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          tx.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#1877F2]'
                        }`}
                      >
                        {tx.type === 'DEPOSIT' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{tx.description}</p>
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
      </div>
    </SidebarLayout>
  );
}
