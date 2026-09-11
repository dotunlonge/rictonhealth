/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SubscriptionUpgradeInput } from '../models/SubscriptionUpgradeInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SubscriptionService {
  /**
   * Create subscriptions webhook [subscription]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiSubscriptionsWebhook(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/subscriptions/webhook',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve subscriptions plans [subscription]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSubscriptionsPlans(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/subscriptions/plans',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve subscriptions my [subscription]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSubscriptionsMy(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/subscriptions/my',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create subscriptions upgrade [subscription]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiSubscriptionsUpgrade({
    requestBody,
  }: {
    requestBody?: SubscriptionUpgradeInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/subscriptions/upgrade',
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
   * Create subscriptions cancel [subscription]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiSubscriptionsCancel(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/subscriptions/cancel',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve subscriptions history [subscription]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSubscriptionsHistory(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/subscriptions/history',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
