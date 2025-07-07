/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile, writeFile, executeShell } from '../../compat/legacy-tools';
import { toolAPI } from '../../../domain/tool/tool-api';

// Mock the tool API
vi.mock('../../../domain/tool/tool-api', () => ({
  toolAPI: {
    executeTool: vi.fn()
  }
}));

describe('Legacy Compatibility Layer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('readFile', () => {
    it('should map parameters correctly and return success result', async () => {
      // Setup the mock
      (toolAPI.executeTool as any).mockResolvedValue({
        success: true,
        data: 'file content',
        metadata: {
          size: 12,
          path: '/path/to/file'
        }
      });
      
      const result = await readFile({
        path: '/path/to/file',
        encoding: 'utf8'
      });
      
      // Verify parameters were mapped correctly
      expect(toolAPI.executeTool).toHaveBeenCalledWith('read_file', {
        file_path: '/path/to/file',
        encoding: 'utf8'
      });
      
      // Verify result was mapped correctly
      expect(result).toEqual({
        content: 'file content',
        size: 12,
        path: '/path/to/file',
        success: true
      });
    });

    it('should handle error results', async () => {
      // Setup the mock
      (toolAPI.executeTool as any).mockResolvedValue({
        success: false,
        error: new Error('File not found')
      });
      
      const result = await readFile({
        path: '/not/found'
      });
      
      // Verify error result was mapped correctly
      expect(result).toEqual({
        content: '',
        size: 0,
        path: '/not/found',
        success: false,
        error: 'File not found'
      });
    });
  });

  describe('writeFile', () => {
    it('should map parameters correctly and return success result', async () => {
      // Setup the mock
      (toolAPI.executeTool as any).mockResolvedValue({
        success: true,
        data: {
          path: '/path/to/file',
          bytesWritten: 7,
          created: true,
          backupPath: '/path/to/file.backup'
        }
      });
      
      const result = await writeFile({
        path: '/path/to/file',
        content: 'content',
        encoding: 'utf8',
        createBackup: true
      });
      
      // Verify parameters were mapped correctly
      expect(toolAPI.executeTool).toHaveBeenCalledWith('write_file', {
        file_path: '/path/to/file',
        content: 'content',
        encoding: 'utf8',
        create_backup: true
      });
      
      // Verify result was mapped correctly
      expect(result).toEqual({
        path: '/path/to/file',
        bytesWritten: 7,
        success: true,
        created: true,
        backupPath: '/path/to/file.backup'
      });
    });

    it('should handle error results', async () => {
      // Setup the mock
      (toolAPI.executeTool as any).mockResolvedValue({
        success: false,
        error: new Error('Permission denied')
      });
      
      const result = await writeFile({
        path: '/permission/denied',
        content: 'content'
      });
      
      // Verify error result was mapped correctly
      expect(result).toEqual({
        path: '/permission/denied',
        bytesWritten: 0,
        success: false,
        created: false,
        error: 'Permission denied'
      });
    });
  });

  describe('executeShell', () => {
    it('should map parameters correctly and return success result', async () => {
      // Setup the mock
      (toolAPI.executeTool as any).mockResolvedValue({
        success: true,
        data: {
          stdout: 'command output',
          stderr: '',
          exitCode: 0,
          executionTime: 100
        }
      });
      
      const result = await executeShell({
        command: 'echo hello',
        cwd: '/working/dir',
        timeout: 5000,
        captureStderr: true
      });
      
      // Verify parameters were mapped correctly
      expect(toolAPI.executeTool).toHaveBeenCalledWith('shell', {
        command: 'echo hello',
        cwd: '/working/dir',
        timeout: 5000,
        capture_stderr: true
      });
      
      // Verify result was mapped correctly
      expect(result).toEqual({
        command: 'echo hello',
        exitCode: 0,
        stdout: 'command output',
        stderr: '',
        success: true,
        signal: null,
        executionTime: 100,
        cwd: '/working/dir'
      });
    });

    it('should handle error results', async () => {
      // Setup the mock
      (toolAPI.executeTool as any).mockResolvedValue({
        success: false,
        error: new Error('Command failed')
      });
      
      const result = await executeShell({
        command: 'fail'
      });
      
      // Verify error result was mapped correctly
      expect(result).toEqual({
        command: 'fail',
        exitCode: null,
        stdout: '',
        stderr: '',
        success: false,
        signal: null,
        executionTime: 0,
        cwd: process.cwd(),
        error: 'Command failed'
      });
    });
  });
});