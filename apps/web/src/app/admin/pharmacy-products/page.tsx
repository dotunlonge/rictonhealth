'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { Package, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

type Product = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  price: number | string;
  stock: number;
  nafdacRegNo?: string | null;
  batchNumber?: string | null;
  supplierName?: string | null;
  expiryDate?: string | null;
  requiresPrescription?: boolean;
  pharmacy?: { email: string; pharmacyProfile?: { pharmacyName?: string | null } | null };
};

export default function PharmacyProductReviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await api.get<{ products: Product[] }>('/pharmacy/products/review/pending');
      setProducts(result.success ? result.data?.products || [] : []);
      if (!result.success) {
        setMessageError(true);
        setMessage(result.error?.message || 'Could not load product review queue.');
      }
      setLoading(false);
    }
    void load();
  }, []);

  const review = async (product: Product, verified: boolean) => {
    setActing(product.id);
    setMessage('');
    const result = await api.patch(`/pharmacy/products/${product.id}/verify`, { verified });
    setActing(null);
    if (result.success) {
      setMessageError(false);
      setMessage(
        verified
          ? `"${product.name}" approved — now visible in the patient store.`
          : `"${product.name}" rejected — it stays hidden from patients.`
      );
      setProducts((items) => items.filter((item) => item.id !== product.id));
    } else {
      setMessageError(true);
      setMessage(result.error?.message || 'Review action failed.');
    }
  };

  return (
    <SidebarLayout allowedRoles={['SUPER_ADMIN']}>
      <div className="space-y-8 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1877F2]" /> Pharmacy product review
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Approve only traceable, in-date regulated stock. Unverified products stay hidden
            from patients and cannot be ordered.
          </p>
        </div>

        {message && (
          <p
            className={`rounded-xl border p-3 text-xs font-bold ${
              messageError
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-200/80">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 mb-2">No products awaiting review</h3>
            <p className="text-slate-500 text-sm">
              New pharmacist listings will appear here for compliance approval.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <article
                key={product.id}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-wrap gap-6 items-start justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="font-bold text-slate-900">{product.name}</h2>
                  <p className="text-xs text-slate-500">
                    {product.pharmacy?.pharmacyProfile?.pharmacyName ||
                      product.pharmacy?.email ||
                      'Unknown pharmacy'}
                  </p>
                  <p className="text-xs text-slate-600">
                    NAFDAC: {product.nafdacRegNo || 'missing'} · Batch:{' '}
                    {product.batchNumber || 'missing'} · Supplier:{' '}
                    {product.supplierName || 'missing'} · Expiry:{' '}
                    {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : 'missing'}
                  </p>
                  <p className="text-xs text-slate-500">
                    ₦{Number(product.price).toLocaleString()} · {product.stock} in stock
                    {product.category ? ` · ${product.category}` : ''}
                    {product.requiresPrescription ? ' · Prescription required' : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={acting === product.id}
                    onClick={() => review(product, false)}
                    className="flex items-center gap-1.5 rounded-full border border-rose-300 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    disabled={acting === product.id}
                    onClick={() => review(product, true)}
                    className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
