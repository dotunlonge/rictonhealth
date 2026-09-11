/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { NotificationPreferencesInput } from '../models/NotificationPreferencesInput';
import type { PushTokenInput } from '../models/PushTokenInput';
import type { TestNotificationInput } from '../models/TestNotificationInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class NotificationService {
  /**
   * Create internal payment success [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiInternalPaymentSuccess(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/internal/payment/success',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create internal payment failed [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiInternalPaymentFailed(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/internal/payment/failed',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve notifications unread-count [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiNotificationsUnreadCount(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/notifications/unread-count',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Update notifications read-all [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static patchApiNotificationsReadAll(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/notifications/read-all',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve notifications preferences [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiNotificationsPreferences(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/notifications/preferences',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Replace notifications preferences [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static putApiNotificationsPreferences({
    requestBody,
  }: {
    requestBody?: NotificationPreferencesInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/notifications/preferences',
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
   * Create notifications push-token [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiNotificationsPushToken({
    requestBody,
  }: {
    requestBody?: PushTokenInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/notifications/push-token',
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
   * Remove notifications push-token token [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static deleteApiNotificationsPushToken({
    token,
  }: {
    token: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/notifications/push-token/{token}',
      path: {
        token: token,
      },
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve notifications id [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiNotifications({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/notifications/{id}',
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
   * Remove notifications id [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static deleteApiNotifications({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/notifications/{id}',
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
   * Update notifications id read [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static patchApiNotificationsRead({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/notifications/{id}/read',
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
   * Create notifications test [notification]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiNotificationsTest({
    requestBody,
  }: {
    requestBody?: TestNotificationInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/notifications/test',
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
