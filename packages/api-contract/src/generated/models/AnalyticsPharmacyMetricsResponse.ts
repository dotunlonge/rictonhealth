/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalyticsPharmacyMetricsResponse = {
  success: boolean;
  data: {
    totalPharmacies: number;
    verifiedPharmacies: number;
    totalOrders: number;
    ordersByStatus: Record<string, number>;
    totalOrderValue: number;
  };
};
