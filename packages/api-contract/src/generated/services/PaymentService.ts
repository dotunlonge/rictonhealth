/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PaymentInitializeInput } from '../models/PaymentInitializeInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PaymentService {
  /**
   * Create payments webhook [payment]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiPaymentsWebhook(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/payments/webhook',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve payments banks [payment]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiPaymentsBanks(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/payments/banks',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve payments bank resolve [payment]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiPaymentsBankResolve(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/payments/bank/resolve',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create payments initialize [payment]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiPaymentsInitialize({
    requestBody,
  }: {
    requestBody?: PaymentInitializeInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/payments/initialize',
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
   * Retrieve payments id [payment]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiPayments({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/payments/{id}',
      path: {
        id: id,
      },
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
