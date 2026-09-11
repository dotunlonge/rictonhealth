/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RewardsCatalogResponse = {
  items: Array<{
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: string;
    imageUrl: string | null;
    stock: number;
    isActive: boolean;
    tierRequired: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | null;
  }>;
  categories: Array<string>;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
