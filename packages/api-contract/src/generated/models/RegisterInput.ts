/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RegisterInput = {
  email?: string;
  phone?: string;
  password: string;
  role: 'PATIENT' | 'CONSULTANT' | 'PHARMACIST';
  firstName?: string;
  lastName?: string;
  consentVersion: string;
};
