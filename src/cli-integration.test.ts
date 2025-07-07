/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tests for CLI integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initializeCli, getDefaultStreamCallbacks, processToolCall } from './cli-integration';
import { CliAdapter } from './adapters/cli-adapter';

// Mock the CliAdapter
vi.mock('./adapters/cli-adapter', () => {
  const MockCliAdapter = vi.fn();
  MockCliAdapter.prototype.initialize = vi.fn().mockResolvedValue(undefined);
  MockCliAdapter.prototype.handleToolResult = vi.fn().mockResolvedValue(undefined);
  
  return {
    CliAdapter: MockCliAdapter
  };
});

// Mock the console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalStdoutWrite = process.stdout.write;

describe('CLI Integration', () => {
  beforeEach(() => {
    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();
    process.stdout.write = vi.fn();
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.stdout.write = originalStdoutWrite;
    
    vi.clearAllMocks();
  });

  describe('initializeCli()', () => {
    it('should create and initialize a CLI adapter', async () => {
      const config = {
        apiKey: 'test-api-key',
        defaultModel: 'claude-3-test'
      };
      
      const adapter = await initializeCli(config);
      
      expect(CliAdapter).toHaveBeenCalledWith('test-api-key', {
        baseDir: expect.any(String),
        defaultModel: 'claude-3-test'
      });
      
      expect(adapter.initialize).toHaveBeenCalled();
    });
    
    it('should use default model if not provided', async () => {
      const config = {
        apiKey: 'test-api-key'
      };
      
      await initializeCli(config);
      
      expect(CliAdapter).toHaveBeenCalledWith('test-api-key', {
        baseDir: expect.any(String),
        defaultModel: 'claude-3-7-sonnet'
      });
    });
  });

  describe('getDefaultStreamCallbacks()', () => {
    it('should return callbacks for streaming output', () => {
      const callbacks = getDefaultStreamCallbacks();
      
      expect(callbacks).toHaveProperty('onContent');
      expect(callbacks).toHaveProperty('onToolCall');
      expect(callbacks).toHaveProperty('onThought');
      expect(callbacks).toHaveProperty('onComplete');
      expect(callbacks).toHaveProperty('onError');
      
      // Test the callbacks
      callbacks.onContent('test content');
      expect(process.stdout.write).toHaveBeenCalledWith('test content');
      
      callbacks.onToolCall('search', { query: 'test' });
      expect(console.log).toHaveBeenCalled();
      
      callbacks.onThought({ subject: 'thinking' });
      expect(console.log).toHaveBeenCalled();
      
      callbacks.onComplete();
      expect(console.log).toHaveBeenCalled();
      
      callbacks.onError(new Error('test error'));
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('processToolCall()', () => {
    it('should handle search tool calls', async () => {
      const mockAdapter = {
        handleToolResult: vi.fn().mockResolvedValue(undefined)
      };
      
      await processToolCall(
        mockAdapter as unknown as CliAdapter,
        'tool-1',
        'search',
        { query: 'test query' }
      );
      
      expect(console.log).toHaveBeenCalled();
      expect(mockAdapter.handleToolResult).toHaveBeenCalledWith(
        'tool-1',
        expect.objectContaining({
          results: expect.any(Array)
        })
      );
    });
    
    it('should handle readFile tool calls', async () => {
      const mockAdapter = {
        handleToolResult: vi.fn().mockResolvedValue(undefined)
      };
      
      await processToolCall(
        mockAdapter as unknown as CliAdapter,
        'tool-2',
        'readFile',
        { path: 'test/file.txt' }
      );
      
      expect(console.log).toHaveBeenCalled();
      expect(mockAdapter.handleToolResult).toHaveBeenCalledWith(
        'tool-2',
        expect.objectContaining({
          content: expect.any(String)
        })
      );
    });
    
    it('should handle unknown tool calls', async () => {
      const mockAdapter = {
        handleToolResult: vi.fn().mockResolvedValue(undefined)
      };
      
      await processToolCall(
        mockAdapter as unknown as CliAdapter,
        'tool-3',
        'unknownTool',
        { foo: 'bar' }
      );
      
      expect(console.log).toHaveBeenCalled();
      expect(mockAdapter.handleToolResult).toHaveBeenCalledWith(
        'tool-3',
        expect.objectContaining({
          error: expect.stringContaining('not implemented')
        })
      );
    });
    
    it('should handle errors during tool execution', async () => {
      const mockAdapter = {
        handleToolResult: vi.fn().mockResolvedValue(undefined)
      };
      
      // Create a mock implementation that throws an error
      const mockProcessToolCall = async () => {
        throw new Error('Tool execution failed');
      };
      
      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error');
      
      // Force an error by passing a function that will throw
      await processToolCall(
        mockAdapter as unknown as CliAdapter,
        'tool-4',
        'errorTool',
        { triggerError: true }
      );
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockAdapter.handleToolResult).toHaveBeenCalledWith(
        'tool-4',
        expect.objectContaining({
          error: expect.stringContaining('Tool execution failed')
        })
      );
    });
  });
});