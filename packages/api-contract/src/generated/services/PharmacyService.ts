/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FulfillPrescriptionInput } from '../models/FulfillPrescriptionInput';
import type { PharmacyOrderStatusInput } from '../models/PharmacyOrderStatusInput';
import type { PharmacyProductInput } from '../models/PharmacyProductInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PharmacyService {
  /**
   * Create pharmacy products [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiPharmacyProducts({
    requestBody,
  }: {
    requestBody?: PharmacyProductInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/pharmacy/products',
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
   * Retrieve pharmacy products id [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiPharmacyProducts({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/products/{id}',
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
  /**
   * Replace pharmacy products id [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static putApiPharmacyProducts({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: PharmacyProductInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/pharmacy/products/{id}',
      path: {
        id: id,
      },
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
   * Remove pharmacy products id [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static deleteApiPharmacyProducts({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/pharmacy/products/{id}',
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
  /**
   * Retrieve pharmacy categories [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiPharmacyCategories(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/categories',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve pharmacy orders id [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiPharmacyOrders({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/pharmacy/orders/{id}',
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
  /**
   * Update pharmacy orders id cancel [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static patchApiPharmacyOrdersCancel({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/pharmacy/orders/{id}/cancel',
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
  /**
   * Update pharmacy orders id status [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static patchApiPharmacyOrdersStatus({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: PharmacyOrderStatusInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/pharmacy/orders/{id}/status',
      path: {
        id: id,
      },
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
   * Create pharmacy prescriptions fulfill [pharmacy]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiPharmacyPrescriptionsFulfill({
    requestBody,
  }: {
    requestBody?: FulfillPrescriptionInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/pharmacy/prescriptions/fulfill',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
