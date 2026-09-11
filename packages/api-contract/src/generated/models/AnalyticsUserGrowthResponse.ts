/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalyticsUserGrowthResponse = {
  success: boolean;
  data: {
    totalUsers: number;
    byRole: Record<string, number>;
    trend: Array<{
      period: string;
      count: number;
    }>;
  };
};
