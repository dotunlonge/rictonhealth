/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalyticsProviderPerformanceResponse = {
  success: boolean;
  data: {
    providers: Array<{
      providerId: string;
      name: string;
      specialty: string | null;
      appointmentCount: number;
      completedCount: number;
      rating: number | null;
    }>;
    total: number;
    limit: number;
    offset: number;
  };
};
