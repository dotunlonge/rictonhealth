/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SmartguardService {
  /**
   * Retrieve smartguard status [smartguard]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSmartguardStatus(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/smartguard/status',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve smartguard alerts [smartguard]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSmartguardAlerts(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/smartguard/alerts',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create smartguard alerts id acknowledge [smartguard]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiSmartguardAlertsAcknowledge({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/smartguard/alerts/{id}/acknowledge',
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
   * Retrieve smartguard metrics [smartguard]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSmartguardMetrics(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/smartguard/metrics',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve smartguard threats [smartguard]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSmartguardThreats(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/smartguard/threats',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create smartguard threats id mitigate [smartguard]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiSmartguardThreatsMitigate({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/smartguard/threats/{id}/mitigate',
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
   * Retrieve smartguard audit-log [smartguard]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiSmartguardAuditLog(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/smartguard/audit-log',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
