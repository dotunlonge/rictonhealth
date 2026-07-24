'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function RewardsPage() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [userPoints, setUserPoints] = useState(350);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRewards() {
      const res = await api.get('/rewards');
      if (res.success && res.data) {
        setRewards(Array.isArray(res.data) ? res.data : res.data.rewards || []);
        if (res.data.userPoints) setUserPoints(res.data.userPoints);
      }
      setLoading(false);
    }
    loadRewards();
  }, []);

  const handleRedeem = async (rewardId: string, cost: number) => {
    if (userPoints < cost) {
      alert('Insufficient reward points for this item.');
      return;
    }

    const res = await api.post(`/rewards/${rewardId}/redeem`);
    if (res.success) {
      setUserPoints((prev) => prev - cost);
      alert('Reward redeemed successfully!');
    } else {
      alert(res.error?.message || 'Redemption failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="p-2 bg-amber-500 text-white rounded-xl font-bold">⭐</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Ricton Rewards</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-amber-500">
              Dashboard
            </Link>
            <Link href="/rewards" className="text-amber-500 font-semibold">
              Rewards
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
              Health Points Balance
            </span>
            <h1 className="text-4xl font-extrabold mt-2">{userPoints} PTS</h1>
            <p className="text-amber-100 text-xs sm:text-sm mt-1">
              Earn points on consultation bookings, pharmacy purchases, and health goal completions.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center">
            <p className="text-xs text-amber-100 font-semibold">Tier Level</p>
            <p className="text-lg font-black text-white">Gold Member</p>
          </div>
        </div>

        {/* Catalog */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Redeem Rewards</h2>

          {loading ? (
            <p className="text-sm text-slate-500 py-6">Loading rewards catalog...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {(rewards.length > 0
                ? rewards
                : [
                    { id: 'r1', title: '50% Off Virtual Consultation', pointsCost: 100, category: 'Discount Voucher' },
                    { id: 'r2', title: 'Free Home Delivery Code', pointsCost: 150, category: 'Pharmacy Delivery' },
                    { id: 'r3', title: 'Full Health Checkup Voucher', pointsCost: 500, category: 'Clinical Test' },
                  ]
              ).map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div>
                    <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full text-[10px] font-bold">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white mt-2 text-base">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.pointsCost} Points Required</p>
                  </div>

                  <button
                    onClick={() => handleRedeem(item.id, item.pointsCost)}
                    disabled={userPoints < item.pointsCost}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold rounded-xl text-xs shadow transition-colors"
                  >
                    {userPoints >= item.pointsCost ? 'Redeem Voucher' : 'Insufficient Points'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
