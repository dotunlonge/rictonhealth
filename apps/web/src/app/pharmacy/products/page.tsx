'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { Package, Plus, Search, Pill, AlertTriangle } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  imageUrl?: string;
  expiryDate?: string | null;
  // New listings are created inactive and only go live once a Ricton admin
  // verifies them; the inventory endpoint (unlike the public catalog) still
  // returns them so the pharmacist can track them.
  isActive?: boolean;
};

const LOW_STOCK_AT_OR_BELOW = 10;
const EXPIRING_WITHIN_DAYS = 90;

type AttentionKind = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'EXPIRED' | 'EXPIRING_SOON';

function attentionFor(p: Product, now: number): AttentionKind[] {
  const kinds: AttentionKind[] = [];
  if (p.stock <= 0) kinds.push('OUT_OF_STOCK');
  else if (p.stock <= LOW_STOCK_AT_OR_BELOW) kinds.push('LOW_STOCK');
  if (p.expiryDate) {
    const t = new Date(p.expiryDate).getTime();
    if (!Number.isNaN(t)) {
      if (t < now) kinds.push('EXPIRED');
      else if (t - now <= EXPIRING_WITHIN_DAYS * 24 * 60 * 60 * 1000) kinds.push('EXPIRING_SOON');
    }
  }
  return kinds;
}

const ATTENTION_LABEL: Record<AttentionKind, string> = {
  OUT_OF_STOCK: 'Out of stock',
  LOW_STOCK: 'Low stock (≤10)',
  EXPIRED: 'Expired',
  EXPIRING_SOON: 'Expiring ≤90 days',
};

export default function PharmacyProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Snapshot "now" when inventory loads so expiry attention stays stable
  // across re-renders (Date.now() in render is impure).
  const [now, setNow] = useState(0);

  useEffect(() => {
    async function load() {
      const res = await api.get('/pharmacy/inventory');
      if (res.success) {
        setProducts(Array.isArray(res.data) ? res.data : res.data?.products || []);
      }
      setNow(Date.now());
      setLoading(false);
    }
    load();
  }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const needsAttention = filtered
    .map((p) => ({ product: p, kinds: attentionFor(p, now) }))
    .filter((e) => e.kinds.length > 0);
  const pendingReview = filtered.filter((p) => p.isActive === false).length;

  return (
    <SidebarLayout allowedRoles={['PHARMACIST']}>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-[#1877F2]" /> Products & Inventory
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {products.length} products listed — manage stock, pricing, and expiries
              {pendingReview > 0 && (
                <span className="text-amber-600">
                  {' · '}
                  {pendingReview} awaiting admin review
                </span>
              )}
            </p>
          </div>
          <Link
            href="/pharmacy/products/new"
            className="bg-[#1877F2] hover:bg-[#1565C0] text-white px-5 py-2.5 rounded-full font-bold text-sm transition-colors flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4 pointer-events-none" />
          <input
            type="search"
            aria-label="Search products"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] shadow-xs"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!loading && needsAttention.length > 0 && (
          <section
            aria-label="Products needing attention"
            className="bg-white rounded-3xl border border-amber-200 p-6 shadow-sm space-y-3"
          >
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Needs attention ({needsAttention.length})
            </h2>
            <ul className="space-y-2">
              {needsAttention.slice(0, 8).map(({ product, kinds }) => (
                <li key={product.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-900 truncate">{product.name}</span>
                  <span className="flex gap-1.5 flex-wrap justify-end">
                    {kinds.map((k) => (
                      <span
                        key={k}
                        className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                          k === 'OUT_OF_STOCK' || k === 'EXPIRED'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {ATTENTION_LABEL[k]}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            {needsAttention.length > 8 && (
              <p className="text-[11px] font-semibold text-slate-500">
                +{needsAttention.length - 8} more below — search to narrow.
              </p>
            )}
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-200/80">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 mb-2">No products found</h3>
            <p className="text-slate-500 text-sm mb-6">
              Start adding medicines and products to your pharmacy
            </p>
            <Link
              href="/pharmacy/products/new"
              className="inline-block bg-[#1877F2] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#1565C0] transition-colors shadow-md shadow-blue-500/20"
            >
              Add First Product
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 hover:border-[#1877F2]/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-full h-32 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Pill className="w-8 h-8 text-[#1877F2]" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{product.name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {product.category && (
                          <span className="text-[10px] text-[#1877F2] bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                            {product.category}
                          </span>
                        )}
                        {product.isActive === false && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-bold">
                            Pending review
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-sm whitespace-nowrap">
                      ₦{Number(product.price).toLocaleString()}
                    </span>
                  </div>
                  {product.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
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
    </SidebarLayout>
  );
}
