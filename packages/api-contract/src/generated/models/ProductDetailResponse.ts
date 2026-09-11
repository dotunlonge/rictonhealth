/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProductDetailResponse = {
  success: boolean;
  data: {
    id: string;
    name: string;
    description: string | null;
    price: number | string;
    category: string | null;
    imageUrl: string | null;
    stock: number;
    requiresPrescription: boolean;
    isActive: boolean;
    pharmacyId: string;
    createdAt: string;
  };
};
