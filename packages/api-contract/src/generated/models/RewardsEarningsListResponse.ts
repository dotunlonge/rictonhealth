/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RewardsEarningsListResponse = {
  earnings: Array<{
    id: string;
    points: number;
    source: 'APPOINTMENT' | 'PRESCRIPTION' | 'PHARMACY_ORDER' | 'REFERRAL' | 'SIGNUP' | 'PROMOTION';
    description: string;
    referenceId: string | null;
    createdAt: string;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
