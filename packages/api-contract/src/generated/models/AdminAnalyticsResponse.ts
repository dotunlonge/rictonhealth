/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AdminAnalyticsResponse = {
  overview: {
    totalUsers: number;
    totalProviders: number;
    totalHospitals: number;
    totalAppointments: number;
    totalRevenue: number;
    activeSubscriptions: number;
  };
  growth: {
    userGrowth: Array<{
      date: string;
      count: number;
    }>;
    appointmentGrowth: Array<{
      date: string;
      count: number;
    }>;
    revenueGrowth: Array<{
      date: string;
      amount: number;
    }>;
  };
  topProviders: Array<{
    id: string;
    name: string;
    appointmentsCount: number;
    revenue: number;
    rating: number | null;
  }>;
};
