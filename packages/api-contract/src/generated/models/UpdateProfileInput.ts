/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies?: Array<string>;
  specialty?: string;
  consultationFee?: number;
  title?: string;
  pharmacyName?: string;
  hospitalName?: string;
  registrationNumber?: string;
  cacNumber?: string;
  facilityTier?: string;
  ownershipType?: string;
  address?: string | Record<string, any>;
  city?: string;
  state?: string;
  emergencyPhone?: string;
  supportEmail?: string;
  website?: string;
  totalBeds?: string | number;
  icuBeds?: string | number;
  operatingRooms?: string | number;
  ambulances?: string | number;
  departments?: Array<string>;
  medicalDirector?: Record<string, any>;
  documents?: Record<string, any>;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  bankDetails?: Record<string, any>;
  settlementFrequency?: string;
};
