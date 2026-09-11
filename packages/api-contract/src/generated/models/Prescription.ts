/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PrescriptionItem } from './PrescriptionItem';
export type Prescription = {
  id: string;
  appointmentId: string | null;
  patientId: string;
  providerId: string;
  pharmacyId: string | null;
  status: string;
  signedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: Array<PrescriptionItem>;
};
