/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BookAppointmentInput = {
  providerId: string;
  hospitalId?: string;
  scheduledAt: string;
  type: 'IN_PERSON' | 'VIDEO';
  notes?: string;
  reason?: string;
  durationMinutes?: number;
};
