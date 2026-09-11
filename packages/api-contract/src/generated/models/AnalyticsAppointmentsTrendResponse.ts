/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalyticsAppointmentsTrendResponse = {
  success: boolean;
  data: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    trend: Array<{
      period: string;
      count: number;
    }>;
  };
};
