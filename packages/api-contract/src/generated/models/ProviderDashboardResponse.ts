/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProviderDashboardResponse = {
  success: boolean;
  data: {
    stats: {
      totalAppointments: number;
      pendingAppointments: number;
      completedAppointments: number;
      totalEarnings: number | string;
    };
    upcomingAppointments: Array<any>;
  };
};
