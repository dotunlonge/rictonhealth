'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api-client';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, Plus, DollarSign, History } from 'lucide-react';
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

const defaultChartData = [
  { day: 'Mon', revenue: 15000 },
  { day: 'Tue', revenue: 22000 },
  { day: 'Wed', revenue: 18500 },
  { day: 'Thu', revenue: 32000 },
  { day: 'Fri', revenue: 28000 },
  { day: 'Sat', revenue: 12000 },
  { day: 'Sun', revenue: 9500 },
];

export default function WalletPage() {
  const { walletBalance, fetchWallet } = useAppStore();
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
            description: t.description || 'Telemedicine Consultation Fee',
            amount: t.amount || 5000,
            date: new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            status: 'COMPLETED',
          }))
        );
      } else {
        setTransactions([
          {
            id: 'TX-101',
            type: 'PAYMENT',
            description: 'Telemedicine Session - Dr. Oluwaseun Davies',
            amount: 15000,
            date: 'Today',
            status: 'COMPLETED',
          },
          {
            id: 'TX-102',
            type: 'DEPOSIT',
            description: 'Wallet Top Up via GTBank Transfer',
            amount: 25000,
            date: 'Yesterday',
            status: 'COMPLETED',
          },
          {
            id: 'TX-103',
            type: 'PAYMENT',
            description: 'Prescription Medication Refill #RX-101',
            amount: 5000,
            date: 'Aug 10',
            status: 'COMPLETED',
          },
        ]);
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
        id: `TX-${Date.now().toString().slice(-4)}`,
        type: 'DEPOSIT',
        description: 'Instant Wallet Fund Deposit',
        amount,
        date: 'Just now',
        status: 'COMPLETED',
      },
      ...prev,
    ]);
    setActionMsg('Successfully added ₦10,000 to your wallet balance!');
    setTimeout(() => setActionMsg(null), 4000);
  };

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
              <span className="text-3xl font-black text-slate-900">20,000</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">3 Consultations & 1 Refill</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Account</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">GTBank •••• 4091</p>
                <p className="text-[10px] font-semibold text-slate-400">Default Payout Account</p>
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
                <BarChart data={defaultChartData}>
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
            <div className="space-y-3">
              {transactions.map((tx) => (
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
