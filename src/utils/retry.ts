/**
 * Retry Mechanism with Exponential Backoff
 * 
 * This module provides utilities for retrying operations with exponential backoff
 * and jitter to handle transient failures gracefully.
 */

import { logger } from './logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';

/**
 * Options for retry operations
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Initial delay in milliseconds before first retry (default: 200ms) */
  initialDelayMs?: number;
  
  /** Maximum delay in milliseconds (default: 10000ms) */
  maxDelayMs?: number;
  
  /** Exponential backoff factor (default: 2) */
  backoffFactor?: number;
  
  /** Whether to add jitter to delay times (default: true) */
  useJitter?: boolean;
  
  /** Optional timeout for each attempt in milliseconds */
  timeoutMs?: number;
  
  /** Optional callback to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  
  /** Optional callback before each retry attempt */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'isRetryable' | 'onRetry' | 'timeoutMs'>> = {
  maxRetries: 3,
  initialDelayMs: 200,
  maxDelayMs: 10000,
  backoffFactor: 2,
  useJitter: true,
};

/**
 * Default function to determine if an error is retryable
 */
function defaultIsRetryable(error: unknown): boolean {
  // By default, retry network errors and rate limiting
  if (error instanceof Error) {
    // Common network errors
    if (
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('network') ||
      error.message.includes('Network Error')
    ) {
      return true;
    }
    
    // 429 Too Many Requests and 5xx Server Errors
    if (
      error.message.includes('429') ||
      error.message.includes('rate limit') ||
      error.message.includes('too many requests') ||
      error.message.includes('server error') ||
      error.message.includes('503') ||
      error.message.includes('502') ||
      error.message.includes('504')
    ) {
      return true;
    }
  }
  
  // For HTTP errors with status code property
  const anyError = error as any;
  if (anyError.status === 429 || anyError.status === 503 || anyError.status === 502 || anyError.status === 504) {
    return true;
  }
  if (anyError.statusCode === 429 || anyError.statusCode === 503 || anyError.statusCode === 502 || anyError.statusCode === 504) {
    return true;
  }
  
  return false;
}

/**
 * Calculates delay time with exponential backoff and optional jitter
 */
export function calculateBackoff(
  attempt: number,
  options: Required<Pick<RetryOptions, 'initialDelayMs' | 'maxDelayMs' | 'backoffFactor' | 'useJitter'>>
): number {
  // Calculate exponential backoff
  let delay = options.initialDelayMs * Math.pow(options.backoffFactor, attempt);
  
  // Apply jitter if enabled (randomizes the delay by ±30%)
  if (options.useJitter) {
    const jitterRange = delay * 0.3; // 30% jitter
    delay += (Math.random() * jitterRange * 2) - jitterRange;
  }
  
  // Cap at maximum delay
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Execute a function with retry
 * 
 * @param fn - The async function to execute
 * @param options - Retry options
 * @returns The result of the function execution
 * @throws The last error encountered if all retries fail
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  // Merge provided options with defaults
  const mergedOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options
  };
  
  const isRetryable = options.isRetryable || defaultIsRetryable;
  const maxRetries = mergedOptions.maxRetries;
  let attempt = 0;
  let lastError: unknown;
  
  while (attempt <= maxRetries) {
    try {
      // Setup timeout if specified
      if (mergedOptions.timeoutMs) {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Operation timed out after ${mergedOptions.timeoutMs}ms`)), 
              mergedOptions.timeoutMs);
          })
        ]);
      } else {
        return await fn();
      }
    } catch (error) {
      lastError = error;
      
      // Check if we have retries left and if the error is retryable
      if (attempt < maxRetries && isRetryable(error)) {
        // Calculate delay with exponential backoff
        const delayMs = calculateBackoff(attempt, {
          initialDelayMs: mergedOptions.initialDelayMs,
          maxDelayMs: mergedOptions.maxDelayMs,
          backoffFactor: mergedOptions.backoffFactor,
          useJitter: mergedOptions.useJitter,
        });
        
        // Log retry attempt
        logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms delay`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          delayMs
        });
        
        // Call onRetry callback if provided
        if (mergedOptions.onRetry) {
          try {
            mergedOptions.onRetry(attempt, delayMs, error);
          } catch (callbackError) {
            logger.warn('Error in onRetry callback', callbackError);
          }
        }
        
        // Wait before next retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempt++;
      } else {
        // We've exhausted retries or the error is not retryable
        throw error;
      }
    }
  }
  
  // This should never happen since we throw in the loop,
  // but TypeScript requires a return statement
  throw lastError;
}

/**
 * Wraps an async function with retry logic
 * 
 * @param fn - The function to wrap with retry logic
 * @param options - Retry options
 * @returns A wrapped function that will retry on failure
 */
export function withRetry<T extends (...args: readonly unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await retry(async () => fn(...args), options);
    return result as ReturnType<T>;
  }) as T;
}

/**
 * Retry decorator for class methods (to be used with TypeScript decorators)
 * 
 * @param options - Retry options
 * @returns A method decorator that adds retry logic
 * 
 * @example
 * class ApiClient {
 *   @Retry({ maxRetries: 3 })
 *   async fetchData() {
 *     // This method will retry up to 3 times on failure
 *   }
 * }
 */
export function Retry(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: readonly unknown[]) {
      return await retry(() => originalMethod.apply(this, args), options);
    };
    
    return descriptor;
  };
}

/**
 * Create a retryable version of a function
 */
export function retryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await retry(async () => fn(...args), options);
    return result as ReturnType<T>;
  }) as T;
}