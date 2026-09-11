/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateAppointment = {
  providerId: string;
  scheduledAt: string;
  type: 'IN_PERSON' | 'VIDEO';
  reason?: string;
  durationMinutes?: number;
  hospitalId?: string;
};
