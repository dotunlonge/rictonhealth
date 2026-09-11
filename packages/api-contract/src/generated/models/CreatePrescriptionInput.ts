/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreatePrescriptionInput = {
  patientId: string;
  appointmentId?: string;
  notes?: string;
  items: Array<{
    drugName: string;
    dosage: string;
    quantity: number;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
};
