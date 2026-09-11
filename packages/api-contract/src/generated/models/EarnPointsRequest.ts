/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EarnPointsRequest = {
  userId: string;
  source: 'APPOINTMENT' | 'PRESCRIPTION' | 'PHARMACY_ORDER' | 'REFERRAL' | 'SIGNUP' | 'PROMOTION';
  referenceId: string;
  basePoints: number;
};
