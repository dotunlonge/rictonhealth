/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdminHospitalInput } from '../models/AdminHospitalInput';
import type { AdminProvisionUserInput } from '../models/AdminProvisionUserInput';
import type { AdminUserStatusInput } from '../models/AdminUserStatusInput';
import type { AdminVerifyProviderInput } from '../models/AdminVerifyProviderInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminService {
  /**
   * Retrieve admin users [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAdminUsers(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/admin/users',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create admin users [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAdminUsers({
    requestBody,
  }: {
    requestBody?: AdminProvisionUserInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/admin/users',
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
   * Retrieve admin users id [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAdminUsers1({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/admin/users/{id}',
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
   * Update admin users id status [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static patchApiAdminUsersStatus({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: AdminUserStatusInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/admin/users/{id}/status',
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
   * Create admin users id verify [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAdminUsersVerify({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/admin/users/{id}/verify',
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
   * Retrieve admin providers pending [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAdminProvidersPending(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/admin/providers/pending',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create admin providers id verify [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAdminProvidersVerify({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: AdminVerifyProviderInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/admin/providers/{id}/verify',
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
   * Retrieve admin hospitals [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAdminHospitals(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/admin/hospitals',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create admin hospitals [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAdminHospitals({
    requestBody,
  }: {
    requestBody?: AdminHospitalInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/admin/hospitals',
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
   * Retrieve admin hospitals id [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAdminHospitals1({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/admin/hospitals/{id}',
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
   * Replace admin hospitals id [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static putApiAdminHospitals({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: AdminHospitalInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/admin/hospitals/{id}',
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
   * Retrieve admin audit-logs [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAdminAuditLogs(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/admin/audit-logs',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve admin analytics [admin]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAdminAnalytics(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/admin/analytics',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
