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
  prescriptionId?: string | null;
  items?: Array<{ drugName: string }>;
};

const NEXT_ACTIONS: Array<{ label: string; status: string }> = [
  { label: 'Confirm', status: 'CONFIRMED' },
  { label: 'Prepare', status: 'PREPARING' },
  { label: 'Ready', status: 'READY_FOR_PICKUP' },
  { label: 'Deliver', status: 'DELIVERED' },
];

export default function PharmacyDashboard() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    pendingOrders: 0,
    totalEarnings: 0,
  });
  const [recentOrders, setRecentOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [expandedRxId, setExpandedRxId] = useState<string | null>(null);
  const [linkedRx, setLinkedRx] = useState<Record<string, any>>({});
  const [loadingRxId, setLoadingRxId] = useState<string | null>(null);

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

  const setOrderStatus = async (orderId: string, status: string) => {
    if (
      !confirm(
        `${status === 'CANCELLED' ? 'Cancel' : `Move order to ${status.replaceAll('_', ' ')}`}?`
      )
    )
      return;
    setActingId(orderId);
    setActionMsg(null);
    const res = await api.patch(`/pharmacy/orders/${orderId}/status`, { status });
    setActingId(null);
    if (res.success) {
      setRecentOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      setActionMsg(`Order moved to ${status.replaceAll('_', ' ')}.`);
    } else {
      setActionMsg(res.error?.message || 'Status update failed.');
    }
  };

  // Unified worklist: load the linked prescription's full detail inline
  // (GET /prescriptions/:id — items, patient, prescriber, status) so the
  // pharmacist verifies before fulfilling without cross-navigating.
  const toggleLinkedRx = async (order: PharmacyOrder) => {
    if (!order.prescriptionId) return;
    if (expandedRxId === order.id) {
      setExpandedRxId(null);
      return;
    }
    setExpandedRxId(order.id);
    if (linkedRx[order.prescriptionId]) return;
    setLoadingRxId(order.id);
    const res = await api.get(`/prescriptions/${order.prescriptionId}`);
    setLoadingRxId(null);
    if (res.success && res.data) {
      setLinkedRx((prev) => ({ ...prev, [order.prescriptionId as string]: res.data }));
    }
  };

  const fulfillOrder = async (orderId: string, prescriptionId: string | null | undefined) => {
    if (!prescriptionId) {
      setActionMsg('No prescription linked to this order — status flow only.');
      return;
    }
    if (!confirm('Fulfill linked prescription (atomic order + stock)?')) return;
    setActingId(orderId);
    setActionMsg(null);
    const res = await api.post('/pharmacy/prescriptions/fulfill', { prescriptionId });
    setActingId(null);
    setActionMsg(res.success ? 'Prescription fulfilled.' : res.error?.message || 'Fulfill failed.');
  };

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
          {actionMsg && (
            <p className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-xl">
              {actionMsg}
            </p>
          )}
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
                  className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {order.items?.map((item) => item.drugName).join(', ') ||
                          `Order #${order.id}`}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400">
                        {order.status.replaceAll('_', ' ')}
                      </p>
                    </div>
                    <span className="font-extrabold text-[#1877F2]">
                      ₦{Number(order.totalAmount ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {NEXT_ACTIONS.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        disabled={actingId === order.id || order.status === action.status}
                        onClick={() => void setOrderStatus(order.id, action.status)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1877F2] hover:text-[#1877F2] text-slate-700 text-[11px] font-bold rounded-full transition-all disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    ))}
                    {order.prescriptionId && (
                      <>
                        <button
                          type="button"
                          onClick={() => void toggleLinkedRx(order)}
                          aria-expanded={expandedRxId === order.id}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1877F2] hover:text-[#1877F2] text-slate-700 text-[11px] font-bold rounded-full transition-all"
                        >
                          {expandedRxId === order.id ? 'Hide linked Rx' : 'View linked Rx'}
                        </button>
                        <button
                          type="button"
                          disabled={actingId === order.id}
                          onClick={() => void fulfillOrder(order.id, order.prescriptionId)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-full transition-all disabled:opacity-50"
                        >
                          Fulfill Rx
                        </button>
                      </>
                    )}
                    {order.prescriptionId && expandedRxId === order.id && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-[11px]">
                        {loadingRxId === order.id ? (
                          <p className="font-semibold text-slate-500">
                            Loading linked prescription…
                          </p>
                        ) : linkedRx[order.prescriptionId] ? (
                          <dl className="space-y-1.5">
                            <div className="flex justify-between gap-3">
                              <dt className="font-bold uppercase tracking-wide text-slate-400">
                                Rx status
                              </dt>
                              <dd className="font-bold text-slate-800">
                                {String(linkedRx[order.prescriptionId].status || '—').replaceAll(
                                  '_',
                                  ' '
                                )}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-bold uppercase tracking-wide text-slate-400">
                                Items
                              </dt>
                              <dd className="font-semibold text-slate-800">
                                {(linkedRx[order.prescriptionId].items || [])
                                  .map(
                                    (it: any) =>
                                      `${it.drugName}${it.dosage ? ` ${it.dosage}` : ''}${it.quantity ? ` ×${it.quantity}` : ''}`
                                  )
                                  .join('; ') || '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="font-bold uppercase tracking-wide text-slate-400">
                                Patient
                              </dt>
                              <dd className="font-semibold text-slate-800">
                                {linkedRx[order.prescriptionId].patient?.email || '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="font-bold uppercase tracking-wide text-slate-400">
                                Prescriber
                              </dt>
                              <dd className="font-semibold text-slate-800">
                                {linkedRx[order.prescriptionId].provider?.email || '—'}
                              </dd>
                            </div>
                          </dl>
                        ) : (
                          <p className="font-semibold text-rose-600">
                            Linked prescription could not be loaded (it may be outside your
                            dispensing scope).
                          </p>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={actingId === order.id}
                      onClick={() => void setOrderStatus(order.id, 'CANCELLED')}
                      className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-full transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
