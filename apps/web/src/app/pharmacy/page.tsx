'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
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
  const [orderingId, setOrderingId] = useState<string | null>(null);

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

  const handleOrderProduct = async (product: PharmacyProduct) => {
    if (product.requiresPrescription) {
      setOrderMsg('Failed: Send your signed prescription to this pharmacy before fulfillment.');
      return;
    }
    setOrderingId(product.id);
    setOrderMsg(null);
    const res = await api.post('/pharmacy/orders', {
      items: [{ productId: product.id, quantity: 1 }],
    });

    setOrderingId(null);
    if (res.success) {
      setOrderMsg(`Order for ${product.name} submitted successfully!`);
      if (res.data) setOrders((prev) => [res.data, ...prev]);
    } else {
      setOrderMsg(`Failed: ${res.error?.message || 'Could not place order'}`);
    }
    setTimeout(() => setOrderMsg(null), 4000);
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
              orderMsg.startsWith('Failed:')
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{orderMsg}</span>
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
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {ord.items.map((item) => item.drugName).join(', ') || `Order #${ord.id}`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        {new Date(ord.createdAt).toLocaleDateString()} ·{' '}
                        {ord.status.replaceAll('_', ' ')}
                      </p>
                    </div>
                    <span className="font-black text-[#1877F2]">
                      ₦{Number(ord.totalAmount).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
