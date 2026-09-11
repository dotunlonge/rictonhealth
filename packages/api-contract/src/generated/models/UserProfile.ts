/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserProfile = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  patientProfile?: {
    firstName: string | null;
    lastName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    bloodType: string | null;
    allergies?: Array<string> | null;
    medicalHistory?: Array<{
      condition: string;
      diagnosedAt?: string;
      notes?: string;
    }> | null;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    } | null;
  } | null;
  providerProfile?: {
    firstName: string | null;
    lastName: string | null;
    specialty: string | null;
    consultationFee: number | null;
  } | null;
  pharmacyProfile?: {
    pharmacyName: string;
    licenseNumber?: string | null;
    isVerified?: boolean;
  } | null;
};
