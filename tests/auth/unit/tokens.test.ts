/**
 * Unit tests for the tokens module
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import {
  isTokenExpired,
  validateToken,
  formatTokenExpiration,
  getTokenDetails,
  extractTokenFromHeader,
  createAuthorizationHeader,
  createTokenStorage
} from '../../../src/auth/tokens.js';
import type { AuthToken } from '../../../src/auth/types.js';

// Mock console to prevent test pollution
jest.mock('console', () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Define mock constants before using them in jest.mock
const mockHomedir = '/mock/home/dir';

// Mock os module
jest.mock('os', () => ({
  homedir: jest.fn(() => mockHomedir)
}));

// Test constants
const TOKEN_FILE_PATH = path.join(mockHomedir, '.claude-code-auth.json');
const TEST_TOKEN: AuthToken = {
  accessToken: 'test-access-token',
  tokenType: 'Bearer',
  expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  scope: 'read write'
};

describe('Auth Token Management', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isTokenExpired', () => {
    test('should return false for non-expiring token', () => {
      const token = { ...TEST_TOKEN, expiresAt: 0 };
      expect(isTokenExpired(token)).toBe(false);
    });

    test('should return false for token that is not expired', () => {
      const token = { ...TEST_TOKEN };
      expect(isTokenExpired(token)).toBe(false);
    });

    test('should return true for expired token', () => {
      const token = {
        ...TEST_TOKEN,
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      expect(isTokenExpired(token)).toBe(true);
    });

    test('should return true for token that expires within the threshold', () => {
      const token = {
        ...TEST_TOKEN,
        expiresAt: Math.floor(Date.now() / 1000) + 30 // 30 seconds from now
      };
      expect(isTokenExpired(token, 60)).toBe(true); // 60 second threshold
    });
  });

  describe('validateToken', () => {
    test('should return true for valid token', () => {
      const token = { ...TEST_TOKEN };
      expect(validateToken(token)).toBe(true);
    });

    test('should return false for token without accessToken', () => {
      const token = { ...TEST_TOKEN, accessToken: '' };
      expect(validateToken(token)).toBe(false);
    });

    test('should return false for expired token', () => {
      const token = {
        ...TEST_TOKEN,
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      expect(validateToken(token)).toBe(false);
    });
  });

  describe('formatTokenExpiration', () => {
    test('should format timestamp correctly', () => {
      const timestamp = Math.floor(Date.now() / 1000) + 3600;
      const result = formatTokenExpiration(timestamp);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('never');
    });

    test('should return "never" for 0 timestamp', () => {
      expect(formatTokenExpiration(0)).toBe('never');
    });
  });

  describe('getTokenDetails', () => {
    test('should return formatted token details', () => {
      const token = { ...TEST_TOKEN };
      const details = getTokenDetails(token);

      expect(details.type).toBe('Bearer');
      expect(details.expires).toBeDefined();
      expect(details.expiresIn).toBeDefined();
      expect(details.scope).toBe('read write');
      expect(details.accessToken).toMatch(/^test.*n$/);
    });

    test('should handle token without expiration', () => {
      const token = { ...TEST_TOKEN, expiresAt: 0 };
      const details = getTokenDetails(token);

      expect(details.expires).toBe('Never');
    });

    test('should handle expired token', () => {
      const token = {
        ...TEST_TOKEN,
        expiresAt: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      const details = getTokenDetails(token);

      expect(details.expiresIn).toBe('Expired');
    });

    test('should include token ID if available', () => {
      const token = { ...TEST_TOKEN, id: 'test-id' };
      const details = getTokenDetails(token);

      expect(details.id).toBe('test-id');
    });
  });

  describe('extractTokenFromHeader', () => {
    test('should extract Bearer token', () => {
      const header = 'Bearer test-token';
      expect(extractTokenFromHeader(header)).toBe('test-token');
    });

    test('should extract token without prefix', () => {
      const header = 'test-token';
      expect(extractTokenFromHeader(header)).toBe('test-token');
    });

    test('should return null for invalid header', () => {
      const header = 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=';
      expect(extractTokenFromHeader(header)).toBeNull();
    });

    test('should return null for empty header', () => {
      expect(extractTokenFromHeader('')).toBeNull();
    });
  });

  describe('createAuthorizationHeader', () => {
    test('should create header with token type', () => {
      const token = { ...TEST_TOKEN };
      expect(createAuthorizationHeader(token)).toBe('Bearer test-access-token');
    });

    test('should use default Bearer type if none provided', () => {
      const token = { ...TEST_TOKEN, tokenType: '' };
      expect(createAuthorizationHeader(token)).toBe('Bearer test-access-token');
    });
  });

  describe('createTokenStorage', () => {
    const tokenStorage = createTokenStorage();
    const mockToken = { ...TEST_TOKEN };
    const mockKey = 'test-service';

    test('should save token to file', async () => {
      // Mock fs.writeFile implementation
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      mockWriteFile.mockResolvedValue(undefined);

      await tokenStorage.saveToken(mockKey, mockToken);

      expect(mockWriteFile).toHaveBeenCalledWith(
        TOKEN_FILE_PATH,
        JSON.stringify({ [mockKey]: mockToken })
      );
    });

    test('should handle save token errors', async () => {
      // Mock fs.writeFile to throw
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      mockWriteFile.mockRejectedValue(new Error('Write error'));

      await tokenStorage.saveToken(mockKey, mockToken);

      // Should log error but not throw
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('should get token from file', async () => {
      // Mock fs.readFile implementation
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify({ [mockKey]: mockToken }));

      const result = await tokenStorage.getToken(mockKey);

      expect(mockReadFile).toHaveBeenCalledWith(TOKEN_FILE_PATH, 'utf-8');
      expect(result).toEqual(mockToken);
    });

    test('should return null if token not found', async () => {
      // Mock fs.readFile implementation
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify({}));

      const result = await tokenStorage.getToken(mockKey);

      expect(mockReadFile).toHaveBeenCalledWith(TOKEN_FILE_PATH, 'utf-8');
      expect(result).toBeNull();
    });

    test('should handle file not found', async () => {
      // Mock fs.readFile to throw ENOENT
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      const error = new Error('File not found');
      Object.defineProperty(error, 'code', { value: 'ENOENT' });
      mockReadFile.mockRejectedValue(error);

      const result = await tokenStorage.getToken(mockKey);

      expect(mockReadFile).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should handle read errors', async () => {
      // Mock fs.readFile to throw general error
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockRejectedValue(new Error('Read error'));

      const result = await tokenStorage.getToken(mockKey);

      expect(mockReadFile).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should delete token from file', async () => {
      // Mock fs.readFile and fs.writeFile implementation
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
      
      mockReadFile.mockResolvedValue(JSON.stringify({ 
        [mockKey]: mockToken,
        'other-key': mockToken 
      }));
      mockWriteFile.mockResolvedValue(undefined);

      await tokenStorage.deleteToken(mockKey);

      expect(mockReadFile).toHaveBeenCalledWith(TOKEN_FILE_PATH, 'utf-8');
      expect(mockWriteFile).toHaveBeenCalledWith(
        TOKEN_FILE_PATH,
        JSON.stringify({ 'other-key': mockToken })
      );
    });

    test('should handle delete token file not found', async () => {
      // Mock fs.readFile to throw ENOENT
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      const error = new Error('File not found');
      Object.defineProperty(error, 'code', { value: 'ENOENT' });
      mockReadFile.mockRejectedValue(error);

      await tokenStorage.deleteToken(mockKey);

      expect(mockReadFile).toHaveBeenCalled();
    });

    test('should handle delete token errors', async () => {
      // Mock fs.readFile to throw general error
      const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
      mockReadFile.mockRejectedValue(new Error('Delete error'));

      await tokenStorage.deleteToken(mockKey);

      expect(mockReadFile).toHaveBeenCalled();
    });

    test('should clear all tokens', async () => {
      // Mock fs.unlink implementation
      const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
      mockUnlink.mockResolvedValue(undefined);

      await tokenStorage.clearTokens();

      expect(mockUnlink).toHaveBeenCalledWith(TOKEN_FILE_PATH);
    });

    test('should handle clear tokens file not found', async () => {
      // Mock fs.unlink to throw ENOENT
      const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
      const error = new Error('File not found');
      Object.defineProperty(error, 'code', { value: 'ENOENT' });
      mockUnlink.mockRejectedValue(error);

      await tokenStorage.clearTokens();

      expect(mockUnlink).toHaveBeenCalled();
    });

    test('should handle clear tokens errors', async () => {
      // Mock fs.unlink to throw general error
      const mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
      mockUnlink.mockRejectedValue(new Error('Unlink error'));

      await tokenStorage.clearTokens();

      expect(mockUnlink).toHaveBeenCalled();
    });
  });
});