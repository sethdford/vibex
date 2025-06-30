/**
 * Auth Module
 *
 * This module provides a unified interface for handling all authentication-related
 * functionality in the application. Key features include:
 *
 * - Singleton auth manager for consistent state
 * - Support for multiple authentication methods (API Key, OAuth)
 * - Secure token storage using keytar or file-based credentials
 * - Automatic token refreshing for long-lived sessions
 * - Type-safe interfaces for all auth operations
 * - Centralized authentication state management
 *
 * The module exports a pre-configured `authManager` instance for use throughout
 * the application, ensuring consistent and secure authentication handling.
 */

import { AuthManager } from './manager.js';
import {
  TokenStorage,
  AuthResult,
  AuthState,
  AuthMethod,
  AuthToken,
  OAuthConfig
} from './types.js';
import { performOAuthFlow, refreshOAuthToken } from './oauth.js';
import { createTokenStorage, isTokenExpired } from './tokens.js';
import config from '../config/index.js';

export const authManager = new AuthManager(config.get());

export * from './types.js';
export * from './oauth.js';
export * from './tokens.js'; 