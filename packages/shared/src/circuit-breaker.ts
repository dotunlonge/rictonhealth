// @ts-expect-error - opossum default import has no types
import CircuitBreaker from 'opossum';
import { logger } from './logger';

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  action: T,
  options: CircuitBreakerOptions = {}
): CircuitBreaker {
  const {
    timeout = 5000,
    errorThresholdPercentage = 50,
    resetTimeout = 30000,
    volumeThreshold = 10,
  } = options;

  const breaker = new CircuitBreaker(action, {
    timeout,
    errorThresholdPercentage,
    resetTimeout,
    volumeThreshold,
  });

  breaker.on('open', () => {
    logger.warn('Circuit breaker opened - service unavailable');
  });

  breaker.on('halfOpen', () => {
    logger.info('Circuit breaker half-open - testing service');
  });

  breaker.on('close', () => {
    logger.info('Circuit breaker closed - service recovered');
  });

  breaker.on('failure', (error: unknown) => {
    logger.error({ err: error }, 'Circuit breaker recorded failure');
  });

  return breaker;
}

export const paystackBreaker = createCircuitBreaker(
  async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
  },
  { timeout: 10000, errorThresholdPercentage: 60, resetTimeout: 30000 }
);

export const twilioBreaker = createCircuitBreaker(
  async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
  },
  { timeout: 10000, errorThresholdPercentage: 60, resetTimeout: 30000 }
);
