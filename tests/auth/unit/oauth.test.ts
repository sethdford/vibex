/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for the OAuth functionality
 */

import { jest } from 'vitest';
import { 
  performOAuthFlow, 
  refreshOAuthToken, 
  DEFAULT_OAUTH_CONFIG
} from '../../../src/auth/oauth.js';
import { AuthMethod, AuthState } from '../../../src/auth/types.js';
import type { OAuthConfig, AuthToken } from '../../../src/auth/types.js';
import { ErrorCategory } from '../../../src/errors/types.js';
import * as async from '../../../src/utils/async.js';

// Mock dependencies
vi.mock('open', () => vi.fn().mockResolvedValue(undefined));
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('../../../src/errors/formatter.js', () => ({
  createUserError: vi.fn((message, options) => {
    const error = new Error(message);
    Object.assign(error, { category: options?.category });
    return error;
  })
}));

vi.mock('../../../src/utils/async.js', () => ({
  createDeferred: vi.fn()
}));

// Mock fetch
const mockFetchResponse = {
  ok: true,
  json: vi.fn(),
  text: vi.fn()
};
global.fetch = vi.fn().mockResolvedValue(mockFetchResponse);

describe('OAuth Authentication', () => {
  // Sample token response
  const tokenResponse = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: 'read write'
  };

  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock response
    mockFetchResponse.json.mockResolvedValue(tokenResponse);
    mockFetchResponse.text.mockResolvedValue('');
    
    // Set up createDeferred mock
    const mockDeferred = {
      promise: Promise.resolve({
        code: 'test-code',
        receivedState: 'test-state'
      }),
      resolve: vi.fn(),
      reject: vi.fn()
    };
    (async.createDeferred as jest.Mock).mockReturnValue(mockDeferred);
  });

  describe('performOAuthFlow', () => {
    test('should complete OAuth flow successfully', async () => {
      // Mock for crypto's random generation
      const originalMathRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const result = await performOAuthFlow(DEFAULT_OAUTH_CONFIG);
      
      // Restore Math.random
      Math.random = originalMathRandom;
      
      expect(result.success).toBe(true);
      expect(result.method).toBe(AuthMethod.OAUTH);
      expect(result.state).toBe(AuthState.AUTHENTICATED);
      expect(result.token).toBeDefined();
    });

    test('should handle OAuth flow errors', async () => {
      // Mock a fetch error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await performOAuthFlow(DEFAULT_OAUTH_CONFIG);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.state).toBe(AuthState.FAILED);
    });

    test('should handle token endpoint errors', async () => {
      // Mock a failed token response
      const mockErrorResponse = {
        ...mockFetchResponse,
        ok: false,
        text: vi.fn().mockResolvedValue('Invalid request')
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse);
      
      const result = await performOAuthFlow(DEFAULT_OAUTH_CONFIG);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.state).toBe(AuthState.FAILED);
    });
  });

  describe('refreshOAuthToken', () => {
    test('should refresh token successfully', async () => {
      const refreshToken = 'test-refresh-token';
      
      const result = await refreshOAuthToken(refreshToken, DEFAULT_OAUTH_CONFIG);
      
      expect(global.fetch).toHaveBeenCalledWith(
        DEFAULT_OAUTH_CONFIG.tokenEndpoint,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('refresh_token=test-refresh-token')
        })
      );
      
      expect(result.accessToken).toBe(tokenResponse.access_token);
      expect(result.refreshToken).toBe(tokenResponse.refresh_token);
    });

    test('should handle refresh token errors', async () => {
      // Mock a failed refresh response
      const mockErrorResponse = {
        ...mockFetchResponse,
        ok: false,
        text: vi.fn().mockResolvedValue('Invalid refresh token')
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockErrorResponse);
      
      const refreshToken = 'invalid-refresh-token';
      
      await expect(refreshOAuthToken(refreshToken, DEFAULT_OAUTH_CONFIG))
        .rejects.toThrow('Failed to refresh authentication token');
    });

    test('should use existing refresh token if new one not provided', async () => {
      // Mock a token response without refresh token
      mockFetchResponse.json.mockResolvedValueOnce({
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer'
      });
      
      const refreshToken = 'existing-refresh-token';
      
      const result = await refreshOAuthToken(refreshToken, DEFAULT_OAUTH_CONFIG);
      
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('existing-refresh-token');
    });

    test('should handle network errors during refresh', async () => {
      // Mock a network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const refreshToken = 'test-refresh-token';
      
      await expect(refreshOAuthToken(refreshToken, DEFAULT_OAUTH_CONFIG))
        .rejects.toThrow('Failed to refresh authentication token');
    });
  });

  describe('DEFAULT_OAUTH_CONFIG', () => {
    test('should have required properties', () => {
      expect(DEFAULT_OAUTH_CONFIG.clientId).toBeDefined();
      expect(DEFAULT_OAUTH_CONFIG.authorizationEndpoint).toBeDefined();
      expect(DEFAULT_OAUTH_CONFIG.tokenEndpoint).toBeDefined();
      expect(DEFAULT_OAUTH_CONFIG.redirectUri).toBeDefined();
      expect(DEFAULT_OAUTH_CONFIG.scopes).toBeInstanceOf(Array);
      expect(DEFAULT_OAUTH_CONFIG.responseType).toBeDefined();
    });
  });
});