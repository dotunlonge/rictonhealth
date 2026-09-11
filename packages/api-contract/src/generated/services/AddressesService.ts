/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Address } from '../models/Address';
import type { AddressListResponse } from '../models/AddressListResponse';
import type { CreateAddressInput } from '../models/CreateAddressInput';
import type { UpdateAddressInput } from '../models/UpdateAddressInput';
import type { ValidateAddressInput } from '../models/ValidateAddressInput';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AddressesService {
  /**
   * List all addresses for the current user
   * @returns any List of user addresses
   * @throws ApiError
   */
  public static getApiAddresses(): CancelablePromise<{
    success: boolean;
    data: AddressListResponse;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/addresses',
    });
  }
  /**
   * Create a new address
   * @returns any Address created successfully
   * @throws ApiError
   */
  public static postApiAddresses({
    requestBody,
  }: {
    requestBody?: CreateAddressInput;
  }): CancelablePromise<{
    success: boolean;
    data: Address;
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/addresses',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Get address by ID
   * @returns any Address details
   * @throws ApiError
   */
  public static getApiAddresses1({ id }: { id: string }): CancelablePromise<{
    success: boolean;
    data: Address;
  }> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/addresses/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * Update an existing address
   * @returns any Address updated successfully
   * @throws ApiError
   */
  public static putApiAddresses({
    id,
    requestBody,
  }: {
    id: string;
    requestBody?: UpdateAddressInput;
  }): CancelablePromise<{
    success: boolean;
    data: Address;
  }> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/addresses/{id}',
      path: {
        id: id,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Delete an address
   * @returns any Address deleted successfully
   * @throws ApiError
   */
  public static deleteApiAddresses({ id }: { id: string }): CancelablePromise<{
    success: boolean;
    message: string;
  }> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/addresses/{id}',
      path: {
        id: id,
      },
    });
  }
  /**
   * Set an address as the default
   * @returns any Address set as default
   * @throws ApiError
   */
  public static patchApiAddressesSetDefault({ id }: { id: string }): CancelablePromise<{
    success: boolean;
    data: Address;
  }> {
    return __request(OpenAPI, {
      method: 'PATCH',
      url: '/api/addresses/{id}/set-default',
      path: {
        id: id,
      },
    });
  }
  /**
   * Validate an address format
   * @returns any Validation result
   * @throws ApiError
   */
  public static postApiAddressesValidate({
    requestBody,
  }: {
    requestBody?: ValidateAddressInput;
  }): CancelablePromise<{
    success: boolean;
    data: {
      isValid: boolean;
      normalizedAddress: {
        addressLine1: string;
        city: string;
        state: string;
        country: string;
        postalCode: string | null;
      };
    };
  }> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/addresses/validate',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}
