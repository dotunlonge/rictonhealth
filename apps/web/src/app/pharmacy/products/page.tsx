'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

const HEX_BG = `url("data:image/svg+xml,%3Csvg width='60' height='103.92' viewBox='0 0 60 103.92' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.92L0 86.6V51.96l30-17.32 30 17.32v34.64l-30 17.32zM30 86.6l20-11.55V51.96L30 40.41 10 51.96v23.09L30 86.6z' fill='%23FFFFFF' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`;

const navItems = [
  { label: 'Home', href: '/dashboard/pharmacy', icon: '🏠' },
  { label: 'Products', href: '/pharmacy/products', icon: '💊' },
  { label: 'Orders', href: '/dashboard/pharmacy', icon: '📊' },
  { label: 'Wallet', href: '/wallet', icon: '💳' },
  { label: 'Setting', href: '/settings', icon: '⚙️' },
];

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
};

export default function PharmacyProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      const res = await api.get('/pharmacy/inventory');
      if (res.success) {
        setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen flex font-sans">
      <aside className="w-40 bg-[#1877F2] text-white flex flex-col fixed h-full z-20 shadow-xl">
        <div className="p-4 flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-base">
            💊
          </div>
          <span className="text-lg font-bold">Ricton</span>
        </div>
        <nav className="flex-1 px-2 mt-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl hover:bg-white/10 opacity-80 hover:opacity-100 transition-all text-center ${item.href === '/pharmacy/products' ? 'bg-white/20 opacity-100' : ''}`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className="ml-40 flex-1 bg-gradient-to-br from-[#DAE8FE] to-[#EEF4FD] relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-30 pointer-events-none"
          style={{ backgroundImage: HEX_BG, backgroundSize: '110px 190px' }}
        />

        <div className="relative z-10 px-8 py-8 pb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Products</h1>
              <p className="text-slate-500 text-sm">{products.length} products listed</p>
            </div>
            <Link
              href="/pharmacy/products/new"
              className="bg-[#1877F2] hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-colors flex items-center gap-2"
            >
              <span>+</span> Add Product
            </Link>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="flex items-center gap-2 bg-white/70 border border-slate-200 rounded-full px-4 py-2 max-w-md">
              <span className="text-slate-400">🔍</span>
              <input
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white/80 rounded-3xl p-16 text-center shadow-sm">
              <div className="text-5xl mb-4">💊</div>
              <h3 className="font-bold text-slate-900 mb-2">No products found</h3>
              <p className="text-slate-500 text-sm mb-6">
                Start adding medicines and products to your pharmacy
              </p>
              <Link
                href="/pharmacy/products/new"
                className="inline-block bg-[#1877F2] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-blue-700 transition-colors"
              >
                Add First Product
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl mb-4 flex items-center justify-center text-4xl">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      '💊'
                    )}
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{product.name}</h3>
                      {product.category && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <span className="font-black text-[#1877F2] text-sm whitespace-nowrap">
                      ₦{Number(product.price).toLocaleString()}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        product.stock > 10
                          ? 'bg-green-100 text-green-700'
                          : product.stock > 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                    <Link
                      href={`/pharmacy/products/${product.id}`}
                      className="text-xs text-[#1877F2] font-semibold hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
