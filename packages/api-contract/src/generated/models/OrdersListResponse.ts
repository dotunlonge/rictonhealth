/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type OrdersListResponse = {
  success: boolean;
  data: {
    orders: Array<{
      id: string;
      patientId: string;
      pharmacyId: string;
      prescriptionId: string | null;
      status:
        | 'PLACED'
        | 'CONFIRMED'
        | 'PREPARING'
        | 'READY_FOR_PICKUP'
        | 'OUT_FOR_DELIVERY'
        | 'DELIVERED'
        | 'CANCELLED';
      totalAmount: number | string;
      deliveryType: 'DELIVERY' | 'PICKUP';
      deliveryAddress?: any;
      notes: string | null;
      items: Array<{
        id: string;
        productId: string | null;
        drugName: string;
        quantity: number;
        unitPrice: number | string;
        subtotal: number | string;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  };
};
