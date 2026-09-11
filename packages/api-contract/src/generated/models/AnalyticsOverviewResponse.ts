/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AnalyticsOverviewResponse = {
  success: boolean;
  data: {
    totalUsers: number;
    totalPatients: number;
    totalProviders: number;
    totalPharmacists: number;
    totalHospitals: number;
    totalAppointments: number;
    completedAppointments: number;
    totalRevenue: number;
    activeSubscriptions: number;
  };
};
