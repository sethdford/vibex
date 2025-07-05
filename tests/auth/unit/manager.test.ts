/**
 * Unit tests for the AuthManager class
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { 
  AuthManager,
  AUTH_EVENTS,
  AuthManagerConfig
} from '../../../src/auth/manager.js';
import { AuthMethod, AuthState } from '../../../src/auth/types.js';
import type { AuthToken } from '../../../src/auth/types.js';
import * as tokenModule from '../../../src/auth/tokens.js';
import * as oauthModule from '../../../src/auth/oauth.js';

// Mock dependencies
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../../src/auth/tokens.js', () => ({
  createTokenStorage: jest.fn(),
  isTokenExpired: jest.fn()
}));

jest.mock('../../../src/auth/oauth.js', () => ({
  performOAuthFlow: jest.fn(),
  refreshOAuthToken: jest.fn(),
  DEFAULT_OAUTH_CONFIG: {
    clientId: 'test-client-id',
    authorizationEndpoint: 'https://test.com/auth',
    tokenEndpoint: 'https://test.com/token',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['read', 'write'],
    responseType: 'code'
  }
}));

// Test constants
const TEST_TOKEN: AuthToken = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  tokenType: 'Bearer',
  expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  scope: 'read write'
};

const mockConfig: AuthManagerConfig = {
  api: { key: 'test-api-key' },
  oauth: {
    clientId: 'test-client-id',
    authorizationEndpoint: 'https://test.com/auth',
    tokenEndpoint: 'https://test.com/token',
    redirectUri: 'http://localhost:3000/callback',
    scopes: ['read', 'write'],
    responseType: 'code'
  },
  preferredMethod: AuthMethod.API_KEY,
  autoRefresh: true,
  tokenRefreshThreshold: 300,
  maxRetryAttempts: 3
};

describe('AuthManager', () => {
  // Create mocks for token storage
  const mockTokenStorage = {
    saveToken: jest.fn(),
    getToken: jest.fn(),
    deleteToken: jest.fn(),
    clearTokens: jest.fn()
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset token storage mock
    (tokenModule.createTokenStorage as jest.Mock).mockReturnValue(mockTokenStorage);
    (tokenModule.isTokenExpired as jest.Mock).mockReturnValue(false);

    // Reset OAuth mocks
    (oauthModule.performOAuthFlow as jest.Mock).mockResolvedValue({
      success: true,
      token: TEST_TOKEN,
      method: AuthMethod.OAUTH,
      state: AuthState.AUTHENTICATED
    });
    (oauthModule.refreshOAuthToken as jest.Mock).mockResolvedValue(TEST_TOKEN);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    test('should create instance with default config', () => {
      const auth = new AuthManager({});
      expect(auth).toBeInstanceOf(EventEmitter);
      expect(tokenModule.createTokenStorage).toHaveBeenCalled();
    });

    test('should create instance with custom config', () => {
      const auth = new AuthManager(mockConfig);
      expect(auth).toBeInstanceOf(EventEmitter);
      expect(tokenModule.createTokenStorage).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    test('should initialize with existing valid token', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      expect(mockTokenStorage.getToken).toHaveBeenCalled();
      expect(tokenModule.isTokenExpired).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.AUTHENTICATED);
      expect(auth.isAuthenticated()).toBe(true);
    });

    test('should handle expired token with refresh token', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);
      (tokenModule.isTokenExpired as jest.Mock).mockReturnValue(true);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      expect(mockTokenStorage.getToken).toHaveBeenCalled();
      expect(oauthModule.refreshOAuthToken).toHaveBeenCalled();
      expect(mockTokenStorage.saveToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.AUTHENTICATED);
    });

    test('should handle expired token with failed refresh', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);
      (tokenModule.isTokenExpired as jest.Mock).mockReturnValue(true);
      (oauthModule.refreshOAuthToken as jest.Mock).mockRejectedValue(new Error('Refresh failed'));

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      expect(mockTokenStorage.getToken).toHaveBeenCalled();
      expect(oauthModule.refreshOAuthToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.INITIAL);
      expect(auth.isAuthenticated()).toBe(false);
    });

    test('should handle expired token without refresh token', async () => {
      const tokenWithoutRefresh = { ...TEST_TOKEN, refreshToken: undefined };
      mockTokenStorage.getToken.mockResolvedValue(tokenWithoutRefresh);
      (tokenModule.isTokenExpired as jest.Mock).mockReturnValue(true);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      expect(mockTokenStorage.getToken).toHaveBeenCalled();
      expect(oauthModule.refreshOAuthToken).not.toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.INITIAL);
    });

    test('should handle no existing token', async () => {
      mockTokenStorage.getToken.mockResolvedValue(null);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      expect(mockTokenStorage.getToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.INITIAL);
      expect(auth.isAuthenticated()).toBe(false);
    });

    test('should handle initialization error', async () => {
      mockTokenStorage.getToken.mockRejectedValue(new Error('Storage error'));

      const auth = new AuthManager(mockConfig);
      const errorSpy = jest.spyOn(auth, 'emit');
      
      await auth.initialize();

      expect(mockTokenStorage.getToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.FAILED);
      expect(errorSpy).toHaveBeenCalledWith(AUTH_EVENTS.ERROR, expect.any(Error));
    });
  });

  describe('authenticate', () => {
    test('should authenticate with API key', async () => {
      const auth = new AuthManager(mockConfig);
      const result = await auth.authenticate(AuthMethod.API_KEY);

      expect(result.success).toBe(true);
      expect(result.method).toBe(AuthMethod.API_KEY);
      expect(mockTokenStorage.saveToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.AUTHENTICATED);
      expect(auth.isAuthenticated()).toBe(true);
    });

    test('should authenticate with OAuth', async () => {
      const auth = new AuthManager(mockConfig);
      const result = await auth.authenticate(AuthMethod.OAUTH);

      expect(oauthModule.performOAuthFlow).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.method).toBe(AuthMethod.OAUTH);
      expect(mockTokenStorage.saveToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.AUTHENTICATED);
    });

    test('should use preferred method if none specified', async () => {
      const auth = new AuthManager(mockConfig);
      await auth.authenticate();

      // Should use preferred method (API_KEY)
      expect(auth.getState()).toBe(AuthState.AUTHENTICATED);
    });

    test('should handle authentication errors', async () => {
      (oauthModule.performOAuthFlow as jest.Mock).mockRejectedValue(new Error('Auth failed'));

      const auth = new AuthManager(mockConfig);
      const result = await auth.authenticate(AuthMethod.OAUTH);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(auth.getState()).toBe(AuthState.FAILED);
    });

    test('should handle failed OAuth flow', async () => {
      (oauthModule.performOAuthFlow as jest.Mock).mockResolvedValue({
        success: false,
        error: 'User cancelled',
        state: AuthState.FAILED
      });

      const auth = new AuthManager(mockConfig);
      const result = await auth.authenticate(AuthMethod.OAUTH);

      expect(result.success).toBe(false);
      expect(auth.getState()).toBe(AuthState.FAILED);
    });

    test('should fail API key authentication if no key available', async () => {
      const authNoKey = new AuthManager({});
      const result = await authNoKey.authenticateWithApiKey();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should fail OAuth authentication if no config available', async () => {
      const authNoOAuth = new AuthManager({});
      const result = await authNoOAuth.authenticateWithOAuth();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('token management', () => {
    test('should return current token', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      expect(auth.getToken()).toBe(TEST_TOKEN);
    });

    test('should return authorization header', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      expect(auth.getAuthorizationHeader()).toBe('Bearer test-access-token');
    });

    test('should return null authorization header when not authenticated', () => {
      const auth = new AuthManager(mockConfig);
      expect(auth.getAuthorizationHeader()).toBeNull();
    });
  });

  describe('logout', () => {
    test('should log out user and clear token', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();
      expect(auth.isAuthenticated()).toBe(true);

      await auth.logout();

      expect(mockTokenStorage.deleteToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.INITIAL);
      expect(auth.isAuthenticated()).toBe(false);
    });

    test('should handle logout errors', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);
      mockTokenStorage.deleteToken.mockRejectedValue(new Error('Delete failed'));

      const auth = new AuthManager(mockConfig);
      await auth.initialize();
      
      await auth.logout();

      expect(mockTokenStorage.deleteToken).toHaveBeenCalled();
      expect(auth.getState()).toBe(AuthState.INITIAL);
    });

    test('should clear refresh timer on logout', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();
      
      // Access private refreshTimer (for test purposes)
      const authAny = auth as any;
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // Should have a refresh timer
      expect(authAny.refreshTimer).not.toBeNull();
      
      await auth.logout();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(authAny.refreshTimer).toBeNull();
    });
  });

  describe('token refresh', () => {
    test('should schedule token refresh', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);

      const auth = new AuthManager(mockConfig);
      await auth.initialize();

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      // Fast-forward timer
      jest.advanceTimersByTime(3300 * 1000); // Past the refresh threshold
      
      // Should have refreshed token
      expect(oauthModule.refreshOAuthToken).toHaveBeenCalled();
      expect(mockTokenStorage.saveToken).toHaveBeenCalled();
    });
    
    test('should not schedule refresh for tokens without refresh token', async () => {
      const tokenWithoutRefresh = { ...TEST_TOKEN, refreshToken: undefined };
      mockTokenStorage.getToken.mockResolvedValue(tokenWithoutRefresh);
      
      const auth = new AuthManager(mockConfig);
      await auth.initialize();
      
      // Access private refreshTimer (for test purposes)
      const authAny = auth as any;
      expect(authAny.refreshTimer).toBeNull();
    });

    test('should handle token refresh failure', async () => {
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);
      (oauthModule.refreshOAuthToken as jest.Mock).mockRejectedValue(new Error('Refresh failed'));

      const auth = new AuthManager(mockConfig);
      const errorSpy = jest.spyOn(auth, 'emit');
      await auth.initialize();
      
      // Fast-forward timer
      jest.advanceTimersByTime(3300 * 1000);
      
      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorSpy).toHaveBeenCalledWith(AUTH_EVENTS.ERROR, expect.any(Error));
    });
  });
});