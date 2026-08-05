'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const HEX_BG = `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`;

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  isCurrent?: boolean;
};

type Subscription = {
  plan: string;
  status: string;
  expiresAt?: string;
  renewsAt?: string;
};

const featuresByPlan: Record<string, string[]> = {
  FREE: [
    'Up to 10 appointments/month',
    'Basic patient records',
    'Standard support',
    '1 provider account',
    'E-Prescriptions (limited)',
  ],
  PREMIUM: [
    'Unlimited appointments',
    'Full patient management',
    'Telemedicine / Video Calls',
    'Advanced analytics',
    'Priority 24/7 support',
    'Unlimited providers',
    'E-Prescriptions (unlimited)',
    'Custom onboarding',
    'MDT sessions',
    'Rewards program access',
  ],
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySubscription, setMySubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [plansRes, myRes, histRes] = await Promise.all([
        api.get('/subscriptions/plans'),
        api.get('/subscriptions/my'),
        api.get('/subscriptions/history'),
      ]);

      if (plansRes.success && plansRes.data) {
        const rawPlans = Array.isArray(plansRes.data) ? plansRes.data : plansRes.data.plans || [];
        setPlans(
          rawPlans.map((p: any) => ({
            ...p,
            features: featuresByPlan[p.name?.toUpperCase()] || p.features || [],
          }))
        );
      } else {
        // Fallback display plans if endpoint not yet returning data
        setPlans([
          {
            id: 'free',
            name: 'FREE',
            price: 0,
            currency: 'NGN',
            interval: 'month',
            features: featuresByPlan['FREE'],
          },
          {
            id: 'premium',
            name: 'PREMIUM',
            price: 49999,
            currency: 'NGN',
            interval: 'month',
            features: featuresByPlan['PREMIUM'],
          },
        ]);
      }

      if (myRes.success && myRes.data) setMySubscription(myRes.data);
      if (histRes.success && histRes.data) {
        setHistory(Array.isArray(histRes.data) ? histRes.data : histRes.data.history || []);
      }

      setLoading(false);
    }
    load();
  }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    const res = await api.post('/subscriptions/upgrade', { plan: 'PREMIUM' });
    setUpgrading(false);
    if (res.success && res.data?.url) {
      window.location.href = res.data.url;
    } else {
      alert(res.error?.message || 'Upgrade initiated. Complete payment to activate.');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    setCancelling(true);
    const res = await api.post('/subscriptions/cancel');
    setCancelling(false);
    if (res.success) {
      setMySubscription((prev) => prev ? { ...prev, status: 'CANCELLED' } : null);
      alert('Subscription cancelled successfully.');
    } else {
      alert(res.error?.message || 'Failed to cancel subscription.');
    }
  };

  const isPremium = mySubscription?.plan === 'PREMIUM' && mySubscription?.status === 'ACTIVE';

  return (
    <div className="min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="w-40 bg-[#1877F2] text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-base">🩺</div>
          <span className="text-lg font-bold">Ricton</span>
        </div>
        <nav className="flex-1 px-2 mt-4 space-y-1 overflow-y-auto">
          {[
            { label: 'Home', href: '/dashboard/hospital', icon: '🏠' },
            { label: 'Settings', href: '/settings', icon: '⚙️' },
            { label: 'Subscription', href: '/subscription', icon: '💎' },
            { label: 'Earnings', href: '/wallet', icon: '💳' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl hover:bg-white/10 opacity-80 hover:opacity-100 transition-all text-center"
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="ml-40 flex-1 bg-gradient-to-br from-[#DAE8FE] to-[#EEF4FD] relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{ backgroundImage: HEX_BG, backgroundSize: '110px 190px' }} />

        <div className="relative z-10 px-10 py-10 pb-20 max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Plans & Pricing</h1>
            <p className="text-slate-600 max-w-xl mx-auto">
              Choose the plan that's right for your facility. Upgrade anytime to unlock the full power of the Ricton platform.
            </p>
            {mySubscription && (
              <div className="inline-flex items-center gap-2 mt-4 bg-white/70 border border-slate-200 rounded-full px-5 py-2 text-sm text-slate-700 font-medium">
                <span className={`w-2 h-2 rounded-full ${mySubscription.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'}`} />
                Current plan: <span className="font-bold text-slate-900">{mySubscription.plan}</span>
                {mySubscription.status !== 'ACTIVE' && <span className="text-red-500 text-xs">({mySubscription.status})</span>}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {plans.map((plan) => {
                const isPlan = plan.name.toUpperCase() === 'PREMIUM';
                const isCurrentPlan = mySubscription?.plan === plan.name.toUpperCase();
                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl p-8 shadow-sm transition-all ${
                      isPlan
                        ? 'bg-[#1877F2] text-white ring-4 ring-blue-300'
                        : 'bg-white/80 backdrop-blur-sm text-slate-900'
                    }`}
                  >
                    {isPlan && (
                      <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                        MOST POPULAR
                      </div>
                    )}
                    <h2 className={`text-2xl font-bold mb-2 ${isPlan ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
                    </h2>
                    <div className="flex items-baseline gap-1 mb-6">
                      {plan.price === 0 ? (
                        <span className={`text-4xl font-black ${isPlan ? 'text-white' : 'text-slate-900'}`}>Free</span>
                      ) : (
                        <>
                          <span className={`text-sm font-medium ${isPlan ? 'text-blue-100' : 'text-slate-500'}`}>₦</span>
                          <span className={`text-4xl font-black ${isPlan ? 'text-white' : 'text-slate-900'}`}>
                            {plan.price.toLocaleString()}
                          </span>
                          <span className={`text-sm ${isPlan ? 'text-blue-100' : 'text-slate-500'}`}>/ {plan.interval}</span>
                        </>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li key={f} className={`flex items-center gap-2 text-sm ${isPlan ? 'text-blue-50' : 'text-slate-700'}`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isPlan ? 'text-white' : 'text-[#1877F2]'}>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <div className="space-y-3">
                        <button
                          disabled
                          className={`w-full py-3 rounded-2xl font-bold text-sm ${
                            isPlan ? 'bg-white/20 text-white cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          ✓ Current Plan
                        </button>
                        {isPlan && (
                          <button
                            onClick={handleCancel}
                            disabled={cancelling}
                            className="w-full py-2 rounded-2xl font-medium text-xs text-blue-100 hover:text-white border border-white/20 hover:border-white/40 transition-colors"
                          >
                            {cancelling ? 'Cancelling...' : 'Cancel subscription'}
                          </button>
                        )}
                      </div>
                    ) : isPlan ? (
                      <button
                        onClick={handleUpgrade}
                        disabled={upgrading}
                        className="w-full py-3 bg-white text-[#1877F2] hover:bg-blue-50 rounded-2xl font-bold text-sm transition-colors disabled:opacity-60"
                      >
                        {upgrading ? 'Processing...' : 'Upgrade to Premium →'}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold text-sm cursor-not-allowed"
                      >
                        Free Plan
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Subscription History */}
          {history.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Subscription History</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="py-3 text-left">Plan</th>
                    <th className="py-3 text-center">Status</th>
                    <th className="py-3 text-center">Started</th>
                    <th className="py-3 text-right">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h: any, i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="py-4 font-medium text-slate-900">{h.plan}</td>
                      <td className="py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          h.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>{h.status}</span>
                      </td>
                      <td className="py-4 text-center text-slate-600">
                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-4 text-right text-slate-600">
                        {h.expiresAt ? new Date(h.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
