'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const HEX_BG = `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`;

const navItems = [
  { label: 'Home', href: '/dashboard/pharmacy', icon: '🏠' },
  { label: 'Products', href: '/pharmacy/products', icon: '💊' },
  { label: 'Sales', href: '/pharmacy/sales', icon: '📊' },
  { label: 'Earnings', href: '/pharmacy/earnings', icon: '💳' },
  { label: 'Rewards', href: '/rewards', icon: '⭐' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

export default function PharmacyDashboard() {
  const [stats, setStats] = useState({ totalSales: 0, totalProducts: 0, pendingOrders: 0, totalEarnings: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profileRes, productsRes, salesRes] = await Promise.all([
        api.get('/users/me'),
        api.get('/pharmacy/products'),
        api.get('/pharmacy/sales'),
      ]);
      if (profileRes.success) setUserProfile(profileRes.data);
      const products = productsRes.success ? (Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.products || []) : [];
      const sales = salesRes.success ? (Array.isArray(salesRes.data) ? salesRes.data : salesRes.data?.sales || []) : [];
      
      setStats({
        totalProducts: products.length,
        totalSales: sales.length,
        pendingOrders: sales.filter((s: any) => s.status === 'PENDING').length,
        totalEarnings: sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0),
      });
      setRecentOrders(sales.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  const displayName = userProfile ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Pharmacist' : 'Pharmacist';

  return (
    <div className="min-h-screen flex font-sans">
      {/* Sidebar */}
      <aside className="w-40 bg-[#1877F2] text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-base">💊</div>
          <span className="text-lg font-bold">Ricton</span>
        </div>
        <nav className="flex-1 px-2 mt-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.label} href={item.href}
              className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl hover:bg-white/10 opacity-80 hover:opacity-100 transition-all text-center">
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          ))}
          <button className="w-full flex flex-col items-center justify-center py-2.5 px-1 rounded-xl hover:bg-white/10 opacity-80 transition-all mt-4">
            <span className="text-xl mb-0.5">🚪</span>
            <span className="text-[10px]">Logout</span>
          </button>
        </nav>
      </aside>

      <main className="ml-40 flex-1 bg-gradient-to-br from-[#DAE8FE] to-[#EEF4FD] relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{ backgroundImage: HEX_BG, backgroundSize: '110px 190px' }} />

        <div className="relative z-10">
          {/* Header */}
          <header className="px-8 py-4 flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="flex items-center gap-2 bg-white/70 border border-slate-200 rounded-full px-4 py-2">
                <span className="text-slate-400">🔍</span>
                <input className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none" placeholder="Search products, orders..." />
              </div>
            </div>
            <div className="flex items-center gap-4 ml-6">
              <div className="relative">
                <span className="text-2xl">🔔</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white" />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{displayName}</p>
                  <p className="text-[10px] text-slate-500">Pharmacist</p>
                </div>
                <img src="https://i.pravatar.cc/150?u=pharma" alt="avatar" className="w-9 h-9 rounded-full object-cover" />
              </div>
            </div>
          </header>

          <div className="px-8 pb-16">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Pharmacy Dashboard</h1>
              <p className="text-slate-500 text-sm">Welcome back, {displayName}!</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {[
                { label: 'Total Products', value: stats.totalProducts, icon: '💊', color: 'from-blue-500 to-blue-600' },
                { label: 'Total Sales', value: stats.totalSales, icon: '📦', color: 'from-purple-500 to-purple-600' },
                { label: 'Pending Orders', value: stats.pendingOrders, icon: '⏳', color: 'from-amber-500 to-orange-500' },
                { label: 'Total Earnings', value: `₦${stats.totalEarnings.toLocaleString()}`, icon: '💰', color: 'from-green-500 to-emerald-600' },
              ].map((card) => (
                <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 text-white shadow`}>
                  <div className="text-3xl mb-2">{card.icon}</div>
                  <div className="text-2xl font-black">{loading ? '—' : card.value}</div>
                  <div className="text-xs font-medium opacity-80 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <Link href="/pharmacy/products/new" className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-3 group-hover:bg-[#1877F2] transition-colors">💊</div>
                <h3 className="font-bold text-slate-900 mb-1">Add Product</h3>
                <p className="text-xs text-slate-500">List a new medicine or product</p>
              </Link>
              <Link href="/pharmacy/sales" className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl mb-3 group-hover:bg-purple-500 transition-colors">📊</div>
                <h3 className="font-bold text-slate-900 mb-1">View Sales</h3>
                <p className="text-xs text-slate-500">Track orders and revenue</p>
              </Link>
              <Link href="/pharmacy/earnings" className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl mb-3 group-hover:bg-green-500 transition-colors">💰</div>
                <h3 className="font-bold text-slate-900 mb-1">Earnings</h3>
                <p className="text-xs text-slate-500">View earnings and withdraw</p>
              </Link>
            </div>

            {/* Recent Orders */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-900">Recent Orders</h2>
                <Link href="/pharmacy/sales" className="text-sm text-[#1877F2] font-semibold hover:underline">View all</Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No orders yet. Start listing products to receive orders.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-bold text-slate-600 uppercase border-b border-slate-200">
                      <th className="py-3 text-left">Patient</th>
                      <th className="py-3 text-center">Items</th>
                      <th className="py-3 text-center">Status</th>
                      <th className="py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: any) => (
                      <tr key={order.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-4 font-medium text-slate-900">{order.patient?.firstName || 'Patient'}</td>
                        <td className="py-4 text-center text-slate-600">{order.items?.length || 1}</td>
                        <td className="py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>{order.status}</span>
                        </td>
                        <td className="py-4 text-right font-bold text-slate-900">₦{(order.totalAmount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
