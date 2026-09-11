'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api-client';
import { Gift, Award, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface VoucherGift {
  id: string;
  name: string;
  category: string;
  points: number;
  image?: string;
}

export default function RewardsPage() {
  const { rewardsPoints } = useAppStore();
  const [balance, setBalance] = useState<number>(rewardsPoints || 0);
  const [redeemedMsg, setRedeemedMsg] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const [vouchers, setVouchers] = useState<VoucherGift[]>([]);

  useEffect(() => {
    async function loadRewards() {
      const [balRes, catRes] = await Promise.all([
        api.get<{ balance: number }>('/rewards/balance'),
        api.get<{ items: any[] }>('/rewards/catalog'),
      ]);
      // Backend envelope: { balance } and { items: [{ id, name, pointsCost, ... }] }.
      if (balRes.success && balRes.data?.balance !== undefined) {
        setBalance(Number(balRes.data.balance) || 0);
      }
      if (catRes.success && Array.isArray(catRes.data?.items) && catRes.data.items.length > 0) {
        setVouchers(
          catRes.data.items.map((c: any) => ({
            id: c.id,
            name: c.name,
            category: c.category || 'Voucher & Gift',
            points: c.pointsCost || 500,
            image: c.imageUrl || undefined,
          }))
        );
      }
    }
    loadRewards();
  }, []);

  const handleRedeem = async (gift: VoucherGift) => {
    if (balance < gift.points) {
      setRedeemedMsg(`Insufficient points balance (${balance} pts). You need ${gift.points} pts.`);
      setTimeout(() => setRedeemedMsg(null), 4000);
      return;
    }

    setRedeemingId(gift.id);
    const res = await api.post(
      '/rewards/claim',
      { rewardId: gift.id },
      {
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : gift.id,
      }
    );
    setRedeemingId(null);

    if (res.success) {
      // Server-authoritative: reload the real balance instead of local arithmetic.
      const balRes = await api.get<{ balance: number }>('/rewards/balance');
      if (balRes.success && balRes.data?.balance !== undefined) {
        setBalance(Number(balRes.data.balance) || 0);
      }
      setRedeemedMsg(`Successfully redeemed ${gift.name} Voucher! Check your email for code.`);
    } else {
      setRedeemedMsg(`Failed: ${res.error?.message || 'Could not redeem voucher'}`);
    }

    setTimeout(() => setRedeemedMsg(null), 5000);
  };

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header Banner */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-[#1877F2]" /> Patient Rewards & Loyalty Points
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Earn points with every consultation, prescription fill, and health check-in
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
          <div className="space-y-2 text-center md:text-left z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-cyan-300 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Tier 1 Member Balance
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-6xl font-black tracking-tight">{balance}</span>
              <span className="text-xl font-bold text-blue-200 uppercase tracking-widest">
                Points
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-md font-medium">
              Redeem your points for dining vouchers, pharmacy discounts, and partner healthcare
              benefits.
            </p>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-lg shrink-0">
            <Gift className="w-8 h-8" />
          </div>
        </div>

        {redeemedMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              redeemedMsg.includes('Insufficient')
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{redeemedMsg}</span>
          </div>
        )}

        {/* Browse Gifts Section */}
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Available Gift Vouchers</h2>
            <span className="text-xs font-semibold text-slate-500">{vouchers.length} rewards</span>
          </div>

          {/* Gifts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vouchers.length === 0 && (
              <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
                No rewards are currently available.
              </div>
            )}
            {vouchers.map((gift) => {
              const canAfford = balance >= gift.points;
              const isRedeeming = redeemingId === gift.id;
              return (
                <div
                  key={gift.id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="bg-slate-100 rounded-2xl overflow-hidden shadow-xs h-48 relative flex items-center justify-center">
                      {gift.image ? (
                        <img
                          src={gift.image}
                          alt={gift.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <Gift className="h-12 w-12 text-slate-400" aria-hidden="true" />
                      )}
                      <div className="relative z-10 bg-slate-900/75 backdrop-blur-xs text-white px-5 py-2 rounded-full shadow-lg">
                        <span className="text-sm font-bold truncate">{gift.name}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{gift.name}</h3>
                        <p className="text-[11px] font-semibold text-slate-400">{gift.category}</p>
                      </div>
                      <div className="flex items-baseline gap-1 bg-blue-50 px-3 py-1 rounded-full text-[#1877F2] font-extrabold text-xs">
                        <span>{gift.points}</span>
                        <span className="text-[9px] uppercase">pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleRedeem(gift)}
                      disabled={isRedeeming}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        canAfford
                          ? 'bg-[#1877F2] hover:bg-[#1565C0] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span>
                        {isRedeeming
                          ? 'Redeeming...'
                          : canAfford
                            ? 'Redeem Voucher'
                            : 'Insufficient Points'}
                      </span>
                      {canAfford && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
