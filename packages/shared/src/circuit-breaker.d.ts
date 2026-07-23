import CircuitBreaker from 'opossum';
export interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
}
export declare function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(action: T, options?: CircuitBreakerOptions): CircuitBreaker;
export declare const paystackBreaker: CircuitBreaker;
export declare const twilioBreaker: CircuitBreaker;
