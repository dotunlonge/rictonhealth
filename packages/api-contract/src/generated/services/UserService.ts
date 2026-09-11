/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AvatarUploadInput } from '../models/AvatarUploadInput';
import type { MedicalHistoryInput } from '../models/MedicalHistoryInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UserService {
  /**
   * Replace users me avatar [user]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static putApiUsersMeAvatar({
    requestBody,
  }: {
    requestBody?: AvatarUploadInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/users/me/avatar',
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
   * Replace users me medical-history [user]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static putApiUsersMeMedicalHistory({
    requestBody,
  }: {
    requestBody?: MedicalHistoryInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/users/me/medical-history',
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
   * Retrieve users patients [user]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiUsersPatients(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/users/patients',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve users patients id [user]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiUsersPatients1({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/users/patients/{id}',
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
