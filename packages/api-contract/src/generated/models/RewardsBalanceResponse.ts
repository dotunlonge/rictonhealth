/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RewardsBalanceResponse = {
  userId: string;
  balance: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  nextTierPoints?: number;
  pointsToNextTier?: number;
};
