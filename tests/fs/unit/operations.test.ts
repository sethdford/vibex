/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Unit tests for fs/operations.ts
 */

import { describe, test, expect, jest, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { constants, Stats } from 'fs';
import path from 'path';
import * as stream from 'stream/promises';
import * as fsOperations from '../../../src/fs/operations.js';
import { ErrorCategory } from '../../../src/errors/types.js';

// Mock dependencies
vi.mock('fs/promises', () => ({
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  appendFile: vi.fn(),
  mkdir: vi.fn(),
  readdir: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
  copyFile: vi.fn(),
  mkdtemp: vi.fn()
}));

vi.mock('fs', () => ({
  constants: {
    COPYFILE_EXCL: 1
  },
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
  openSync: vi.fn(),
  readSync: vi.fn(),
  fstatSync: vi.fn(),
  closeSync: vi.fn()
}));

vi.mock('stream/promises', () => ({
  pipeline: vi.fn()
}));

vi.mock('../../../src/errors/formatter.js', () => ({
  createUserError: vi.fn((message, options) => {
    const error = new Error(message);
    error.category = options?.category;
    error.resolution = options?.resolution;
    error.cause = options?.cause;
    return error;
  })
}));

vi.mock('../../../src/utils/validation.js', () => ({
  isValidPath: vi.fn(() => true),
  isValidFilePath: vi.fn(() => true),
  isValidDirectoryPath: vi.fn(() => true)
}));

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('File Operations', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockValidation = require('../../../src/utils/validation.js');

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockValidation.isValidPath.mockReturnValue(true);
    mockValidation.isValidFilePath.mockReturnValue(true);
    mockValidation.isValidDirectoryPath.mockReturnValue(true);
    
    const mockStatFile = {
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date()
    } as unknown as Stats;
    
    const mockStatDir = {
      isFile: () => false,
      isDirectory: () => true,
      size: 0,
      mtime: new Date()
    } as unknown as Stats;
    
    // Default stat implementation to return file or directory based on path
    mockFs.stat.mockImplementation((path: string) => {
      if (path.endsWith('.txt') || path.endsWith('file')) {
        return Promise.resolve(mockStatFile);
      } 
      if (path.endsWith('/') || path.endsWith('dir')) {
        return Promise.resolve(mockStatDir);
      }
      const error = new Error('ENOENT');
      (error as any).code = 'ENOENT';
      return Promise.reject(error);
    });

    // Mock binary detection
    const mockFsSync = require('fs');
    mockFsSync.openSync.mockReturnValue(1); // fd
    mockFsSync.fstatSync.mockReturnValue({ size: 100 });
    mockFsSync.readSync.mockImplementation((fd, buffer) => {
      // Fill buffer with printable characters by default
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = 97; // 'a'
      }
      return buffer.length;
    });
  });

  describe('fileExists', () => {
    test('should return true for existing files', async () => {
      const result = await fsOperations.fileExists('/path/to/file.txt');
      expect(result).toBe(true);
      expect(mockFs.stat).toHaveBeenCalledWith('/path/to/file.txt');
    });
    
    test('should return false for directories', async () => {
      const result = await fsOperations.fileExists('/path/to/dir/');
      expect(result).toBe(false);
    });
    
    test('should return false for non-existent paths', async () => {
      mockFs.stat.mockRejectedValueOnce(new Error('File not found'));
      const result = await fsOperations.fileExists('/path/to/nonexistent.txt');
      expect(result).toBe(false);
    });
  });

  describe('isBinaryFile', () => {
    test('should return false for text files', () => {
      // Mock already set up in beforeEach to return printable characters
      const result = fsOperations.isBinaryFile('/path/to/textfile.txt');
      expect(result).toBe(false);
    });
    
    test('should return true for files with null bytes', () => {
      const mockFsSync = require('fs');
      mockFsSync.readSync.mockImplementation((fd, buffer) => {
        buffer[5] = 0; // Add a null byte
        return buffer.length;
      });
      
      const result = fsOperations.isBinaryFile('/path/to/binary.bin');
      expect(result).toBe(true);
    });
    
    test('should return true for files with high percentage of non-printable chars', () => {
      const mockFsSync = require('fs');
      mockFsSync.readSync.mockImplementation((fd, buffer) => {
        // Fill buffer with non-printable characters
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = i % 31; // Many non-printable chars
        }
        return buffer.length;
      });
      
      const result = fsOperations.isBinaryFile('/path/to/binary.bin');
      expect(result).toBe(true);
    });
    
    test('should return false for empty files', () => {
      const mockFsSync = require('fs');
      mockFsSync.fstatSync.mockReturnValue({ size: 0 });
      
      const result = fsOperations.isBinaryFile('/path/to/empty.txt');
      expect(result).toBe(false);
    });
    
    test('should return false on errors', () => {
      const mockFsSync = require('fs');
      mockFsSync.openSync.mockImplementation(() => {
        throw new Error('Failed to open file');
      });
      
      const result = fsOperations.isBinaryFile('/path/to/error.txt');
      expect(result).toBe(false);
    });
  });

  describe('directoryExists', () => {
    test('should return true for existing directories', async () => {
      const result = await fsOperations.directoryExists('/path/to/dir/');
      expect(result).toBe(true);
      expect(mockFs.stat).toHaveBeenCalledWith('/path/to/dir/');
    });
    
    test('should return false for files', async () => {
      const result = await fsOperations.directoryExists('/path/to/file.txt');
      expect(result).toBe(false);
    });
    
    test('should return false for non-existent paths', async () => {
      mockFs.stat.mockRejectedValueOnce(new Error('Directory not found'));
      const result = await fsOperations.directoryExists('/path/to/nonexistent/');
      expect(result).toBe(false);
    });
  });

  describe('ensureDirectory', () => {
    test('should create directory if it does not exist', async () => {
      // Mock directory doesn't exist
      mockFs.stat.mockImplementationOnce(() => {
        const error = new Error('ENOENT');
        (error as any).code = 'ENOENT';
        return Promise.reject(error);
      });
      
      await fsOperations.ensureDirectory('/path/to/newdir/');
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('/path/to/newdir/', { recursive: true });
    });
    
    test('should not create directory if it already exists', async () => {
      await fsOperations.ensureDirectory('/path/to/dir/');
      
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
    
    test('should throw user error on failure', async () => {
      // Mock directory doesn't exist
      mockFs.stat.mockImplementationOnce(() => {
        const error = new Error('ENOENT');
        (error as any).code = 'ENOENT';
        return Promise.reject(error);
      });
      
      // Mock mkdir failure
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      
      await expect(fsOperations.ensureDirectory('/path/to/newdir/')).rejects.toThrow('Failed to create directory');
      expect(mockFs.mkdir).toHaveBeenCalled();
    });
  });

  describe('readTextFile', () => {
    test('should read text file successfully', async () => {
      mockFs.readFile.mockResolvedValueOnce('file content');
      
      const content = await fsOperations.readTextFile('/path/to/file.txt');
      
      expect(content).toBe('file content');
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.txt', { encoding: 'utf-8' });
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidFilePath.mockReturnValueOnce(false);
      
      await expect(fsOperations.readTextFile('/invalid/path')).rejects.toThrow('Invalid file path');
    });
    
    test('should throw if file not found', async () => {
      mockFs.stat.mockImplementationOnce(() => {
        const error = new Error('ENOENT');
        (error as any).code = 'ENOENT';
        return Promise.reject(error);
      });
      
      await expect(fsOperations.readTextFile('/path/to/missing.txt')).rejects.toThrow('File not found');
    });
    
    test('should throw if file is binary', async () => {
      // Mock isBinaryFile to return true
      vi.spyOn(fsOperations, 'isBinaryFile').mockReturnValueOnce(true);
      
      await expect(fsOperations.readTextFile('/path/to/binary.bin')).rejects.toThrow('File appears to be binary');
    });
  });

  describe('readFileLines', () => {
    test('should read specific lines from a file', async () => {
      // Mock readTextFile
      vi.spyOn(fsOperations, 'readTextFile').mockResolvedValueOnce('line1\nline2\nline3\nline4\nline5');
      
      const lines = await fsOperations.readFileLines('/path/to/file.txt', 2, 4);
      
      expect(lines).toEqual(['line2', 'line3', 'line4']);
    });
    
    test('should handle line range beyond file size', async () => {
      // Mock readTextFile
      vi.spyOn(fsOperations, 'readTextFile').mockResolvedValueOnce('line1\nline2');
      
      const lines = await fsOperations.readFileLines('/path/to/file.txt', 1, 5);
      
      expect(lines).toEqual(['line1', 'line2']);
    });
    
    test('should propagate errors from readTextFile', async () => {
      // Mock readTextFile
      vi.spyOn(fsOperations, 'readTextFile').mockRejectedValueOnce(new Error('Read error'));
      
      await expect(fsOperations.readFileLines('/path/to/file.txt', 1, 3)).rejects.toThrow('Failed to read lines');
    });
  });

  describe('writeTextFile', () => {
    test('should write text file successfully', async () => {
      await fsOperations.writeTextFile('/path/to/file.txt', 'content');
      
      expect(mockFs.writeFile).toHaveBeenCalledWith('/path/to/file.txt', 'content', { encoding: 'utf-8' });
    });
    
    test('should create directory if it does not exist', async () => {
      // Mock ensureDirectory
      vi.spyOn(fsOperations, 'ensureDirectory').mockResolvedValueOnce();
      
      await fsOperations.writeTextFile('/path/to/new/file.txt', 'content');
      
      expect(fsOperations.ensureDirectory).toHaveBeenCalledWith(path.dirname('/path/to/new/file.txt'));
    });
    
    test('should not overwrite if option is false', async () => {
      // Mock file exists
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValueOnce(true);
      
      await expect(fsOperations.writeTextFile('/path/to/file.txt', 'content', { overwrite: false }))
        .rejects.toThrow('File already exists');
      
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidFilePath.mockReturnValueOnce(false);
      
      await expect(fsOperations.writeTextFile('/invalid/path', 'content')).rejects.toThrow('Invalid file path');
    });
  });

  describe('appendTextFile', () => {
    test('should append to text file successfully', async () => {
      await fsOperations.appendTextFile('/path/to/file.txt', 'content');
      
      expect(mockFs.appendFile).toHaveBeenCalledWith('/path/to/file.txt', 'content', { encoding: 'utf-8' });
    });
    
    test('should create directory if it does not exist', async () => {
      // Mock ensureDirectory
      vi.spyOn(fsOperations, 'ensureDirectory').mockResolvedValueOnce();
      
      await fsOperations.appendTextFile('/path/to/new/file.txt', 'content');
      
      expect(fsOperations.ensureDirectory).toHaveBeenCalledWith(path.dirname('/path/to/new/file.txt'));
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidFilePath.mockReturnValueOnce(false);
      
      await expect(fsOperations.appendTextFile('/invalid/path', 'content')).rejects.toThrow('Invalid file path');
    });
  });

  describe('deleteFile', () => {
    test('should delete file successfully', async () => {
      await fsOperations.deleteFile('/path/to/file.txt');
      
      expect(mockFs.unlink).toHaveBeenCalledWith('/path/to/file.txt');
    });
    
    test('should not throw if file does not exist', async () => {
      // Mock file doesn't exist
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValueOnce(false);
      
      await fsOperations.deleteFile('/path/to/nonexistent.txt');
      
      expect(mockFs.unlink).not.toHaveBeenCalled();
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidFilePath.mockReturnValueOnce(false);
      
      await expect(fsOperations.deleteFile('/invalid/path')).rejects.toThrow('Invalid file path');
    });
  });

  describe('rename', () => {
    test('should rename file successfully', async () => {
      await fsOperations.rename('/path/to/old.txt', '/path/to/new.txt');
      
      expect(mockFs.rename).toHaveBeenCalledWith('/path/to/old.txt', '/path/to/new.txt');
    });
    
    test('should throw if source path does not exist', async () => {
      // Mock source doesn't exist
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValueOnce(false);
      vi.spyOn(fsOperations, 'directoryExists').mockResolvedValueOnce(false);
      
      await expect(fsOperations.rename('/path/to/nonexistent.txt', '/path/to/new.txt'))
        .rejects.toThrow('Path not found');
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidPath.mockReturnValueOnce(false);
      
      await expect(fsOperations.rename('/invalid/path', '/path/to/new.txt')).rejects.toThrow('Invalid path');
    });
  });

  describe('copyFile', () => {
    test('should copy file successfully', async () => {
      await fsOperations.copyFile('/path/to/source.txt', '/path/to/dest.txt');
      
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/path/to/source.txt',
        '/path/to/dest.txt',
        constants.COPYFILE_EXCL
      );
    });
    
    test('should create directory if it does not exist', async () => {
      // Mock ensureDirectory
      vi.spyOn(fsOperations, 'ensureDirectory').mockResolvedValueOnce();
      
      await fsOperations.copyFile('/path/to/source.txt', '/path/to/new/dest.txt');
      
      expect(fsOperations.ensureDirectory).toHaveBeenCalledWith(path.dirname('/path/to/new/dest.txt'));
    });
    
    test('should overwrite if option is true', async () => {
      await fsOperations.copyFile('/path/to/source.txt', '/path/to/dest.txt', { overwrite: true });
      
      expect(mockFs.copyFile).toHaveBeenCalledWith('/path/to/source.txt', '/path/to/dest.txt', 0);
    });
    
    test('should throw if source file not found', async () => {
      // Mock source doesn't exist
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValueOnce(false);
      
      await expect(fsOperations.copyFile('/path/to/nonexistent.txt', '/path/to/dest.txt'))
        .rejects.toThrow('Source file not found');
    });
    
    test('should throw if destination exists and overwrite is false', async () => {
      // Mock copyFile EEXIST error
      mockFs.copyFile.mockImplementationOnce(() => {
        const error = new Error('EEXIST');
        (error as any).code = 'EEXIST';
        return Promise.reject(error);
      });
      
      await expect(fsOperations.copyFile('/path/to/source.txt', '/path/to/existing.txt'))
        .rejects.toThrow('Destination file already exists');
    });
  });

  describe('listDirectory', () => {
    test('should list directory contents successfully', async () => {
      mockFs.readdir.mockResolvedValueOnce(['file1.txt', 'file2.txt', 'subdir']);
      
      const contents = await fsOperations.listDirectory('/path/to/dir/');
      
      expect(contents).toEqual(['file1.txt', 'file2.txt', 'subdir']);
      expect(mockFs.readdir).toHaveBeenCalledWith('/path/to/dir/');
    });
    
    test('should throw if directory not found', async () => {
      // Mock directory doesn't exist
      vi.spyOn(fsOperations, 'directoryExists').mockResolvedValueOnce(false);
      
      await expect(fsOperations.listDirectory('/path/to/nonexistent/')).rejects.toThrow('Directory not found');
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidDirectoryPath.mockReturnValueOnce(false);
      
      await expect(fsOperations.listDirectory('/invalid/path')).rejects.toThrow('Invalid directory path');
    });
  });

  describe('getFileInfo', () => {
    test('should get file information successfully', async () => {
      const mockStats = {
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      } as unknown as Stats;
      
      mockFs.stat.mockResolvedValueOnce(mockStats);
      
      const info = await fsOperations.getFileInfo('/path/to/file.txt');
      
      expect(info).toBe(mockStats);
      expect(mockFs.stat).toHaveBeenCalledWith('/path/to/file.txt');
    });
    
    test('should throw if path not found', async () => {
      // Mock ENOENT error
      mockFs.stat.mockImplementationOnce(() => {
        const error = new Error('ENOENT');
        (error as any).code = 'ENOENT';
        return Promise.reject(error);
      });
      
      await expect(fsOperations.getFileInfo('/path/to/nonexistent.txt')).rejects.toThrow('Path not found');
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidPath.mockReturnValueOnce(false);
      
      await expect(fsOperations.getFileInfo('/invalid/path')).rejects.toThrow('Invalid path');
    });
  });

  describe('findFiles', () => {
    test('should find files matching a pattern', async () => {
      // Setup mock implementation for directoryExists and readdir
      vi.spyOn(fsOperations, 'directoryExists').mockResolvedValue(true);
      
      // Need a more complex mock for readdir to simulate directory traversal
      let callCount = 0;
      mockFs.readdir.mockImplementation((dirPath, options) => {
        callCount++;
        
        if (dirPath === '/path/to/dir') {
          return Promise.resolve([
            { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
            { name: 'file2.js', isDirectory: () => false, isFile: () => true },
            { name: 'subdir', isDirectory: () => true, isFile: () => false }
          ]);
        } else if (dirPath === '/path/to/dir/subdir') {
          return Promise.resolve([
            { name: 'file3.txt', isDirectory: () => false, isFile: () => true },
            { name: 'file4.js', isDirectory: () => false, isFile: () => true }
          ]);
        }
        
        return Promise.resolve([]);
      });
      
      // Find .txt files
      const pattern = /\.txt$/;
      const files = await fsOperations.findFiles('/path/to/dir', { pattern, recursive: true });
      
      expect(files).toContain(path.join('/path/to/dir', 'file1.txt'));
      expect(files).toContain(path.join('/path/to/dir/subdir', 'file3.txt'));
      expect(files).not.toContain(path.join('/path/to/dir', 'file2.js'));
      expect(files).not.toContain(path.join('/path/to/dir/subdir', 'file4.js'));
    });
    
    test('should include directories if specified', async () => {
      // Setup mock implementation
      vi.spyOn(fsOperations, 'directoryExists').mockResolvedValue(true);
      
      mockFs.readdir.mockImplementation((dirPath, options) => {
        return Promise.resolve([
          { name: 'file.txt', isDirectory: () => false, isFile: () => true },
          { name: 'subdir', isDirectory: () => true, isFile: () => false }
        ]);
      });
      
      // Find everything, including directories
      const files = await fsOperations.findFiles('/path/to/dir', { includeDirectories: true });
      
      expect(files).toContain(path.join('/path/to/dir', 'file.txt'));
      expect(files).toContain(path.join('/path/to/dir', 'subdir'));
    });
    
    test('should not traverse recursively if recursive is false', async () => {
      // Setup mock implementation
      vi.spyOn(fsOperations, 'directoryExists').mockResolvedValue(true);
      
      mockFs.readdir.mockImplementation((dirPath, options) => {
        if (dirPath === '/path/to/dir') {
          return Promise.resolve([
            { name: 'file.txt', isDirectory: () => false, isFile: () => true },
            { name: 'subdir', isDirectory: () => true, isFile: () => false }
          ]);
        }
        // This should not be called if recursive is false
        throw new Error('Should not traverse recursively');
      });
      
      // Non-recursive search
      const files = await fsOperations.findFiles('/path/to/dir', { recursive: false });
      
      expect(files).toEqual([path.join('/path/to/dir', 'file.txt')]);
      expect(mockFs.readdir).toHaveBeenCalledTimes(1);
    });
    
    test('should throw if directory not found', async () => {
      // Mock directory doesn't exist
      vi.spyOn(fsOperations, 'directoryExists').mockResolvedValueOnce(false);
      
      await expect(fsOperations.findFiles('/path/to/nonexistent/')).rejects.toThrow('Directory not found');
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidDirectoryPath.mockReturnValueOnce(false);
      
      await expect(fsOperations.findFiles('/invalid/path')).rejects.toThrow('Invalid directory path');
    });
  });

  describe('streamFile', () => {
    test('should stream file successfully', async () => {
      // Mock dependencies
      const mockCreateReadStream = vi.fn();
      const mockCreateWriteStream = vi.fn();
      
      require('fs').createReadStream.mockReturnValue(mockCreateReadStream);
      require('fs').createWriteStream.mockReturnValue(mockCreateWriteStream);
      (stream.pipeline as jest.Mock).mockResolvedValueOnce(undefined);
      
      await fsOperations.streamFile('/path/to/source.txt', '/path/to/dest.txt', { overwrite: true });
      
      expect(require('fs').createReadStream).toHaveBeenCalledWith('/path/to/source.txt');
      expect(require('fs').createWriteStream).toHaveBeenCalledWith('/path/to/dest.txt');
      expect(stream.pipeline).toHaveBeenCalledWith(mockCreateReadStream, mockCreateWriteStream);
    });
    
    test('should create directory if it does not exist', async () => {
      // Mock ensureDirectory
      vi.spyOn(fsOperations, 'ensureDirectory').mockResolvedValueOnce();
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValue(true);
      (stream.pipeline as jest.Mock).mockResolvedValueOnce(undefined);
      
      await fsOperations.streamFile('/path/to/source.txt', '/path/to/new/dest.txt');
      
      expect(fsOperations.ensureDirectory).toHaveBeenCalledWith(path.dirname('/path/to/new/dest.txt'));
    });
    
    test('should throw if source file not found', async () => {
      // Mock source doesn't exist
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValueOnce(false);
      
      await expect(fsOperations.streamFile('/path/to/nonexistent.txt', '/path/to/dest.txt'))
        .rejects.toThrow('Source file not found');
    });
    
    test('should throw if destination exists and overwrite is false', async () => {
      // Mock source exists
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValueOnce(true);
      // Mock destination exists
      vi.spyOn(fsOperations, 'fileExists').mockResolvedValueOnce(true);
      
      await expect(fsOperations.streamFile('/path/to/source.txt', '/path/to/existing.txt', { overwrite: false }))
        .rejects.toThrow('Destination file already exists');
    });
    
    test('should throw if path is invalid', async () => {
      mockValidation.isValidFilePath.mockReturnValueOnce(false);
      
      await expect(fsOperations.streamFile('/invalid/path', '/path/to/dest.txt')).rejects.toThrow('Invalid file path');
    });
  });

  describe('createTempFile', () => {
    test('should create temporary file successfully', async () => {
      mockFs.mkdtemp.mockResolvedValueOnce('/tmp/tmp-12345');
      
      const tempFilePath = await fsOperations.createTempFile({ prefix: 'test-', suffix: '.txt' });
      
      expect(tempFilePath).toContain('/tmp/tmp-12345/test-');
      expect(tempFilePath).toContain('.txt');
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
    
    test('should write content to temporary file if provided', async () => {
      mockFs.mkdtemp.mockResolvedValueOnce('/tmp/tmp-12345');
      
      await fsOperations.createTempFile({ content: 'test content' });
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(expect.any(String), 'test content');
    });
    
    test('should throw on error', async () => {
      mockFs.mkdtemp.mockRejectedValueOnce(new Error('Failed to create temp directory'));
      
      await expect(fsOperations.createTempFile()).rejects.toThrow('Failed to create temporary file');
    });
  });
});