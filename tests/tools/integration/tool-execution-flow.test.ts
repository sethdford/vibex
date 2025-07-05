/**
 * Integration tests for tool execution flow
 */

import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  registerBuiltInTools,
  getAllTools,
  executeTool,
  getToolStats,
  clearToolStats,
  type ToolUseBlock
} from '../../../src/tools/index.js';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock for child_process exec
jest.mock('child_process', () => {
  return {
    exec: jest.fn((cmd, options, callback) => {
      if (callback) {
        if (cmd.includes('fail')) {
          callback(new Error('Command failed'), '', 'Error output');
        } else {
          callback(null, 'Command output', '');
        }
      }
    })
  };
});

// Mock for fetch (used in web-fetch)
jest.mock('node-fetch', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: () => 'text/html'
      },
      text: () => Promise.resolve('<html><title>Test</title><body>Test content</body></html>')
    }))
  };
});

describe('Tool Execution Flow Integration', () => {
  // Setup temp file path
  const tempDir = '/mock/temp';
  const tempFilePath = path.join(tempDir, 'test-file.txt');

  beforeAll(async () => {
    // Register all built-in tools
    await registerBuiltInTools();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset stats
    clearToolStats();
    
    // Setup fs mocks
    (fs.readFile as jest.Mock).mockResolvedValue('File content');
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Tool Integration', () => {
    test('should execute read_file and write_file in sequence', async () => {
      // Setup file content
      const fileContent = 'Test file content\nLine 2\nLine 3';
      (fs.readFile as jest.Mock).mockResolvedValueOnce(fileContent);
      
      // First tool use: read file
      const readFileUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'read1',
        name: 'read_file',
        input: { path: tempFilePath }
      };
      
      // Execute read
      const readResult = await executeTool(readFileUse);
      expect(readResult.tool_use_id).toBe('read1');
      expect(readResult.is_error).toBeUndefined();
      
      // Parse the JSON result
      const readData = JSON.parse(readResult.content);
      expect(readData.content).toBe(fileContent);
      expect(readData.lines).toBe(3);
      
      // Second tool use: write modified content
      const modifiedContent = fileContent + '\nAdded line 4';
      const writeFileUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'write1',
        name: 'write_file',
        input: {
          path: tempFilePath,
          content: modifiedContent
        }
      };
      
      // Execute write
      const writeResult = await executeTool(writeFileUse);
      expect(writeResult.tool_use_id).toBe('write1');
      expect(writeResult.is_error).toBeUndefined();
      
      // Check the fs calls
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('test-file.txt'), 'utf-8');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-file.txt'),
        modifiedContent,
        'utf-8'
      );
      
      // Check tool stats
      const stats = getToolStats();
      expect(stats['read_file'].count).toBe(1);
      expect(stats['write_file'].count).toBe(1);
    });

    test('should execute command and process output', async () => {
      const commandUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'cmd1',
        name: 'execute_command',
        input: {
          command: 'echo "hello world"',
          timeout: 5000
        }
      };
      
      const result = await executeTool(commandUse);
      expect(result.tool_use_id).toBe('cmd1');
      expect(result.is_error).toBeUndefined();
      
      const commandData = JSON.parse(result.content);
      expect(commandData.command).toBe('echo "hello world"');
      expect(commandData.stdout).toBeDefined();
      
      // Check command execution
      const { exec } = require('child_process');
      expect(exec).toHaveBeenCalled();
    });

    test('should fetch web content and process it', async () => {
      const fetchUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'fetch1',
        name: 'web_fetch',
        input: {
          prompt: 'Analyze the content at https://example.com',
          max_urls: 1
        }
      };
      
      const result = await executeTool(fetchUse);
      expect(result.tool_use_id).toBe('fetch1');
      expect(result.is_error).toBeUndefined();
      
      const fetch = require('node-fetch').default;
      expect(fetch).toHaveBeenCalledWith('https://example.com', expect.anything());
      
      // Result content should include URL and fetched content
      expect(result.content).toContain('https://example.com');
      expect(result.content).toContain('Test content');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle file not found errors', async () => {
      // Mock file not found
      const fileError = new Error('File not found');
      Object.defineProperty(fileError, 'code', { value: 'ENOENT' });
      (fs.stat as jest.Mock).mockRejectedValueOnce(fileError);
      
      const readFileUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'read-error',
        name: 'read_file',
        input: { path: '/non-existent/file.txt' }
      };
      
      const result = await executeTool(readFileUse);
      expect(result.tool_use_id).toBe('read-error');
      expect(result.is_error).toBe(true);
      expect(result.content).toContain('File not found');
      
      // Check stats
      const stats = getToolStats();
      expect(stats['read_file'].count).toBe(1);
      expect(stats['read_file'].successRate).toBe(0); // 0% success rate
    });

    test('should handle command execution errors', async () => {
      const commandUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'cmd-fail',
        name: 'execute_command',
        input: {
          command: 'command-that-will-fail',
          timeout: 1000
        }
      };
      
      const result = await executeTool(commandUse);
      expect(result.tool_use_id).toBe('cmd-fail');
      expect(result.is_error).toBe(true);
      expect(result.content).toContain('Command failed');
    });
  });

  describe('Feedback Integration', () => {
    test('should provide progress feedback during tool execution', async () => {
      const onStart = jest.fn(() => 'feedback-id');
      const onProgress = jest.fn();
      const onComplete = jest.fn();
      
      const readFileUse: ToolUseBlock = {
        type: 'tool_use',
        id: 'feedback-test',
        name: 'read_file',
        input: { path: tempFilePath }
      };
      
      await executeTool(readFileUse, { onStart, onProgress, onComplete });
      
      expect(onStart).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
      
      // Check the feedback flow
      expect(onStart).toHaveBeenCalledWith('read_file', tempFilePath, expect.any(String));
      
      // Progress should be called with status updates
      const progressCall = onProgress.mock.calls[0];
      expect(progressCall[0]).toBe('feedback-id');
      expect(progressCall[1].status).toBeDefined();
      
      // Complete should be called with the final result
      const completeCall = onComplete.mock.calls[0];
      expect(completeCall[0]).toBe('feedback-id');
      expect(completeCall[1].success).toBe(true);
      expect(completeCall[1].result).toBeDefined();
    });
  });
});