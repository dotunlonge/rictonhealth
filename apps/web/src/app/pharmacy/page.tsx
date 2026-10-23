'use client';

import { useEffect, useRef, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { createKeyScope } from '@/lib/idempotency';
import Link from 'next/link';
import { ShoppingBag, CheckCircle2, ShoppingCart, Search, Pill, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface PharmacyProduct {
  id: string;
  name: string;
  category: string | null;
  price: number | string;
  stock: number;
  description: string | null;
  requiresPrescription: boolean;
  imageUrl: string | null;
}

interface PharmacyOrder {
  id: string;
  items: Array<{ productId: string | null; drugName: string; quantity: number }>;
  totalAmount: number | string;
  status: string;
  createdAt: string;
  payment?: { status: string } | null;
  paymentId?: string | null;
}

function getRxPrescriptionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('rx');
  } catch {
    return null;
  }
}

export default function PharmacyPage() {
  const { user } = useAppStore();
  // Ordering is a patient action — staff browsing this store (e.g. a hospital
  // admin reviewing the pharmacy department) get a read-only catalog.
  const canOrder = (user?.role ?? 'PATIENT') === 'PATIENT';
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STORE' | 'ORDERS'>('STORE');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderMsg, setOrderMsg] = useState<string | null>(null);
  const [orderMsgError, setOrderMsgError] = useState(false);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  // Stable idempotency keys per order intent: double-clicks/timeout retries
  // replay instead of duplicating. Reset on success so a later identical
  // order is a new intent. Keys are secure-random (lib/idempotency).
  const orderKeys = useRef(createKeyScope());
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressPhone, setAddressPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const rxPrescriptionId = getRxPrescriptionId();

  useEffect(() => {
    async function loadPharmacyData() {
      setLoading(true);
      const prodRes = await api.get<{ products: PharmacyProduct[] }>('/pharmacy/products');
      setProducts(prodRes.success ? prodRes.data?.products || [] : []);

      const ordRes = await api.get<{ orders: PharmacyOrder[] }>('/pharmacy/orders');
      setOrders(ordRes.success ? ordRes.data?.orders || [] : []);
      setLoading(false);
    }
    loadPharmacyData();
  }, []);

  const showOrderMsg = (text: string, isError = false) => {
    setOrderMsg(text);
    setOrderMsgError(isError);
    setTimeout(() => {
      setOrderMsg(null);
      setOrderMsgError(false);
    }, 6000);
  };

  const startOrderPayment = async (orderId: string) => {
    setPayingId(orderId);
    const payRes = await api.post<{ authorization_url?: string; reference?: string }>(
      '/payments/initialize',
      { email: user?.email, type: 'PHARMACY_ORDER', referenceId: orderId }
    );
    setPayingId(null);
    if (payRes.success && payRes.data?.authorization_url) {
      showOrderMsg('Order placed — redirecting to Paystack to complete payment…');
      window.location.href = payRes.data.authorization_url;
      return true;
    }
    showOrderMsg(
      `Order ${orderId} placed (unpaid): ${payRes.error?.message || 'Could not start payment. Pay from My Orders.'}`,
      true
    );
    return false;
  };

  const handlePayExistingOrder = async (orderId: string) => {
    await startOrderPayment(orderId);
  };

  const handleOrderProduct = async (product: PharmacyProduct) => {
    if (product.requiresPrescription && !getRxPrescriptionId()) {
      showOrderMsg(
        'Failed: Send your signed prescription to this pharmacy before fulfillment.',
        true
      );
      return;
    }
    setOrderingId(product.id);
    setOrderMsg(null);
    // #137 Confirm before the money-mutating POST + attach an Idempotency-Key
    // so double-clicks / retries can't create duplicate orders.
    if (
      !window.confirm(
        `Place order for ${product.name} (₦${Number(product.price).toLocaleString()})?`
      )
    ) {
      setOrderingId(null);
      return;
    }
    const prescriptionId = getRxPrescriptionId();
    if (
      deliveryType === 'DELIVERY' &&
      (!addressLine1.trim() || !addressCity.trim() || !addressPhone.trim())
    ) {
      setOrderingId(null);
      showOrderMsg('Failed: Add street address, city, and phone for DELIVERY orders.', true);
      return;
    }
    const orderIntent = [
      product.id,
      deliveryType,
      prescriptionId || 'no-rx',
      orderNotes.trim(),
      deliveryType === 'DELIVERY'
        ? `${addressLine1.trim()}|${addressCity.trim()}|${addressPhone.trim()}`
        : 'pickup',
    ];
    const idempotencyKey = orderKeys.current.keyFor(...orderIntent);
    const res = await api.post<PharmacyOrder>(
      '/pharmacy/orders',
      {
        items: [{ productId: product.id, quantity: 1 }],
        deliveryType,
        ...(deliveryType === 'DELIVERY'
          ? {
              deliveryAddress: {
                line1: addressLine1.trim(),
                city: addressCity.trim(),
                phone: addressPhone.trim(),
              },
            }
          : {}),
        ...(orderNotes.trim() ? { notes: orderNotes.trim() } : {}),
        ...(prescriptionId ? { prescriptionId } : {}),
      },
      { idempotencyKey }
    );

    setOrderingId(null);
    if (res.success && res.data) {
      orderKeys.current.reset(...orderIntent);
      const order = res.data as PharmacyOrder & { id?: string };
      const orderId = order.id || (res.data as unknown as { id: string }).id;
      if (orderId) setOrders((prev) => [res.data as PharmacyOrder, ...prev]);
      if (orderId) {
        await startOrderPayment(orderId);
      } else {
        showOrderMsg(`Order for ${product.name} submitted successfully!`);
      }
    } else {
      showOrderMsg(`Failed: ${res.error?.message || 'Could not place order'}`, true);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header Title */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#1877F2]" /> Online Pharmacy & Prescription
              Store
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Order verified medications, prescription refills, and healthcare supplements with
              direct home delivery
            </p>
          </div>

          {/* Search & Tabs */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search store items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] shadow-xs"
              />
            </div>

            <div className="flex items-center bg-slate-200/60 p-1 rounded-full border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('STORE')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'STORE'
                    ? 'bg-[#1877F2] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Store Front
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ORDERS')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'ORDERS'
                    ? 'bg-[#1877F2] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Orders ({orders.length})
              </button>
            </div>
          </div>
        </div>

        {orderMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              orderMsgError || orderMsg.startsWith('Failed:')
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{orderMsg}</span>
          </div>
        )}

        {/* Checkout options */}
        {canOrder && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                Fulfillment
                <select
                  value={deliveryType}
                  onChange={(e) => setDeliveryType(e.target.value as 'PICKUP' | 'DELIVERY')}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                >
                  <option value="PICKUP">PICKUP</option>
                  <option value="DELIVERY">DELIVERY</option>
                </select>
              </label>
              <input
                type="text"
                placeholder="Order notes (optional)"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="flex-1 min-w-52 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
              />
              {rxPrescriptionId && (
                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                  Prescription linked (?rx={rxPrescriptionId.slice(0, 8)}…)
                </span>
              )}
            </div>
            {deliveryType === 'DELIVERY' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <textarea
                  placeholder="Street address (line1)"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  rows={2}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2] h-fit"
                />
                <input
                  type="tel"
                  placeholder="Delivery phone"
                  value={addressPhone}
                  onChange={(e) => setAddressPhone(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1877F2] h-fit"
                />
              </div>
            )}
          </div>
        )}

        {/* Store Front Grid */}
        {activeTab === 'STORE' ? (
          loading ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-3xl border border-slate-200/80">
              Loading pharmaceutical inventory catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80">
              <Pill className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">
                No pharmacy products found in catalog
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-6 flex flex-col justify-between hover:border-[#1877F2]/40 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {prod.category && (
                        <span className="px-3 py-1 bg-blue-50 text-[#1877F2] text-[10px] font-extrabold uppercase rounded-full tracking-wider">
                          {prod.category}
                        </span>
                      )}
                      {prod.requiresPrescription && (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Rx Required
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200/80 text-[#1877F2] flex items-center justify-center font-bold shrink-0">
                        <Pill className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-sm">{prod.name}</h2>
                        {prod.description && (
                          <p className="text-xs text-slate-500 font-semibold mt-1 leading-snug line-clamp-2">
                            {prod.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Price
                      </span>
                      <span className="text-lg font-black text-slate-900">
                        ₦{Number(prod.price).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-right">
                      {canOrder ? (
                        <button
                          type="button"
                          onClick={() => handleOrderProduct(prod)}
                          disabled={
                            prod.requiresPrescription || prod.stock <= 0 || orderingId === prod.id
                          }
                          className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>
                            {orderingId === prod.id
                              ? 'Ordering...'
                              : prod.stock <= 0
                                ? 'Out of stock'
                                : prod.requiresPrescription
                                  ? 'Prescription required'
                                  : 'Order Now'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Staff view — ordering is patient-only
                        </span>
                      )}
                      {prod.requiresPrescription && (
                        <Link
                          href="/prescriptions"
                          className="mt-2 block text-[10px] font-bold text-[#1877F2] hover:underline"
                        >
                          Send prescription to a pharmacy
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* My Orders Tab */
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Pharmacy Order History</h2>
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  No previous pharmacy orders placed yet.
                </div>
              ) : (
                orders.map((ord) => {
                  const payStatus = ord.payment?.status;
                  const isPaid = payStatus === 'SUCCESS';
                  return (
                    <details
                      key={ord.id}
                      className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs"
                    >
                      <summary className="flex items-center justify-between gap-3 flex-wrap cursor-pointer list-none">
                        <div>
                          <p className="font-bold text-slate-900">
                            {ord.items.map((item) => item.drugName).join(', ') ||
                              `Order #${ord.id}`}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : ''} ·{' '}
                            {ord.status.replaceAll('_', ' ')} ·{' '}
                            <span className="text-[#1877F2]">Details</span>
                          </p>
                          <span
                            className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {isPaid ? 'Paid' : payStatus ? `Unpaid (${payStatus})` : 'Unpaid'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[#1877F2]">
                            ₦{Number(ord.totalAmount).toLocaleString()}
                          </span>
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePayExistingOrder(ord.id);
                              }}
                              disabled={payingId === ord.id}
                              className="px-4 py-2 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs disabled:opacity-50"
                            >
                              {payingId === ord.id ? 'Starting payment…' : 'Pay now'}
                            </button>
                          )}
                        </div>
                      </summary>
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                        <p className="font-bold text-slate-900">Items</p>
                        <ul className="space-y-1">
                          {ord.items.map((item, idx) => (
                            <li
                              key={`${item.productId ?? item.drugName}-${idx}`}
                              className="text-slate-600"
                            >
                              {item.drugName} × {item.quantity}
                            </li>
                          ))}
                        </ul>
                        <p className="text-slate-600">
                          Status:{' '}
                          <span className="font-bold text-slate-900">
                            {ord.status.replaceAll('_', ' ')}
                          </span>
                        </p>
                        <p className="text-slate-600">
                          Payment:{' '}
                          <span className="font-bold text-slate-900">
                            {isPaid ? 'Paid' : payStatus ? `Unpaid (${payStatus})` : 'Unpaid'}
                          </span>
                        </p>
                        <p className="text-slate-600">
                          Track: order <span className="font-mono">{ord.id.slice(0, 8)}…</span> ·{' '}
                          {ord.status === 'DELIVERED'
                            ? 'Delivered — complete.'
                            : ord.status === 'CANCELLED'
                              ? 'Cancelled — terminal.'
                              : 'In progress — the pharmacy updates status as it fulfills.'}
                        </p>
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
