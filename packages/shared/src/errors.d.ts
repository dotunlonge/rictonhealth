import { ErrorDetails } from './response';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly details?: ErrorDetails;
    constructor(message: string, statusCode: number, code: string, details?: ErrorDetails);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: ErrorDetails);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string, details?: ErrorDetails);
}
