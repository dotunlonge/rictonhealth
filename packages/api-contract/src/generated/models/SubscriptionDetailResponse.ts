/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SubscriptionDetailResponse = {
  success: boolean;
  data: {
    id: string;
    userId: string;
    plan: 'FREE' | 'PREMIUM';
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
    payment: {
      amount: number;
      providerReference: string;
      createdAt: string;
    } | null;
    createdAt: string;
  };
};
