/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Appointment } from './Appointment';
export type ListAppointmentsResponse = {
  success: boolean;
  data: {
    appointments: Array<Appointment>;
    meta: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};
