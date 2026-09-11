/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WalletService {
  /**
   * Create wallets webhook [wallet]
   * @returns any Successful operation
   * @throws ApiError
   */
  public static postApiWalletsWebhook(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/wallets/webhook',
      errors: {
        400: `Validation error`,
        401: `Unauthorized`,
        404: `Not found`,
      },
    });
  }
}
