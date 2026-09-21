'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { Pill, Package, ShoppingBag, Clock } from 'lucide-react';

const ACTIVE_ORDER_STATUSES = new Set([
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
]);

type PharmacyOrder = {
  id: string;
  status: string;
  totalAmount: number | string;
  items?: Array<{ drugName: string }>;
};

export default function PharmacyDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    pendingOrders: 0,
    totalEarnings: 0,
  });
  const [recentOrders, setRecentOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [productsRes, salesRes] = await Promise.all([
        api.get<{ products: unknown[] }>('/pharmacy/inventory'),
        api.get<{ orders: PharmacyOrder[] }>('/pharmacy/orders'),
      ]);

      const products = productsRes.success
        ? Array.isArray(productsRes.data)
          ? productsRes.data
          : productsRes.data?.products || []
        : [];
      const sales = salesRes.success
        ? Array.isArray(salesRes.data)
          ? salesRes.data
          : salesRes.data?.orders || []
        : [];
      const deliveredOrders = sales.filter((sale) => sale.status === 'DELIVERED');

      setStats({
        totalProducts: products.length,
        totalSales: deliveredOrders.length,
        pendingOrders: sales.filter((sale) => ACTIVE_ORDER_STATUSES.has(sale.status)).length,
        totalEarnings: deliveredOrders.reduce(
          (sum, sale) => sum + Number(sale.totalAmount ?? 0),
          0
        ),
      });
      setRecentOrders(sales.slice(0, 5));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <SidebarLayout allowedRoles={['PHARMACIST']}>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Pill className="w-6 h-6 text-[#1877F2]" /> Pharmacist Inventory & Dispatch Portal
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Licensed Pharmacy Operations: Prescription refills, stock management, and fulfillment
              dispatch
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Products In Stock
            </span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{stats.totalProducts}</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Dispensed Orders
            </span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">{stats.totalSales}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pending Fulfillment
            </span>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-amber-600">{stats.pendingOrders}</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0A192F] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-xl space-y-2 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Total Store Earnings
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-blue-300">₦</span>
              <span className="text-3xl font-black">{stats.totalEarnings.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Prescription Orders */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Recent Prescription Orders</h2>
          <div className="space-y-3">
            {loading ? (
              <p className="text-xs font-bold text-slate-400 py-4 text-center">Loading orders...</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 py-4 text-center">
                No active prescription orders found.
              </p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {order.items?.map((item) => item.drugName).join(', ') || `Order #${order.id}`}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {order.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <span className="font-extrabold text-[#1877F2]">
                    ₦{Number(order.totalAmount ?? 0).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
