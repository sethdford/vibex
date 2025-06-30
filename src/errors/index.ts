/**
 * Comprehensive Error Handling System
 * 
 * This module implements a centralized error management system that standardizes
 * error handling throughout the application. Key features include:
 * 
 * - Custom error classes with standardized properties and behavior
 * - Categorized errors for consistent classification and handling
 * - Error severity levels for appropriate response handling
 * - Structured error creation with context and resolution hints
 * - Error transformation utilities for converting between error types
 * - Formatted error display for user-facing messages
 * - Detailed error reporting for debugging and logging
 * - Integration with the logging system for consistent error tracking
 * - Helper functions for common error scenarios
 * - Safe error handling patterns with try/catch utilities
 * 
 * The system ensures consistent error handling patterns across the codebase
 * while providing rich context for both users and developers.
 */

// Import UserError to be used in custom error classes
import { UserError, ErrorCategory, type UserErrorOptions } from './types.js';

// Core error types and enums
export { UserError, ErrorCategory, type UserErrorOptions };

// Error formatting and creation utilities
export { formatErrorForDisplay, createUserError } from './formatter.js';

// Custom error classes
export class FileSystemError extends UserError {
  constructor(message: string, options: UserErrorOptions = {}) {
    super(message, { category: ErrorCategory.FILE_SYSTEM, ...options });
    this.name = 'FileSystemError';
  }
}

export class NetworkError extends UserError {
  constructor(message: string, options: UserErrorOptions = {}) {
    super(message, { category: ErrorCategory.NETWORK, ...options });
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends UserError {
  constructor(message: string, options: UserErrorOptions = {}) {
    super(message, { category: ErrorCategory.AUTHENTICATION, ...options });
    this.name = 'AuthenticationError';
  }
}

export class AIError extends UserError {
  constructor(message: string, options: UserErrorOptions = {}) {
    super(message, { category: ErrorCategory.AI_SERVICE, ...options });
    this.name = 'AIError';
  }
}