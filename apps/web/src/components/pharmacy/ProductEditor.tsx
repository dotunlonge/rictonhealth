'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ChevronLeft } from 'lucide-react';

type ProductForm = {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  imageUrl: string;
  nafdacRegNo: string;
  batchNumber: string;
  supplierName: string;
  expiryDate: string;
  requiresPrescription: boolean;
};

const emptyForm: ProductForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  stock: '',
  imageUrl: '',
  nafdacRegNo: '',
  batchNumber: '',
  supplierName: '',
  expiryDate: '',
  requiresPrescription: false,
};

/**
 * Shared pharmacist product editor.
 * - mode 'new': creates via POST /pharmacy/products (products write family).
 * - mode 'edit': loads ownership-scoped GET /pharmacy/inventory/:id, saves via
 *   PUT /pharmacy/products/:id, removes via DELETE /pharmacy/products/:id.
 */
export default function ProductEditor({
  mode,
  productId,
}: {
  mode: 'new' | 'edit';
  productId?: string;
}) {
  const router = useRouter();
  const isNew = mode === 'new';
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      if (isNew || !productId) return;
      const res = await api.get<{
        name: string;
        description?: string | null;
        category?: string | null;
        price: number | string;
        stock: number;
        imageUrl?: string | null;
        requiresPrescription: boolean;
        nafdacRegNo?: string | null;
        batchNumber?: string | null;
        supplierName?: string | null;
        expiryDate?: string | null;
      }>(`/pharmacy/inventory/${productId}`);
      if (res.success && res.data) {
        setForm({
          name: res.data.name,
          description: res.data.description || '',
          category: res.data.category || '',
          price: String(res.data.price),
          stock: String(res.data.stock),
          imageUrl: res.data.imageUrl || '',
          requiresPrescription: res.data.requiresPrescription,
          nafdacRegNo: res.data.nafdacRegNo || '',
          batchNumber: res.data.batchNumber || '',
          supplierName: res.data.supplierName || '',
          expiryDate: res.data.expiryDate ? String(res.data.expiryDate).slice(0, 10) : '',
        });
      } else {
        setIsError(true);
        setMessage(res.error?.message || 'Unable to load this product.');
      }
      setLoading(false);
    }
    void loadProduct();
  }, [productId, isNew]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isNew && !productId) return;
    setSaving(true);
    setMessage('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || 'General',
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl.trim() || undefined,
      requiresPrescription: form.requiresPrescription,
      nafdacRegNo: form.nafdacRegNo.trim(),
      batchNumber: form.batchNumber.trim(),
      supplierName: form.supplierName.trim(),
      expiryDate: form.expiryDate,
    };
    const res = isNew
      ? await api.post('/pharmacy/products', payload)
      : await api.put(`/pharmacy/products/${productId}`, payload);
    setSaving(false);
    if (res.success) {
      setIsError(false);
      setMessage(isNew ? 'Product created.' : 'Product updated.');
      if (isNew && res.data?.id) router.replace(`/pharmacy/products/${res.data.id}`);
    } else {
      setIsError(true);
      setMessage(res.error?.message || 'Unable to save this product.');
    }
  };

  const remove = async () => {
    if (isNew || !productId || !confirm('Remove this product from the active catalog?')) return;
    setSaving(true);
    const res = await api.delete(`/pharmacy/products/${productId}`);
    setSaving(false);
    if (res.success) router.push('/pharmacy/products');
    else {
      setIsError(true);
      setMessage(res.error?.message || 'Unable to remove this product.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push('/pharmacy/products')}
        className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#1877F2]"
      >
        <ChevronLeft className="w-4 h-4" /> Back to products
      </button>
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {isNew ? 'Add product' : 'Edit product'}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          New stock is held for compliance review before it reaches patients.
        </p>
      </div>
      {message && (
        <div
          className={`rounded-xl border p-3 text-xs font-bold ${isError ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
        >
          {message}
        </div>
      )}
      {loading ? (
        <div className="rounded-3xl bg-white p-8 text-xs text-slate-400">Loading product…</div>
      ) : (
        <form
          onSubmit={submit}
          className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <label className="text-xs font-bold text-slate-700 md:col-span-2">
            Name *
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Price (NGN) *
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Stock *
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(event) => setForm({ ...form, stock: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Category
            <input
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Image URL
            <input
              type="url"
              value={form.imageUrl}
              onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            NAFDAC registration no. *
            <input
              required
              minLength={6}
              value={form.nafdacRegNo}
              onChange={(event) => setForm({ ...form, nafdacRegNo: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Batch number *
            <input
              required
              minLength={2}
              value={form.batchNumber}
              onChange={(event) => setForm({ ...form, batchNumber: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Supplier *
            <input
              required
              minLength={2}
              value={form.supplierName}
              onChange={(event) => setForm({ ...form, supplierName: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700">
            Expiry date *
            <input
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={form.expiryDate}
              onChange={(event) => setForm({ ...form, expiryDate: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="text-xs font-bold text-slate-700 md:col-span-2">
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal"
            />
          </label>
          <label className="flex items-center gap-3 text-xs font-bold text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={form.requiresPrescription}
              onChange={(event) => setForm({ ...form, requiresPrescription: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            A valid prescription is required before this medication can be fulfilled
          </label>
          <div className="md:col-span-2 flex justify-between gap-3">
            {!isNew ? (
              <button
                type="button"
                disabled={saving}
                onClick={remove}
                className="rounded-xl border border-rose-200 px-5 py-3 text-xs font-bold text-rose-700 disabled:opacity-50"
              >
                Remove product
              </button>
            ) : (
              <span />
            )}
            <button
              disabled={saving}
              className="rounded-xl bg-[#1877F2] px-6 py-3 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save product'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
