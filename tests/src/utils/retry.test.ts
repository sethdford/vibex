/**
 * Retry Mechanism Unit Tests
 * 
 * Tests for retry mechanism with exponential backoff
 */

import { expect, jest, test, describe, beforeEach } from '@jest/globals';
import { retry, calculateBackoff, withRetry, RetryOptions } from './retry';

// Mock setTimeout
jest.useFakeTimers();

describe('calculateBackoff', () => {
  test('should calculate exponential backoff without jitter', () => {
    const options = {
      initialDelayMs: 100,
      maxDelayMs: 10000,
      backoffFactor: 2,
      useJitter: false
    };
    
    expect(calculateBackoff(0, options)).toBe(100);
    expect(calculateBackoff(1, options)).toBe(200);
    expect(calculateBackoff(2, options)).toBe(400);
    expect(calculateBackoff(3, options)).toBe(800);
  });
  
  test('should respect maximum delay', () => {
    const options = {
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffFactor: 3,
      useJitter: false
    };
    
    expect(calculateBackoff(0, options)).toBe(1000);
    expect(calculateBackoff(1, options)).toBe(3000);
    expect(calculateBackoff(2, options)).toBe(5000); // Capped at maxDelayMs
  });
  
  test('should add jitter when enabled', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5); // Simulate consistent random value
    
    const options = {
      initialDelayMs: 100,
      maxDelayMs: 10000,
      backoffFactor: 2,
      useJitter: true
    };
    
    // With 30% jitter and random=0.5, we'll get exactly the base delay (no change)
    expect(calculateBackoff(0, options)).toBe(100);
    expect(calculateBackoff(1, options)).toBe(200);
    
    // Test with different random values
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(calculateBackoff(1, options)).toBe(140); // -30% jitter
    
    jest.spyOn(Math, 'random').mockReturnValue(1);
    expect(calculateBackoff(1, options)).toBe(260); // +30% jitter
    
    jest.spyOn(Math, 'random').mockRestore();
  });
});

describe('retry function', () => {
  let mockFn: jest.Mock<Promise<string>, []>;
  let successAfter: number;
  
  beforeEach(() => {
    successAfter = 2; // Succeed on third attempt (after 2 failures)
    let attempts = 0;
    
    mockFn = jest.fn().mockImplementation(async () => {
      if (attempts < successAfter) {
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      }
      return 'success';
    });
  });
  
  test('should retry until success', async () => {
    const result = await retry(mockFn as () => Promise<string>, { maxRetries: 3, initialDelayMs: 10 });
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(successAfter + 1);
  });
  
  test('should fail after max retries exceeded', async () => {
    successAfter = 5; // Will never succeed within retry limit
    
    await expect(retry(mockFn as () => Promise<string>, { maxRetries: 2, initialDelayMs: 10 }))
      .rejects.toThrow('Attempt 2 failed');
    
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });
  
  test('should not retry if error is not retryable', async () => {
    const notRetryableError = new Error('Not retryable');
    const mockFnNotRetryable = jest.fn().mockRejectedValue(notRetryableError) as jest.Mock<Promise<never>, []>;
    
    const options: RetryOptions = {
      maxRetries: 3,
      initialDelayMs: 10,
      isRetryable: (error) => false // No errors are retryable
    };
    
    await expect(retry(mockFnNotRetryable as () => Promise<never>, options))
      .rejects.toThrow('Not retryable');
    
    expect(mockFnNotRetryable).toHaveBeenCalledTimes(1); // No retries
  });
  
  test('should call onRetry callback before each retry', async () => {
    const onRetry = jest.fn() as jest.Mock<void, [number, number, Error]>;
    
    await retry(mockFn as () => Promise<string>, { 
      maxRetries: 3, 
      initialDelayMs: 10,
      onRetry
    });
    
    expect(onRetry).toHaveBeenCalledTimes(successAfter);
    expect(onRetry).toHaveBeenNthCalledWith(
      1, 
      0, // First attempt (0-indexed)
      expect.any(Number), // Delay
      expect.any(Error) // Error
    );
  });
  
  test('should timeout if operation takes too long', async () => {
    const slowFn = jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve('too late'), 1000);
      });
    }) as jest.Mock<Promise<string>, []>;
    
    // Set timeout to 50ms
    const promise = retry(slowFn as () => Promise<string>, { timeoutMs: 50 });
    
    // Fast-forward time
    jest.advanceTimersByTime(100);
    
    await expect(promise).rejects.toThrow('Operation timed out');
  });
});

describe('withRetry function', () => {
  test('should wrap a function with retry logic', async () => {
    let attempts = 0;
    const mockFn = jest.fn().mockImplementation(async (arg1: string, arg2: number) => {
      if (attempts < 2) {
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      }
      return `${arg1}-${arg2}`;
    }) as jest.Mock<Promise<string>, [string, number]>;
    
    const wrappedFn = withRetry(mockFn, { maxRetries: 3, initialDelayMs: 10 });
    const result = await wrappedFn('test', 123);
    
    expect(result).toBe('test-123');
    expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    expect(mockFn).toHaveBeenCalledWith('test', 123); // Arguments passed through
  });
});