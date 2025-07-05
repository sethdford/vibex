/**
 * Authentication Module
 * 
 * Central export for all authentication functionality.
 */

// Legacy authentication system
export { AuthManager } from './manager.js';
export { authManager } from './instance.js';
export { createTokenStorage, isTokenExpired } from './tokens.js';
export { performOAuthFlow, refreshOAuthToken, DEFAULT_OAUTH_CONFIG } from './oauth.js';
export { AuthMethod, AuthState } from './types.js';
export type { AuthToken, AuthResult, TokenStorage, OAuthConfig } from './types.js';

// Multi-provider authentication system
export { 
  MultiProviderAuth,
  AuthProviderType, 
  AuthEvent,
  createMultiProviderAuth,
  // Legacy exports for backward compatibility
  EnhancedAuthSystem,
  EnhancedAuthEvent,
  createEnhancedAuth
} from './enhanced-auth.js';
export type { 
  AuthProvider, 
  AuthConfig,
  // Legacy type export
  EnhancedAuthConfig
} from './enhanced-auth.js';

// Auth session management
export {
  AuthSessionManager,
  SessionEvent,
  createAuthSession
} from './auth-session.js';
export type {
  SessionConfig,
  SessionInfo
} from './auth-session.js';

// Initialize multi-provider auth system
import { createMultiProviderAuth, AuthProviderType } from './enhanced-auth.js';
import { createAuthSession } from './auth-session.js';

/**
 * Multi-provider auth system singleton
 */
export const multiProviderAuth = createMultiProviderAuth();

// Legacy export for backward compatibility
export const enhancedAuth = multiProviderAuth;

/**
 * Auth session singleton
 */
export const authSession = createAuthSession({
  defaultProvider: AuthProviderType.ANTHROPIC,
  authConfig: {
    defaultProvider: AuthProviderType.ANTHROPIC,
    autoRefresh: true
  }
});

// Initialize auth session
authSession.initialize().catch(error => {
  console.error('Failed to initialize auth session', error);
});