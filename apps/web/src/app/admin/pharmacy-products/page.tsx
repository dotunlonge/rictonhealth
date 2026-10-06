'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

type Product = {
  id: string; name: string; nafdacRegNo?: string | null; batchNumber?: string | null;
  supplierName?: string | null; expiryDate?: string | null;
  pharmacy?: { email: string; pharmacyProfile?: { pharmacyName?: string | null } | null };
};

export default function PharmacyProductReviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    const result = await api.get<{ products: Product[] }>('/pharmacy/products/review/pending');
    setProducts(result.success ? result.data?.products || [] : []);
    if (!result.success) setMessage(result.error?.message || 'Could not load product review queue.');
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const review = async (product: Product, verified: boolean) => {
    setActing(product.id); setMessage('');
    const result = await api.patch(`/pharmacy/products/${product.id}/verify`, { verified });
    setActing(null);
    if (result.success) setProducts((items) => items.filter((item) => item.id !== product.id));
    else setMessage(result.error?.message || 'Review action failed.');
  };
  return <main className="mx-auto max-w-6xl p-8 space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-extrabold">Pharmacy product review</h1><p className="text-sm text-slate-500">Approve only traceable, in-date regulated stock.</p></div><Link href="/admin" className="text-sm font-bold text-blue-600">Admin home</Link></div>
    {message && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
    {loading ? <p>Loading review queue…</p> : products.length === 0 ? <p className="rounded-xl bg-slate-50 p-8 text-slate-500">No products await review.</p> : <div className="space-y-3">{products.map((product) => <article key={product.id} className="rounded-xl border bg-white p-5 flex flex-wrap gap-4 items-center justify-between"><div><h2 className="font-bold">{product.name}</h2><p className="text-sm text-slate-500">{product.pharmacy?.pharmacyProfile?.pharmacyName || product.pharmacy?.email}</p><p className="text-xs text-slate-600 mt-2">NAFDAC: {product.nafdacRegNo || 'missing'} · Batch: {product.batchNumber || 'missing'} · Supplier: {product.supplierName || 'missing'} · Expiry: {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : 'missing'}</p></div><div className="flex gap-2"><button disabled={acting === product.id} onClick={() => review(product, false)} className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700">Reject</button><button disabled={acting === product.id} onClick={() => review(product, true)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Approve</button></div></article>)}</div>}
  </main>;
}
