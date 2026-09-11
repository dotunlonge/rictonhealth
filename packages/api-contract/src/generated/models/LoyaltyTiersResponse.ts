/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LoyaltyTiersResponse = {
  tiers: Array<{
    name: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    minPoints: number;
    benefits: Array<string>;
    multiplier: number;
  }>;
  userTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
};
