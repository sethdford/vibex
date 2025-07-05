/**
 * Error Analysis and Categorization System
 * 
 * This module provides advanced error analysis to properly categorize
 * errors based on their patterns, messages, and root causes.
 * 
 * Features:
 * - Pattern-based error classification
 * - Provider-specific error handling (Anthropic API, etc.)
 * - Error cause chain analysis
 * - Custom error category mapping
 * - Client-specific error normalization
 */

import { ErrorCategory, ErrorLevel } from './types.js';
import { logger } from '../utils/logger.js';

/**
 * Error analysis result
 */
export interface ErrorAnalysisResult {
  /**
   * Categorized error category
   */
  category: ErrorCategory;
  
  /**
   * Error severity level
   */
  level: ErrorLevel;
  
  /**
   * User-friendly error message
   */
  message: string;
  
  /**
   * Suggested resolution steps
   */
  resolution?: string | string[];
  
  /**
   * Additional details extracted from error
   */
  details?: Record<string, unknown>;
}

interface ErrorObject {
  message?: string;
  error?: {
    message?: string;
    code?: string | number;
    type?: string;
    param?: string;
  } | string;
  type?: string;
  detail?: string;
  code?: string | number;
  status?: number;
  statusCode?: number;
  param?: string;
  id?: string;
  cause?: unknown;
}

/**
 * Common API error patterns mapped to error categories
 */
const API_ERROR_PATTERNS = [
  // Authentication errors
  { 
    pattern: /(api key|authentication|unauthorized|401|403|auth|invalid key|credentials)/i,
    category: ErrorCategory.AUTHENTICATION,
    level: ErrorLevel.MAJOR,
    resolution: 'Check your API key and authentication settings.'
  },
  
  // Rate limit errors
  {
    pattern: /(rate limit|too many requests|429|too fast|quota|usage limit|capacity|exceed|throttl)/i,
    category: ErrorCategory.RATE_LIMIT,
    level: ErrorLevel.MAJOR,
    resolution: 'You have exceeded the API rate limit. Please wait a moment and try again.'
  },
  
  // Server errors
  {
    pattern: /(server error|5\d\d|bad gateway|maintenance|unavailable|internal error)/i, 
    category: ErrorCategory.SERVER,
    level: ErrorLevel.MAJOR,
    resolution: 'The server is experiencing issues. Please try again later.'
  },
  
  // Timeout errors
  {
    pattern: /(timeout|timed? out|deadline exceed|ETIMEDOUT|took too long)/i,
    category: ErrorCategory.TIMEOUT,
    level: ErrorLevel.MAJOR,
    resolution: 'The request timed out. Check your internet connection and try again.'
  },
  
  // Network errors
  {
    pattern: /(network|connection|connect|ECONNREFUSED|ECONNRESET|unable to resolve|dns|socket|offline)/i,
    category: ErrorCategory.NETWORK,
    level: ErrorLevel.MAJOR,
    resolution: 'Network connection issue. Check your internet connection.'
  },
  
  // API-specific errors
  {
    pattern: /(invalid request|bad request|400|parameter|missing field)/i,
    category: ErrorCategory.VALIDATION,
    level: ErrorLevel.MAJOR,
    resolution: 'Your request contained invalid parameters. Please check the request format.'
  },
  
  // Permission errors
  {
    pattern: /(permission|forbidden|not allowed|unauthorized|403|denied)/i,
    category: ErrorCategory.AUTHORIZATION,
    level: ErrorLevel.MAJOR,
    resolution: 'You do not have permission to access this resource.'
  },
  
  // Input validation errors
  {
    pattern: /(invalid|validation|malformed|required parameter|missing field|too large|too small|format|parsing)/i,
    category: ErrorCategory.VALIDATION,
    level: ErrorLevel.MINOR,
    resolution: 'The request contains invalid or malformed data.'
  },
  
  // Content filtering
  {
    pattern: /(content policy|content filter|content moderation|harmful|unsafe|restricted|violat|inappropriate|content was blocked)/i,
    category: ErrorCategory.API,
    level: ErrorLevel.MAJOR,
    resolution: 'The content was blocked due to content policy violations. Please modify your request.'
  }
];

/**
 * Anthropic-specific error patterns
 */
const ANTHROPIC_ERROR_PATTERNS = [
  {
    pattern: /(model is currently overloaded)/i,
    category: ErrorCategory.RATE_LIMIT,
    level: ErrorLevel.MAJOR,
    resolution: 'The AI service is currently overloaded. Please try again in a moment.'
  },
  {
    pattern: /(Claude couldn't process)/i,
    category: ErrorCategory.API,
    level: ErrorLevel.MAJOR,
    resolution: 'Claude was unable to process your request. Try simplifying your request.'
  },
  {
    pattern: /(content_blocked)/i,
    category: ErrorCategory.API,
    level: ErrorLevel.MAJOR,
    resolution: 'Your request was blocked by content filters. Please modify your request.'
  }
];

/**
 * Analyzes an error object to determine its category and provide user-friendly information
 * 
 * @param error - The error to analyze
 * @param operation - The operation being performed when the error occurred
 * @returns Error analysis result with category, level, message and resolution
 */
export function analyzeError(error: unknown, operation: string): ErrorAnalysisResult {
  // Default values
  const result: ErrorAnalysisResult = {
    category: ErrorCategory.UNKNOWN,
    level: ErrorLevel.MINOR,
    message: `Error during ${operation}`,
    details: {}
  };
  
  // Extract error message
  const errorMessage = extractErrorMessage(error);
  if (errorMessage) {
    result.message = errorMessage;
    
    // Extract error details
    result.details = extractErrorDetails(error);
    
    // Try to match error patterns
    const matchedPattern = findMatchingErrorPattern(errorMessage);
    
    if (matchedPattern) {
      result.category = matchedPattern.category;
      result.level = matchedPattern.level;
      result.resolution = matchedPattern.resolution;
    }
  }
  
  // Log detailed analysis
  logger.debug(`Error analysis for ${operation}:`, {
    category: ErrorCategory[result.category],
    level: ErrorLevel[result.level],
    originalMessage: errorMessage,
    details: result.details
  });
  
  return result;
}

/**
 * Extract the most meaningful error message from an error object
 */
function extractErrorMessage(error: unknown): string {
  // Default message for null/undefined
  if (error === null || error === undefined) {
    return 'Error during API request';
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle API response error objects
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as ErrorObject;
    
    // Common API error patterns
    if (errorObj.message) {return errorObj.message;}
    if (errorObj.error) {
      if (typeof errorObj.error === 'string') {
        return errorObj.error;
      } else if (errorObj.error.message) {
        return errorObj.error.message;
      } else {
        return JSON.stringify(errorObj.error);
      }
    }
    
    // Anthropic specific errors
    if (errorObj.type && errorObj.detail) {
      return `${errorObj.type}: ${errorObj.detail}`;
    }
    
    return JSON.stringify(error);
  }
  
  return String(error);
}

/**
 * Extract detailed context from an error object
 */
function extractErrorDetails(error: unknown): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  
  if (typeof error !== 'object' || error === null) {
    return details;
  }
  
  const errorObj = error as ErrorObject;
  
  // Extract common error object properties
  if (errorObj.code) {details.code = errorObj.code;}
  if (errorObj.status) {details.status = errorObj.status;}
  if (errorObj.statusCode) {details.statusCode = errorObj.statusCode;}
  if (errorObj.param) {details.param = errorObj.param;}
  if (errorObj.type) {details.type = errorObj.type;}
  if (errorObj.id) {details.id = errorObj.id;}
  if (errorObj.detail) {details.detail = errorObj.detail;}
  
  // Extract nested error info
  if (errorObj.error && typeof errorObj.error === 'object') {
    if (errorObj.error.code) {details.errorCode = errorObj.error.code;}
    if (errorObj.error.type) {details.errorType = errorObj.error.type;}
    if (errorObj.error.param) {details.errorParam = errorObj.error.param;}
  }
  
  // Extract cause chain
  if (errorObj.cause) {
    details.cause = extractErrorMessage(errorObj.cause);
  }
  
  return details;
}

/**
 * Find a matching error pattern based on the error message
 */
function findMatchingErrorPattern(errorMessage: string): {
  category: ErrorCategory;
  level: ErrorLevel;
  resolution: string;
} | null {
  // Check Anthropic-specific patterns first
  for (const pattern of ANTHROPIC_ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      return pattern;
    }
  }
  
  // Check general API patterns
  for (const pattern of API_ERROR_PATTERNS) {
    if (pattern.pattern.test(errorMessage)) {
      return pattern;
    }
  }
  
  return null;
}

/**
 * Provides suggested resolution steps based on error category
 * 
 * @param category - The error category
 * @returns Array of resolution steps
 */
export function getResolutionSteps(category: ErrorCategory): string[] {
  switch(category) {
    case ErrorCategory.AUTHENTICATION:
      return [
        'Check that your API key is valid and not expired.',
        'Verify your authentication credentials in the configuration.',
        'Make sure your account is in good standing.'
      ];
      
    case ErrorCategory.RATE_LIMIT:
      return [
        'Wait a moment before trying again.',
        'Consider implementing request throttling in your application.',
        'Check if you have exceeded your usage quota or billing limits.'
      ];
      
    case ErrorCategory.NETWORK:
      return [
        'Check your internet connection.',
        'Verify that the API service is accessible from your network.',
        'Try again in a few moments as the issue might be temporary.'
      ];
      
    case ErrorCategory.TIMEOUT:
      return [
        'The request took too long to complete.',
        'Try again with a simpler request or smaller input.',
        'Check your network connection quality.',
        'The service might be experiencing high load.'
      ];
      
    case ErrorCategory.SERVER:
      return [
        'The server is experiencing issues. This is not a problem with your request.',
        'Try again later when the service has recovered.',
        'Check the service status page for any ongoing incidents.'
      ];
      
    case ErrorCategory.API:
      return [
        'Your request was rejected by the API.',
        'Check the request parameters for correctness.',
        'Ensure your request complies with API policies and guidelines.'
      ];
      
    default:
      return [
        'Try the request again.',
        'Check your input for any issues.',
        'Consult the API documentation for proper usage.'
      ];
  }
}