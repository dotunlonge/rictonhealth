/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Appointment = {
  id: string;
  patientId: string;
  providerId: string;
  hospitalId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  type: 'IN_PERSON' | 'VIDEO';
  status: string;
  notes: string | null;
  cancellationReason: string | null;
  reason: string | null;
  reminderSentAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
};
