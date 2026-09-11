/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { EarnPointsRequest } from '../models/EarnPointsRequest';
import type { RedeemRewardRequest } from '../models/RedeemRewardRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RewardsService {
  /**
   * Create rewards internal earn [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiRewardsInternalEarn({
    requestBody,
  }: {
    requestBody?: EarnPointsRequest;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/rewards/internal/earn',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve rewards balance [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiRewardsBalance(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/rewards/balance',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve rewards earnings [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiRewardsEarnings(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/rewards/earnings',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve rewards redemptions [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiRewardsRedemptions(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/rewards/redemptions',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create rewards redeem [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiRewardsRedeem({
    requestBody,
  }: {
    requestBody?: RedeemRewardRequest;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/rewards/redeem',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create rewards claim [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiRewardsClaim({
    requestBody,
  }: {
    requestBody?: RedeemRewardRequest;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/rewards/claim',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve rewards catalog [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiRewardsCatalog(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/rewards/catalog',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve rewards tiers [rewards]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiRewardsTiers(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/rewards/tiers',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
