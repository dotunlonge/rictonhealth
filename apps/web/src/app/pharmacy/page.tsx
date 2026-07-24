'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

export default function PharmacyPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STORE' | 'ORDERS'>('STORE');

  useEffect(() => {
    async function loadPharmacyData() {
      const prodRes = await api.get('/pharmacy/products');
      if (prodRes.success && prodRes.data) {
        setProducts(Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || []);
      }

      const ordRes = await api.get('/pharmacy/orders');
      if (ordRes.success && ordRes.data) {
        setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data.orders || []);
      }

      setLoading(false);
    }
    loadPharmacyData();
  }, []);

  const handleOrderProduct = async (product: any) => {
    const res = await api.post('/pharmacy/orders', {
      items: [{ productId: product.id, quantity: 1, price: product.price || 5000 }],
      deliveryAddress: 'Default User Address',
    });

    if (res.success) {
      alert(`Order placed successfully for ${product.name}!`);
      const ordRes = await api.get('/pharmacy/orders');
      if (ordRes.success && ordRes.data) {
        setOrders(Array.isArray(ordRes.data) ? ordRes.data : ordRes.data.orders || []);
      }
    } else {
      alert(res.error?.message || 'Order failed to place.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="p-2 bg-teal-600 text-white rounded-xl font-bold">🛒</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">Ricton Pharmacy</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Dashboard
            </Link>
            <Link href="/prescriptions" className="text-slate-600 dark:text-slate-300 hover:text-teal-600">
              Prescriptions
            </Link>
            <Link href="/pharmacy" className="text-teal-600 font-semibold">
              Pharmacy Store
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Digital Pharmacy Store</h1>
            <p className="text-sm text-slate-500">Order genuine medications delivered directly to your doorstep</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('STORE')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'STORE' ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              Medications Store
            </button>
            <button
              onClick={() => setActiveTab('ORDERS')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                activeTab === 'ORDERS' ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              My Orders ({orders.length})
            </button>
          </div>
        </div>

        {activeTab === 'STORE' ? (
          loading ? (
            <p className="text-sm text-slate-500 py-8 text-center">Loading medication inventory...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {(products.length > 0
                ? products
                : [
                    { id: 'p1', name: 'Paracetamol 500mg', category: 'Pain Relief', price: 1500 },
                    { id: 'p2', name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 4500 },
                    { id: 'p3', name: 'Vitamin C 1000mg', category: 'Supplements', price: 3000 },
                    { id: 'p4', name: 'Omeprazole 20mg', category: 'Gastrointestinal', price: 5200 },
                  ]
              ).map((product) => (
                <div
                  key={product.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div>
                    <span className="px-2.5 py-0.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-full text-[10px] font-bold">
                      {product.category || 'General'}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white mt-2 text-sm">{product.name}</h3>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      ₦{parseFloat(product.price).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleOrderProduct(product)}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs transition-colors"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500">No pharmacy orders placed yet.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">Order #{order.id.slice(-6)}</p>
                    <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                    {order.status || 'PROCESSING'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
