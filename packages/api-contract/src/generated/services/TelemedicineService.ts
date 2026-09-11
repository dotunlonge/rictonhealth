/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateTelemedicineRoomInput } from '../models/CreateTelemedicineRoomInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TelemedicineService {
  /**
   * Retrieve telemedicine rooms [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiTelemedicineRooms(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/telemedicine/rooms',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create telemedicine callbacks status [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiTelemedicineCallbacksStatus(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/callbacks/status',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Retrieve telemedicine meetings [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiTelemedicineMeetings(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/telemedicine/meetings',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create telemedicine meetings [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiTelemedicineMeetings({
    requestBody,
  }: {
    requestBody?: CreateTelemedicineRoomInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/meetings',
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
   * Create telemedicine meetings id token [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiTelemedicineMeetingsToken({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/meetings/{id}/token',
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
   * Create telemedicine meetings id end [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiTelemedicineMeetingsEnd({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/meetings/{id}/end',
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
   * Create telemedicine rooms id leave [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiTelemedicineRoomsLeave({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/rooms/{id}/leave',
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
   * Create telemedicine meetings id leave [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiTelemedicineMeetingsLeave({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/telemedicine/meetings/{id}/leave',
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
   * Retrieve telemedicine rooms id participants [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiTelemedicineRoomsParticipants({
    id,
  }: {
    id: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/telemedicine/rooms/{id}/participants',
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
   * Retrieve telemedicine meetings id participants [telemedicine]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiTelemedicineMeetingsParticipants({
    id,
  }: {
    id: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/telemedicine/meetings/{id}/participants',
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
