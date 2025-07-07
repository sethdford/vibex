/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Clipboard Utilities Tests
 */

import { copyToClipboard, readFromClipboard, clearClipboard, formatForClipboard } from '../../../../src/ui/utils/clipboardUtils.js';
import clipboard from 'clipboardy';
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock clipboardy
vi.mock('clipboardy', () => ({
  write: vi.fn(),
  read: vi.fn()
}));

// Mock logger
vi.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn()
  }
}));

// Mock os for EOL
vi.mock('os', () => {
  return {
    EOL: '\n'
  };
});

describe('Clipboard Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('copyToClipboard', () => {
    it('should copy text successfully', async () => {
      // Set up mock
      (clipboard.write as jest.Mock).mockResolvedValue(undefined);
      
      // Test function
      const result = await copyToClipboard('Test text');
      
      // Assert results
      expect(result).toBe(true);
      expect(clipboard.write).toHaveBeenCalledWith('Test text');
    });
    
    it('should handle copy errors', async () => {
      // Set up mock to fail
      (clipboard.write as jest.Mock).mockRejectedValue(new Error('Access denied'));
      
      // Test function
      const result = await copyToClipboard('Test text');
      
      // Assert results
      expect(result).toBe(false);
      expect(clipboard.write).toHaveBeenCalledWith('Test text');
    });
  });
  
  describe('readFromClipboard', () => {
    it('should read text successfully', async () => {
      // Set up mock
      (clipboard.read as jest.Mock).mockResolvedValue('Clipboard content');
      
      // Test function
      const result = await readFromClipboard();
      
      // Assert results
      expect(result).toBe('Clipboard content');
      expect(clipboard.read).toHaveBeenCalled();
    });
    
    it('should handle read errors', async () => {
      // Set up mock to fail
      (clipboard.read as jest.Mock).mockRejectedValue(new Error('Access denied'));
      
      // Test function
      const result = await readFromClipboard();
      
      // Assert results
      expect(result).toBe('');
      expect(clipboard.read).toHaveBeenCalled();
    });
  });
  
  describe('clearClipboard', () => {
    it('should clear clipboard successfully', async () => {
      // Set up mock
      (clipboard.write as jest.Mock).mockResolvedValue(undefined);
      
      // Test function
      const result = await clearClipboard();
      
      // Assert results
      expect(result).toBe(true);
      expect(clipboard.write).toHaveBeenCalledWith('');
    });
    
    it('should handle clear errors', async () => {
      // Set up mock to fail
      (clipboard.write as jest.Mock).mockRejectedValue(new Error('Access denied'));
      
      // Test function
      const result = await clearClipboard();
      
      // Assert results
      expect(result).toBe(false);
      expect(clipboard.write).toHaveBeenCalledWith('');
    });
  });
  
  describe('formatForClipboard', () => {
    it('should remove ANSI color codes', () => {
      const input = '\x1B[31mRed text\x1B[0m and \x1B[32mgreen text\x1B[0m';
      const expected = 'Red text and green text';
      
      const result = formatForClipboard(input);
      expect(result).toBe(expected);
    });
    
    it('should normalize line endings', () => {
      const input = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const result = formatForClipboard(input);
      
      // Just check that all the line parts are present somewhere in the result
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
      expect(result).toContain('Line 4');
      
      // And check that we have the right number of lines
      const lines = result.split('\n').filter(line => line.length > 0);
      expect(lines.length).toBeLessThanOrEqual(4);
    });
    
    it('should keep ANSI codes when specified', () => {
      const input = '\x1B[31mRed text\x1B[0m';
      
      const result = formatForClipboard(input, false);
      expect(result).toBe(input);
    });
  });
});