/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateConversationInput } from '../models/CreateConversationInput';
import type { MarkConversationReadInput } from '../models/MarkConversationReadInput';
import type { SendMessageInput } from '../models/SendMessageInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MessagingService {
  /**
   * Retrieve messages threads [messaging]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiMessagesThreads(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/messages/threads',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
  /**
   * Create messages threads [messaging]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiMessagesThreads({
    requestBody,
  }: {
    requestBody?: CreateConversationInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/messages/threads',
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
   * Retrieve messages threads id [messaging]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static getApiMessagesThreads1({ id }: { id: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/messages/threads/{id}',
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
   * Create messages threads id messages [messaging]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiMessagesThreadsMessages({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: SendMessageInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/messages/threads/{id}/messages',
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
   * Update messages threads id read [messaging]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static patchApiMessagesThreadsRead({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: MarkConversationReadInput;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/messages/threads/{id}/read',
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
}
