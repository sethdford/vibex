/**
 * Unit tests for FileOperationsManager
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import path from 'path';
import fs from 'fs/promises';
import FileOperationsManager, { initFileOperations } from '../../../src/fileops/index.js';
import { SandboxPermission } from '../../../src/security/sandbox.js';
import { ErrorCategory } from '../../../src/errors/types.js';

// Mock dependencies
jest.mock('fs/promises', () => ({
  stat: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  unlink: jest.fn()
}));

jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../../src/errors/formatter.js', () => ({
  createUserError: jest.fn((message, options) => {
    const error = new Error(message);
    error.category = options?.category;
    error.resolution = options?.resolution;
    return error;
  })
}));

// Test mock for sandbox service
class MockSandboxService {
  config = { enabled: true };
  getConfig() { return this.config; }
  checkFileAccess = jest.fn();
}

// Mock config
const mockConfig = {
  maxReadSizeBytes: 1024 * 1024, // 1MB
  workspacePath: '/mock/workspace',
  permissions: { allowFileWrite: true },
  security: { permissions: { [SandboxPermission.FILE_READ]: true, [SandboxPermission.FILE_WRITE]: true } }
};

describe('FileOperationsManager', () => {
  let fileOps: FileOperationsManager;
  let mockSandbox: MockSandboxService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSandbox = new MockSandboxService();
    fileOps = new FileOperationsManager(mockConfig, mockSandbox as any);
    
    // Default successful stat mock
    (fs.stat as jest.Mock).mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 100
    });
  });
  
  describe('initialization', () => {
    test('should initialize successfully', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isDirectory: () => true
      });
      
      await fileOps.initialize();
      
      expect(fs.stat).toHaveBeenCalledWith('/mock/workspace');
    });
    
    test('should throw if workspace is not a directory', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isDirectory: () => false
      });
      
      await expect(fileOps.initialize()).rejects.toThrow('Workspace path is not a directory');
    });
    
    test('should throw if workspace does not exist', async () => {
      const fsError = new Error('ENOENT');
      (fsError as any).code = 'ENOENT';
      
      (fs.stat as jest.Mock).mockRejectedValueOnce(fsError);
      
      await expect(fileOps.initialize()).rejects.toThrow('Workspace directory does not exist');
    });
    
    test('initFileOperations should return a manager even if initialization fails', async () => {
      (fs.stat as jest.Mock).mockRejectedValueOnce(new Error('Test error'));
      
      const manager = await initFileOperations(mockConfig, mockSandbox as any);
      
      expect(manager).toBeInstanceOf(FileOperationsManager);
    });
  });
  
  describe('path operations', () => {
    test('getAbsolutePath should resolve against workspace path', () => {
      const result = fileOps.getAbsolutePath('relative/path/file.txt');
      const expected = path.resolve('/mock/workspace', 'relative/path/file.txt');
      
      expect(result).toBe(expected);
    });
    
    test('getAbsolutePath should prevent directory traversal', () => {
      const result = fileOps.getAbsolutePath('../../../etc/passwd');
      
      // Should strip leading traversal
      expect(result).not.toContain('../');
      expect(result).toContain('/mock/workspace/');
    });
    
    test('getRelativePath should return path relative to workspace', () => {
      const result = fileOps.getRelativePath('/mock/workspace/path/file.txt');
      
      expect(result).toBe('path/file.txt');
    });
  });
  
  describe('readFile', () => {
    test('should read file successfully', async () => {
      (fs.readFile as jest.Mock).mockResolvedValueOnce('file content');
      
      const result = await fileOps.readFile('test.txt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('file content');
      expect(result.path).toBe('test.txt');
      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve('/mock/workspace', 'test.txt'),
        'utf8'
      );
    });
    
    test('should respect sandbox permissions', async () => {
      mockSandbox.checkFileAccess.mockResolvedValueOnce(false);
      
      const result = await fileOps.readFile('test.txt');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Access denied by sandbox');
      expect(fs.readFile).not.toHaveBeenCalled();
    });
    
    test('should handle non-existent files', async () => {
      const fsError = new Error('ENOENT');
      (fsError as any).code = 'ENOENT';
      
      (fs.stat as jest.Mock).mockRejectedValueOnce(fsError);
      
      const result = await fileOps.readFile('missing.txt');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File not found');
      expect(result.error?.category).toBe(ErrorCategory.FILE_SYSTEM);
    });
    
    test('should handle permission errors', async () => {
      const fsError = new Error('EACCES');
      (fsError as any).code = 'EACCES';
      
      (fs.readFile as jest.Mock).mockRejectedValueOnce(fsError);
      
      const result = await fileOps.readFile('noaccess.txt');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Permission denied');
    });
    
    test('should validate file size', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isFile: () => true,
        size: 10 * 1024 * 1024 // 10MB (larger than limit)
      });
      
      const result = await fileOps.readFile('large.txt');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File too large to read');
      expect(fs.readFile).not.toHaveBeenCalled();
    });
    
    test('should validate path is a file', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true
      });
      
      const result = await fileOps.readFile('directory/');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Not a file');
      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });
  
  describe('writeFile', () => {
    test('should write file successfully', async () => {
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      mockSandbox.checkFileAccess.mockResolvedValueOnce(true);
      
      const result = await fileOps.writeFile('test.txt', 'new content');
      
      expect(result.success).toBe(true);
      expect(result.path).toBe('test.txt');
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('/mock/workspace', 'test.txt'),
        'new content',
        'utf8'
      );
    });
    
    test('should create directories if requested', async () => {
      // Mock file doesn't exist
      const fsError = new Error('ENOENT');
      (fsError as any).code = 'ENOENT';
      (fs.stat as jest.Mock).mockRejectedValueOnce(fsError);
      
      mockSandbox.checkFileAccess.mockResolvedValueOnce(true);
      
      const result = await fileOps.writeFile('new/directory/test.txt', 'content', { createDirs: true });
      
      expect(result.success).toBe(true);
      expect(result.created).toBe(true);
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.dirname(path.resolve('/mock/workspace', 'new/directory/test.txt')), 
        { recursive: true }
      );
    });
    
    test('should respect write permissions from sandbox', async () => {
      mockSandbox.checkFileAccess.mockResolvedValueOnce(false);
      
      const result = await fileOps.writeFile('test.txt', 'content');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Write access denied by sandbox');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
    
    test('should respect write permissions from config', async () => {
      // Create a new instance with write permission disabled
      const configWithoutWrite = {
        ...mockConfig,
        security: { 
          permissions: { 
            [SandboxPermission.FILE_READ]: true, 
            [SandboxPermission.FILE_WRITE]: false 
          } 
        }
      };
      
      // Disable sandbox to test config permissions
      mockSandbox.config.enabled = false;
      
      const manager = new FileOperationsManager(configWithoutWrite, mockSandbox as any);
      
      const result = await manager.writeFile('test.txt', 'content');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File write operation not allowed');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
    
    test('should handle directory not found error', async () => {
      // Mock error for stat
      const statError = new Error('ENOENT');
      (statError as any).code = 'ENOENT';
      (fs.stat as jest.Mock).mockRejectedValueOnce(statError);
      
      // Mock error for write (directory doesn't exist)
      const writeError = new Error('ENOENT');
      (writeError as any).code = 'ENOENT';
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(writeError);
      
      mockSandbox.checkFileAccess.mockResolvedValueOnce(true);
      
      const result = await fileOps.writeFile('nonexistent/dir/file.txt', 'content');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Directory does not exist');
      expect(result.error?.resolution).toContain('createDirs option');
    });
  });
  
  describe('deleteFile', () => {
    test('should delete file successfully', async () => {
      (fs.unlink as jest.Mock).mockResolvedValueOnce(undefined);
      
      const result = await fileOps.deleteFile('test.txt');
      
      expect(result.success).toBe(true);
      expect(result.path).toBe('test.txt');
      expect(fs.unlink).toHaveBeenCalledWith(path.resolve('/mock/workspace', 'test.txt'));
    });
    
    test('should verify path is a file', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true
      });
      
      const result = await fileOps.deleteFile('directory/');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Not a file');
      expect(fs.unlink).not.toHaveBeenCalled();
    });
    
    test('should handle file not found', async () => {
      const fsError = new Error('ENOENT');
      (fsError as any).code = 'ENOENT';
      
      (fs.stat as jest.Mock).mockRejectedValueOnce(fsError);
      
      const result = await fileOps.deleteFile('missing.txt');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('File not found');
    });
  });
  
  describe('fileExists', () => {
    test('should return true for existing files', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isFile: () => true
      });
      
      const exists = await fileOps.fileExists('test.txt');
      
      expect(exists).toBe(true);
      expect(fs.stat).toHaveBeenCalledWith(path.resolve('/mock/workspace', 'test.txt'));
    });
    
    test('should return false for directories', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true
      });
      
      const exists = await fileOps.fileExists('directory/');
      
      expect(exists).toBe(false);
    });
    
    test('should return false for non-existent files', async () => {
      (fs.stat as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      
      const exists = await fileOps.fileExists('missing.txt');
      
      expect(exists).toBe(false);
    });
  });
  
  describe('createDirectory', () => {
    test('should create directory successfully', async () => {
      (fs.mkdir as jest.Mock).mockResolvedValueOnce(undefined);
      
      const result = await fileOps.createDirectory('new-dir');
      
      expect(result.success).toBe(true);
      expect(result.path).toBe('new-dir');
      expect(fs.mkdir).toHaveBeenCalledWith(
        path.resolve('/mock/workspace', 'new-dir'),
        { recursive: true }
      );
    });
    
    test('should handle already existing directory', async () => {
      const fsError = new Error('EEXIST');
      (fsError as any).code = 'EEXIST';
      
      (fs.mkdir as jest.Mock).mockRejectedValueOnce(fsError);
      
      const result = await fileOps.createDirectory('existing-dir');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('already exists');
    });
  });
  
  describe('listDirectory', () => {
    test('should list directory contents successfully', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isDirectory: () => true,
        isFile: () => false
      });
      
      (fs.readdir as jest.Mock).mockResolvedValueOnce(['file1.txt', 'file2.txt', 'subdirectory']);
      
      const result = await fileOps.listDirectory('test-dir');
      
      expect(result.success).toBe(true);
      expect(result.path).toBe('test-dir');
      expect(result.files).toEqual(['file1.txt', 'file2.txt', 'subdirectory']);
    });
    
    test('should verify path is a directory', async () => {
      (fs.stat as jest.Mock).mockResolvedValueOnce({
        isDirectory: () => false,
        isFile: () => true
      });
      
      const result = await fileOps.listDirectory('file.txt');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Not a directory');
      expect(fs.readdir).not.toHaveBeenCalled();
    });
    
    test('should handle directory not found', async () => {
      const fsError = new Error('ENOENT');
      (fsError as any).code = 'ENOENT';
      
      (fs.stat as jest.Mock).mockRejectedValueOnce(fsError);
      
      const result = await fileOps.listDirectory('missing-dir');
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Directory not found');
    });
  });
  
  describe('generateDiff', () => {
    test('should generate a simple diff', () => {
      const original = 'line1\nline2\nline3\nline4';
      const modified = 'line1\nmodified\nline3\nline5';
      
      const diff = fileOps.generateDiff(original, modified);
      
      // Check the output format with the correct lines
      expect(diff).toContain('  line1');
      expect(diff).toContain('- line2');
      expect(diff).toContain('+ modified');
      expect(diff).toContain('  line3');
      expect(diff).toContain('- line4');
      expect(diff).toContain('+ line5');
    });
    
    test('should handle addition of lines', () => {
      const original = 'line1\nline2';
      const modified = 'line1\nline2\nline3\nline4';
      
      const diff = fileOps.generateDiff(original, modified);
      
      expect(diff).toContain('  line1');
      expect(diff).toContain('  line2');
      expect(diff).toContain('+ line3');
      expect(diff).toContain('+ line4');
    });
    
    test('should handle removal of lines', () => {
      const original = 'line1\nline2\nline3\nline4';
      const modified = 'line1\nline4';
      
      const diff = fileOps.generateDiff(original, modified);
      
      expect(diff).toContain('  line1');
      expect(diff).toContain('- line2');
      expect(diff).toContain('- line3');
      expect(diff).toContain('  line4');
    });
  });
  
  describe('applyPatch', () => {
    test('should apply patch by writing file content', async () => {
      // applyPatch just calls writeFile in the implementation
      (fs.writeFile as jest.Mock).mockResolvedValueOnce(undefined);
      mockSandbox.checkFileAccess.mockResolvedValueOnce(true);
      
      const result = await fileOps.applyPatch('file.txt', 'patched content');
      
      expect(result.success).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('/mock/workspace', 'file.txt'),
        'patched content',
        'utf8'
      );
    });
  });
});