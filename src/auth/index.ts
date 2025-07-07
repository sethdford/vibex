/**
 * Authentication Module
 * 
 * Simplified authentication system following Gemini CLI's approach.
 * Focuses on API key authentication without over-engineering.
 */

// Simple authentication system (our new approach)
export {
  SimpleAuthType,
  SimpleAuth,
  createSimpleAuth,
  validateAuth
} from './simple-auth.js';

export type {
  SimpleAuthConfig
} from './simple-auth.js';

// Create default auth instance for backward compatibility
import { createSimpleAuth } from './simple-auth.js';

/**
 * Default auth instance using environment variables
 * This replaces the complex authManager with a simple approach
 */
export const authManager = await createSimpleAuth();


export const enhancedAuth = authManager;
export const authSession = authManager;