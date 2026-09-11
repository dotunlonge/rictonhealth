/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalyticsRevenueResponse = {
  success: boolean;
  data: {
    totalRevenue: number;
    byType: Record<string, number>;
    trend: Array<{
      period: string;
      amount: number;
    }>;
  };
};
