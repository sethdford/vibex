/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for main error module exports and custom error classes
 */

import { jest } from 'vitest';
import {
  UserError,
  ErrorCategory,
  FileSystemError,
  NetworkError,
  AuthenticationError,
  AIError
} from '../../../src/errors/index.js';

describe('Error Module Exports', () => {
  describe('Custom Error Classes', () => {
    test('FileSystemError should extend UserError with proper category', () => {
      const error = new FileSystemError('File not found');
      
      expect(error).toBeInstanceOf(UserError);
      expect(error).toBeInstanceOf(FileSystemError);
      expect(error.name).toBe('FileSystemError');
      expect(error.message).toBe('File not found');
      expect(error.category).toBe(ErrorCategory.FILE_SYSTEM);
    });
    
    test('NetworkError should extend UserError with proper category', () => {
      const error = new NetworkError('Connection failed');
      
      expect(error).toBeInstanceOf(UserError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.category).toBe(ErrorCategory.NETWORK);
    });
    
    test('AuthenticationError should extend UserError with proper category', () => {
      const error = new AuthenticationError('Invalid credentials');
      
      expect(error).toBeInstanceOf(UserError);
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Invalid credentials');
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
    });
    
    test('AIError should extend UserError with proper category', () => {
      const error = new AIError('Model failed to respond');
      
      expect(error).toBeInstanceOf(UserError);
      expect(error).toBeInstanceOf(AIError);
      expect(error.name).toBe('AIError');
      expect(error.message).toBe('Model failed to respond');
      expect(error.category).toBe(ErrorCategory.AI_SERVICE);
    });
    
    test('Custom errors should accept additional options', () => {
      const cause = new Error('Original error');
      const error = new NetworkError('Connection timeout', {
        level: 3, // ErrorLevel.INFORMATIONAL
        resolution: 'Check your network connection',
        details: { endpoint: 'api.example.com' },
        cause
      });
      
      expect(error.message).toBe('Connection timeout');
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.level).toBe(3);
      expect(error.resolution).toBe('Check your network connection');
      expect(error.details).toEqual({ endpoint: 'api.example.com' });
      expect(error.cause).toBe(cause);
    });
    
    test('Custom errors should preserve stack trace', () => {
      const error = new AuthenticationError('Failed to authenticate');
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AuthenticationError: Failed to authenticate');
    });
  });
});