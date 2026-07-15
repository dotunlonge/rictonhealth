export type ErrorDetails = Record<string, string | string[]>;
export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: ErrorDetails;
  };
  meta?: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
    page?: number;
    limit?: number;
  };
}
export declare function successResponse<T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T>;
export declare function errorResponse(
  message: string,
  code?: string,
  details?: ErrorDetails
): ApiResponse<null>;
