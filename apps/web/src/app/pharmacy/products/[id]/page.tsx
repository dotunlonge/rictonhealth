'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SidebarLayout from '@/components/layout/SidebarLayout';
import ProductEditor from '@/components/pharmacy/ProductEditor';

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  // The legacy `[id]='new'` hack is retired: /pharmacy/products/new now has a
  // dedicated route that takes precedence. Bounce any stale links there.
  useEffect(() => {
    if (id === 'new') router.replace('/pharmacy/products/new');
  }, [id, router]);

  if (!id || id === 'new') {
    return (
      <SidebarLayout allowedRoles={['PHARMACIST']}>
        <div className="rounded-3xl bg-white p-8 text-xs text-slate-400">
          Redirecting to the new product form…
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout allowedRoles={['PHARMACIST']}>
      <ProductEditor mode="edit" productId={id} />
    </SidebarLayout>
  );
}
