declare module 'opossum' {
  export interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
  }

  export class CircuitBreaker {
    constructor(action: (...args: any[]) => Promise<any>, options?: CircuitBreakerOptions);
    fire(...args: any[]): Promise<any>;
    on(event: string, handler: (...args: any[]) => void): void;
  }

  export default CircuitBreaker;
}
