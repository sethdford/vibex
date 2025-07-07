/**
 * Retry Service - Clean Architecture like Gemini CLI
 * 
 * Focused service for managing retry logic with exponential backoff
 */

import { RetryConfiguration, RetryAttemptResult } from './types.js';

/**
 * Service for managing retry logic and exponential backoff
 */
export class RetryService {
  private defaultConfig: RetryConfiguration;

  constructor(defaultConfig: RetryConfiguration) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  calculateRetryDelay(attempt: number, config?: Partial<RetryConfiguration>): number {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    const delay = finalConfig.initialDelayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, finalConfig.maxDelayMs);
  }

  /**
   * Check if retry should be attempted
   */
  shouldRetry(
    attempt: number, 
    errorType: string,
    config?: Partial<RetryConfiguration>
  ): boolean {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Check if we've exceeded max attempts
    if (attempt >= finalConfig.maxAttempts) {
      return false;
    }

    // Check if error type is retryable
    const retryableErrors = finalConfig.retryConditions;
    return retryableErrors.some(condition => {
      switch (condition) {
        case 'network_error':
          return errorType.includes('network') || errorType.includes('connection');
        case 'timeout':
          return errorType.includes('timeout') || errorType.includes('timed out');
        case 'rate_limit':
          return errorType.includes('rate limit') || errorType.includes('429');
        case 'temporary_failure':
          return errorType.includes('temporary') || errorType.includes('503') || errorType.includes('502');
        default:
          return false;
      }
    });
  }

  /**
   * Get retry configuration with defaults
   */
  getRetryConfig(overrides?: Partial<RetryConfiguration>): RetryConfiguration {
    return { ...this.defaultConfig, ...overrides };
  }

  /**
   * Create retry attempt result
   */
  createRetryResult(
    attempt: number, 
    success: boolean, 
    delay: number,
    error?: string,
    config?: Partial<RetryConfiguration>
  ): RetryAttemptResult {
    const nextDelay = success ? undefined : this.calculateRetryDelay(attempt + 1, config);
    
    return {
      success,
      attempt,
      delay,
      nextDelay,
      error
    };
  }

  /**
   * Get retry schedule for attempts
   */
  getRetrySchedule(maxAttempts: number, config?: Partial<RetryConfiguration>): number[] {
    const finalConfig = { ...this.defaultConfig, ...config };
    const schedule: number[] = [];
    
    for (let attempt = 1; attempt <= Math.min(maxAttempts, finalConfig.maxAttempts); attempt++) {
      schedule.push(this.calculateRetryDelay(attempt, config));
    }
    
    return schedule;
  }

  /**
   * Get total retry time estimate
   */
  getTotalRetryTime(config?: Partial<RetryConfiguration>): number {
    const finalConfig = { ...this.defaultConfig, ...config };
    const schedule = this.getRetrySchedule(finalConfig.maxAttempts, config);
    return schedule.reduce((total, delay) => total + delay, 0);
  }

  /**
   * Format retry delay for display
   */
  formatRetryDelay(delayMs: number): string {
    if (delayMs < 1000) {
      return `${delayMs}ms`;
    } else if (delayMs < 60000) {
      return `${(delayMs / 1000).toFixed(1)}s`;
    } else {
      return `${(delayMs / 60000).toFixed(1)}m`;
    }
  }

  /**
   * Get retry configuration summary
   */
  getConfigSummary(config?: Partial<RetryConfiguration>): {
    maxAttempts: number;
    initialDelay: string;
    maxDelay: string;
    backoffMultiplier: number;
    retryConditions: string[];
    totalEstimatedTime: string;
  } {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    return {
      maxAttempts: finalConfig.maxAttempts,
      initialDelay: this.formatRetryDelay(finalConfig.initialDelayMs),
      maxDelay: this.formatRetryDelay(finalConfig.maxDelayMs),
      backoffMultiplier: finalConfig.backoffMultiplier,
      retryConditions: finalConfig.retryConditions,
      totalEstimatedTime: this.formatRetryDelay(this.getTotalRetryTime(config))
    };
  }

  /**
   * Validate retry configuration
   */
  validateConfig(config: Partial<RetryConfiguration>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.maxAttempts !== undefined) {
      if (config.maxAttempts < 1) {
        errors.push('maxAttempts must be at least 1');
      }
      if (config.maxAttempts > 10) {
        errors.push('maxAttempts should not exceed 10');
      }
    }

    if (config.backoffMultiplier !== undefined) {
      if (config.backoffMultiplier < 1) {
        errors.push('backoffMultiplier must be at least 1');
      }
      if (config.backoffMultiplier > 5) {
        errors.push('backoffMultiplier should not exceed 5');
      }
    }

    if (config.initialDelayMs !== undefined) {
      if (config.initialDelayMs < 100) {
        errors.push('initialDelayMs should be at least 100ms');
      }
      if (config.initialDelayMs > 60000) {
        errors.push('initialDelayMs should not exceed 60 seconds');
      }
    }

    if (config.maxDelayMs !== undefined) {
      if (config.maxDelayMs < 1000) {
        errors.push('maxDelayMs should be at least 1 second');
      }
      if (config.maxDelayMs > 300000) {
        errors.push('maxDelayMs should not exceed 5 minutes');
      }
    }

    if (config.initialDelayMs !== undefined && config.maxDelayMs !== undefined) {
      if (config.initialDelayMs > config.maxDelayMs) {
        errors.push('initialDelayMs should not exceed maxDelayMs');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create default retry configuration
   */
  static createDefaultConfig(): RetryConfiguration {
    return {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      retryConditions: ['network_error', 'timeout', 'rate_limit', 'temporary_failure']
    };
  }

  /**
   * Create aggressive retry configuration
   */
  static createAggressiveConfig(): RetryConfiguration {
    return {
      maxAttempts: 5,
      backoffMultiplier: 1.5,
      initialDelayMs: 500,
      maxDelayMs: 15000,
      retryConditions: ['network_error', 'timeout', 'rate_limit', 'temporary_failure']
    };
  }

  /**
   * Create conservative retry configuration
   */
  static createConservativeConfig(): RetryConfiguration {
    return {
      maxAttempts: 2,
      backoffMultiplier: 3,
      initialDelayMs: 2000,
      maxDelayMs: 60000,
      retryConditions: ['network_error', 'timeout']
    };
  }
} 