/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PlansListResponse = {
  success: boolean;
  data: {
    plans: Array<{
      id: string;
      name: string;
      code: 'FREE' | 'PREMIUM';
      price: number;
      currency: string;
      billingPeriod: string;
      features: Array<string>;
      limitations: Array<string>;
    }>;
  };
};
