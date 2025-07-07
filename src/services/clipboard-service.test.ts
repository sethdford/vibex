/**
 * Clipboard Service Tests
 * 
 * Comprehensive testing following Gemini CLI patterns
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { clipboardService } from './clipboard-service.js';
import { logger } from '../utils/logger.js';

// Mock dependencies
vi.mock('../utils/logger.js');
vi.mock('child_process');

const mockLogger = logger as unknown as {
  error: Mock;
  debug: Mock;
};

// Mock navigator for browser environment tests
const mockNavigator = {
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(),
  }
};

describe('ClipboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global navigator mock
    (global as any).navigator = undefined;
  });

  describe('copyToClipboard', () => {
    it('should copy text using navigator.clipboard when available', async () => {
      (global as any).navigator = mockNavigator;
      mockNavigator.clipboard.writeText.mockResolvedValue(undefined);

      const result = await clipboardService.copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockNavigator.clipboard.writeText).toHaveBeenCalledWith('test text');
      expect(mockLogger.debug).toHaveBeenCalledWith('Text copied to clipboard using navigator.clipboard');
    });

    it('should handle navigator.clipboard errors', async () => {
      (global as any).navigator = mockNavigator;
      const error = new Error('Clipboard access denied');
      mockNavigator.clipboard.writeText.mockRejectedValue(error);

      const result = await clipboardService.copyToClipboard('test text');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to copy to clipboard', error);
    });

    it('should reject empty text', async () => {
      const result1 = await clipboardService.copyToClipboard('');
      const result2 = await clipboardService.copyToClipboard('   ');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Cannot copy empty text to clipboard');
    });

    it('should use platform-specific commands when navigator unavailable', async () => {
      // Mock child_process spawn
      const mockSpawn = vi.fn();
      const mockProc = {
        stdin: {
          write: vi.fn(),
          end: vi.fn(),
        },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      
      // Mock dynamic import
      vi.doMock('child_process', () => ({
        spawn: mockSpawn,
      }));

      // Simulate successful copy
      mockProc.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const result = await clipboardService.copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('pbcopy', []);
      expect(mockProc.stdin.write).toHaveBeenCalledWith('test text');
      expect(mockProc.stdin.end).toHaveBeenCalled();

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should handle unsupported platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'unsupported',
        configurable: true,
      });

      const result = await clipboardService.copyToClipboard('test text');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Clipboard not supported on platform: unsupported');

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });
  });

  describe('readFromClipboard', () => {
    it('should read text using navigator.clipboard when available', async () => {
      (global as any).navigator = mockNavigator;
      mockNavigator.clipboard.readText.mockResolvedValue('clipboard content');

      const result = await clipboardService.readFromClipboard();

      expect(result).toBe('clipboard content');
      expect(mockNavigator.clipboard.readText).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Text read from clipboard using navigator.clipboard');
    });

    it('should handle navigator.clipboard read errors', async () => {
      (global as any).navigator = mockNavigator;
      const error = new Error('Clipboard read denied');
      mockNavigator.clipboard.readText.mockRejectedValue(error);

      const result = await clipboardService.readFromClipboard();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to read from clipboard', error);
    });

    it('should use platform-specific commands when navigator unavailable', async () => {
      // Mock child_process spawn
      const mockSpawn = vi.fn();
      const mockProc = {
        stdout: {
          on: vi.fn(),
        },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      
      // Mock dynamic import
      vi.doMock('child_process', () => ({
        spawn: mockSpawn,
      }));

      // Simulate successful read
      mockProc.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('clipboard content')), 0);
        }
      });

      mockProc.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 0);
        }
      });

      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const result = await clipboardService.readFromClipboard();

      expect(result).toBe('clipboard content');
      expect(mockSpawn).toHaveBeenCalledWith('pbpaste', []);

      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true,
      });
    });

    it('should handle platform command failures', async () => {
      // Mock child_process spawn
      const mockSpawn = vi.fn();
      const mockProc = {
        stdout: {
          on: vi.fn(),
        },
        on: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      
      // Mock dynamic import
      vi.doMock('child_process', () => ({
        spawn: mockSpawn,
      }));

      // Simulate command failure
      mockProc.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 0); // Non-zero exit code
        }
      });

      const result = await clipboardService.readFromClipboard();

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Clipboard read command failed with code: 1');
    });
  });
}); 