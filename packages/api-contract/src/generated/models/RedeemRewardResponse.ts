/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RedeemRewardResponse = {
  redemption: {
    id: string;
    pointsUsed: number;
    reward: {
      id: string;
      name: string;
      description: string;
      pointsCost: number;
    };
    status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'REDEEMED' | 'CANCELLED';
    deliveredAt: string | null;
    createdAt: string;
  };
  newBalance: number;
};
