/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TwoFactorVerifyInput } from '../models/TwoFactorVerifyInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
  /**
   * Create auth logout-all [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAuthLogoutAll(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/logout-all',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve auth sessions [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAuthSessions(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/auth/sessions',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Remove auth sessions sessionId [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static deleteApiAuthSessions({
    sessionId,
  }: {
    sessionId: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/auth/sessions/{sessionId}',
      path: {
        sessionId: sessionId,
      },
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve auth 2fa status [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiAuth2FaStatus(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/auth/2fa/status',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create auth 2fa setup [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAuth2FaSetup(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/2fa/setup',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create auth 2fa enable [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAuth2FaEnable(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/2fa/enable',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create auth 2fa verify [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAuth2FaVerify({
    requestBody,
  }: {
    requestBody?: TwoFactorVerifyInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/2fa/verify',
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
   * Create auth 2fa disable [auth]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiAuth2FaDisable(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/auth/2fa/disable',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
