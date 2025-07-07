/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration tests for the authentication flow
 */

import { jest } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { authManager } from '../../../src/auth/instance.js';
import { AuthManager } from '../../../src/auth/manager.js';
import { AuthMethod, AuthState } from '../../../src/auth/types.js';
import * as tokenModule from '../../../src/auth/tokens.js';
import * as oauthModule from '../../../src/auth/oauth.js';

// Mock dependencies
vi.mock('fs/promises');
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../src/auth/oauth.js', () => {
  const originalModule = jest.requireActual('../../../src/auth/oauth.js');
  return {
    ...originalModule,
    performOAuthFlow: vi.fn(),
    refreshOAuthToken: vi.fn(),
  };
});

const TEST_TOKEN = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  tokenType: 'Bearer',
  expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  scope: 'read write'
};

describe('Authentication Flow Integration', () => {
  // Create mocks for token storage
  const mockTokenStorage = {
    saveToken: vi.fn(),
    getToken: vi.fn(),
    deleteToken: vi.fn(),
    clearTokens: vi.fn()
  };

  // Set up authentication manager for integration tests
  let auth: AuthManager;

  beforeAll(() => {
    // Ensure mock setup is consistent
    (tokenModule.createTokenStorage as jest.Mock) = vi.fn().mockReturnValue(mockTokenStorage);
  });

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset token storage mock
    mockTokenStorage.getToken.mockResolvedValue(null);
    
    // Reset OAuth mocks
    (oauthModule.performOAuthFlow as jest.Mock).mockResolvedValue({
      success: true,
      token: TEST_TOKEN,
      method: AuthMethod.OAUTH,
      state: AuthState.AUTHENTICATED
    });
    
    (oauthModule.refreshOAuthToken as jest.Mock).mockResolvedValue(TEST_TOKEN);
    
    // Create a fresh instance for each test
    auth = authManager;
  });

  describe('Authentication Lifecycle', () => {
    test('should initialize, authenticate, and logout', async () => {
      // 1. Initialize - no token available yet
      mockTokenStorage.getToken.mockResolvedValue(null);
      await auth.initialize();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getState()).toBe(AuthState.INITIAL);

      // 2. Authenticate with OAuth
      const authResult = await auth.authenticate(AuthMethod.OAUTH);
      expect(authResult.success).toBe(true);
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getState()).toBe(AuthState.AUTHENTICATED);
      expect(mockTokenStorage.saveToken).toHaveBeenCalled();

      // 3. Get auth header for API requests
      const authHeader = auth.getAuthorizationHeader();
      expect(authHeader).toBe('Bearer test-access-token');

      // 4. Logout
      await auth.logout();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getState()).toBe(AuthState.INITIAL);
      expect(mockTokenStorage.deleteToken).toHaveBeenCalled();
    });

    test('should handle token refresh during session', async () => {
      // 1. Initialize with expired token
      const expiredToken = {
        ...TEST_TOKEN,
        accessToken: 'expired-token',
        expiresAt: Math.floor(Date.now() / 1000) - 100 // Expired 100 seconds ago
      };
      mockTokenStorage.getToken.mockResolvedValue(expiredToken);
      
      // Mock isTokenExpired to return true
      vi.spyOn(tokenModule, 'isTokenExpired').mockReturnValue(true);
      
      // 2. Initialize - should try to refresh
      await auth.initialize();
      
      expect(oauthModule.refreshOAuthToken).toHaveBeenCalled();
      expect(mockTokenStorage.saveToken).toHaveBeenCalled();
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle OAuth authentication failures', async () => {
      (oauthModule.performOAuthFlow as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Authentication failed',
        state: AuthState.FAILED
      });
      
      const result = await auth.authenticate(AuthMethod.OAUTH);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getState()).toBe(AuthState.FAILED);
    });

    test('should handle token refresh failures', async () => {
      // 1. Initialize with token that needs refresh
      mockTokenStorage.getToken.mockResolvedValue(TEST_TOKEN);
      vi.spyOn(tokenModule, 'isTokenExpired').mockReturnValue(true);
      
      // 2. Make refresh token fail
      (oauthModule.refreshOAuthToken as jest.Mock).mockRejectedValue(new Error('Refresh failed'));
      
      // 3. Initialize should handle refresh failure
      await auth.initialize();
      
      expect(oauthModule.refreshOAuthToken).toHaveBeenCalled();
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getState()).toBe(AuthState.INITIAL);
    });

    test('should handle getToken failures', async () => {
      mockTokenStorage.getToken.mockRejectedValue(new Error('Storage error'));
      
      await auth.initialize();
      
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getState()).toBe(AuthState.FAILED);
    });
  });

  describe('Singleton Instance', () => {
    test('authManager should be a singleton', () => {
      expect(authManager).toBeInstanceOf(AuthManager);
      
      // The imported instance should be the same as what we're using
      expect(auth).toBe(authManager);
    });
  });
});