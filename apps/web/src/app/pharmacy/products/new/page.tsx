'use client';

import SidebarLayout from '@/components/layout/SidebarLayout';
import ProductEditor from '@/components/pharmacy/ProductEditor';

export default function NewProductPage() {
  return (
    <SidebarLayout allowedRoles={['PHARMACIST']}>
      <ProductEditor mode="new" />
    </SidebarLayout>
  );
}
