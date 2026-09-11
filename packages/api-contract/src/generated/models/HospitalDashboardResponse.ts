/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type HospitalDashboardResponse = {
  success: boolean;
  data: {
    hospital: {
      id: string;
      name: string;
      phone: string | null;
      email: string | null;
      logoUrl: string | null;
      isActive: boolean;
      createdAt: string;
    };
    stats: {
      totalDoctors: number;
      totalAppointments: number;
      activePatients: number;
    };
  };
};
