/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadFileTool } from '../read-file-adapter';
import { WriteFileTool } from '../write-file-adapter';
import { ShellTool } from '../shell-adapter';

// Mock the legacy functions
vi.mock('../../../../tools/read-file.js', () => ({
  readFile: vi.fn().mockImplementation(async (params) => {
    if (params.path === '/not/found') {
      return {
        content: '',
        size: 0,
        path: params.path,
        success: false,
        error: 'File not found'
      };
    }
    return {
      content: 'file content',
      size: 12,
      path: params.path,
      success: true
    };
  })
}));

vi.mock('../../../../tools/write-file.js', () => ({
  writeFile: vi.fn().mockImplementation(async (params) => {
    if (params.path === '/permission/denied') {
      return {
        path: params.path,
        bytesWritten: 0,
        success: false,
        created: false,
        error: 'Permission denied'
      };
    }
    return {
      path: params.path,
      bytesWritten: params.content.length,
      success: true,
      created: true,
      backupPath: params.createBackup ? `${params.path}.backup` : undefined
    };
  })
}));

vi.mock('../../../../tools/shell.js', () => ({
  executeShell: vi.fn().mockImplementation(async (params) => {
    if (params.command === 'fail') {
      return {
        command: params.command,
        exitCode: 1,
        stdout: '',
        stderr: 'Command failed',
        success: false,
        signal: null,
        executionTime: 100,
        cwd: params.cwd || process.cwd()
      };
    }
    return {
      command: params.command,
      exitCode: 0,
      stdout: 'command output',
      stderr: '',
      success: true,
      signal: null,
      executionTime: 100,
      cwd: params.cwd || process.cwd()
    };
  })
}));

describe('Tool Adapters', () => {
  describe('ReadFileTool', () => {
    let readFileTool: ReadFileTool;

    beforeEach(() => {
      readFileTool = new ReadFileTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(readFileTool.validateParams({ file_path: '/path/to/file' })).toBeNull();
      
      // Missing required params
      expect(readFileTool.validateParams({})).not.toBeNull();
      
      // Invalid type
      expect(readFileTool.validateParams({ file_path: 123 })).not.toBeNull();
    });

    it('should execute and return success result', async () => {
      const result = await readFileTool.execute({ 
        file_path: '/path/to/file',
        encoding: 'utf8'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBe('file content');
      expect(result.metadata?.size).toBe(12);
    });

    it('should handle errors during execution', async () => {
      const result = await readFileTool.execute({ 
        file_path: '/not/found'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('WriteFileTool', () => {
    let writeFileTool: WriteFileTool;

    beforeEach(() => {
      writeFileTool = new WriteFileTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(writeFileTool.validateParams({ 
        file_path: '/path/to/file',
        content: 'content'
      })).toBeNull();
      
      // Missing required params
      expect(writeFileTool.validateParams({ file_path: '/path/to/file' })).not.toBeNull();
      expect(writeFileTool.validateParams({ content: 'content' })).not.toBeNull();
      
      // Invalid types
      expect(writeFileTool.validateParams({ 
        file_path: 123,
        content: 'content'
      })).not.toBeNull();
    });

    it('should require confirmation before execution', async () => {
      const confirmationDetails = await writeFileTool.shouldConfirmExecute({
        file_path: '/path/to/file',
        content: 'content'
      });
      
      expect(confirmationDetails).not.toBeNull();
      expect(confirmationDetails!.type).toBe('edit');
    });

    it('should execute and return success result', async () => {
      const result = await writeFileTool.execute({ 
        file_path: '/path/to/file',
        content: 'content',
        create_backup: true
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect((result.data as any).backupPath).toBe('/path/to/file.backup');
    });

    it('should handle errors during execution', async () => {
      const result = await writeFileTool.execute({ 
        file_path: '/permission/denied',
        content: 'content'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('ShellTool', () => {
    let shellTool: ShellTool;

    beforeEach(() => {
      shellTool = new ShellTool();
    });

    it('should validate parameters correctly', () => {
      // Valid params
      expect(shellTool.validateParams({ command: 'echo hello' })).toBeNull();
      
      // Missing required params
      expect(shellTool.validateParams({})).not.toBeNull();
      
      // Invalid types
      expect(shellTool.validateParams({ command: 123 })).not.toBeNull();
    });

    it('should require confirmation before execution', async () => {
      const confirmationDetails = await shellTool.shouldConfirmExecute({
        command: 'echo hello'
      });
      
      expect(confirmationDetails).not.toBeNull();
      expect(confirmationDetails!.type).toBe('exec');
    });

    it('should require danger confirmation for dangerous commands', async () => {
      const confirmationDetails = await shellTool.shouldConfirmExecute({
        command: 'rm -rf /some/path'
      });
      
      expect(confirmationDetails).not.toBeNull();
      expect(confirmationDetails!.type).toBe('danger');
    });

    it('should execute and return success result', async () => {
      const result = await shellTool.execute({ 
        command: 'echo hello',
        capture_stderr: true
      });
      
      expect(result.success).toBe(true);
      expect((result.data as any).stdout).toBe('command output');
    });

    it('should handle command failures', async () => {
      const result = await shellTool.execute({ 
        command: 'fail'
      });
      
      expect(result.success).toBe(false);
      expect((result.data as any).stderr).toBe('Command failed');
    });
  });
});