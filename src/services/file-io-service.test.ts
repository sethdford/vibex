/**
 * File I/O Service Tests
 * 
 * Comprehensive test suite for the file I/O service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join, dirname } from 'path';
import { FileIOService, createFileIOService } from './file-io-service.js';

// Mock fs/promises module
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
  copyFile: vi.fn(),
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    copyFile: vi.fn()
  }
}));

// Import the mocked module after mocking
import * as fs from 'fs/promises';

// Get mocked functions
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockAccess = vi.fn();
const mockStat = vi.fn();
const mockUnlink = vi.fn();
const mockRename = vi.fn();
const mockCopyFile = vi.fn();

// Override the mocked functions with our direct mocks
// This is more reliable than using vi.mocked() in some cases
vi.stubGlobal('readFile', mockReadFile);
vi.stubGlobal('writeFile', mockWriteFile);
vi.stubGlobal('mkdir', mockMkdir);
vi.stubGlobal('access', mockAccess);
vi.stubGlobal('stat', mockStat);
vi.stubGlobal('unlink', mockUnlink);
vi.stubGlobal('rename', mockRename);
vi.stubGlobal('copyFile', mockCopyFile);

// Helper function to properly set up the mocks for each test
function setupMocks() {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Reset the default behavior for mocks - use mockImplementation instead of mockResolvedValue/mockRejectedValue
  mockAccess.mockImplementation(() => Promise.reject(new Error('ENOENT')));
  mockReadFile.mockImplementation(() => Promise.reject(new Error('ENOENT')));
  mockStat.mockImplementation(() => Promise.reject(new Error('ENOENT')));
  mockWriteFile.mockImplementation(() => Promise.resolve(undefined));
  mockMkdir.mockImplementation(() => Promise.resolve(undefined));
  mockUnlink.mockImplementation(() => Promise.resolve(undefined));
  mockRename.mockImplementation(() => Promise.resolve(undefined));
  mockCopyFile.mockImplementation(() => Promise.resolve(undefined));
}

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('FileIOService', () => {
  let service: FileIOService;

  // Create a spy on the fileExists method for easier mocking
  // We need this approach because mocking fs/promises.access doesn't seem to affect fileExists correctly
  let fileExistsSpy: any;

  beforeEach(() => {
    // Reset and setup mock behaviors
    setupMocks();
    
    // Create service instance with test configuration
    service = createFileIOService({
      fileSizeLimit: 1024 * 1024, // 1MB
      defaultEncoding: 'utf-8',
      createDirectories: true
    });

    // Setup spy on the fileExists method to mock it directly
    fileExistsSpy = vi.spyOn(service, 'fileExists');
  });

  afterEach(() => {
    vi.resetAllMocks();
    if (fileExistsSpy) {
      fileExistsSpy.mockRestore();
    }
  });

  describe('readFile', () => {
    it('should read text file successfully', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/file.txt';
      
      // Mock fileExists to return success
      fileExistsSpy.mockResolvedValueOnce({
        success: true,
        data: true
      });
      
      // Setup file stats with correct size
      mockStat.mockResolvedValueOnce({ size: testContent.length });
      
      // Setup file read with correct content
      mockReadFile.mockResolvedValueOnce(testContent);

      // Execute the method under test
      const result = await service.readFile(testPath);
      console.log('TEST RESULT:', JSON.stringify(result));

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data?.content).toBe(testContent);
      expect(result.data?.encoding).toBe('utf-8');
      expect(result.data?.binary).toBe(false);
    });

    it('should read binary file as base64', async () => {
      const testPath = '/test/image.png';
      const buffer = Buffer.from('binary data');
      
      // Setup access check to pass for this path (file exists check)
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file stats with correct size
      mockStat.mockImplementation(path => {
        if (path === testPath) return Promise.resolve({ size: buffer.length });
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file read to return a buffer for binary files
      mockReadFile.mockImplementation((path, options) => {
        if (path === testPath) return Promise.resolve(buffer);
        return Promise.reject(new Error('ENOENT'));
      });

      // Execute the method under test
      const result = await service.readFile(testPath);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data?.binary).toBe(true);
      expect(result.data?.encoding).toBe('base64');
      expect(result.data?.content).toBe(buffer.toString('base64'));
    });

    it('should handle file not found', async () => {
      const testPath = '/test/nonexistent.txt';
      
      mockAccess.mockRejectedValue(new Error('ENOENT'));
      // Need to make fileExists return false
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      const result = await service.readFile(testPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should handle file size limit exceeded', async () => {
      const testPath = '/test/large.txt';
      const largeSize = 2 * 1024 * 1024; // 2MB (larger than the 1MB limit)
      
      // Setup access check to pass for this path (file exists check)
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file stats to return a size larger than the limit
      mockStat.mockImplementation(path => {
        if (path === testPath) return Promise.resolve({ size: largeSize });
        return Promise.reject(new Error('ENOENT'));
      });

      // Execute the method under test
      const result = await service.readFile(testPath);

      // Verify results
      expect(result.success).toBe(false);
      expect(result.error).toContain('File size exceeds limit');
    });

    it('should handle read errors', async () => {
      const testPath = '/test/error.txt';
      
      // Setup access check to pass (file exists)
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file stats to return a valid size
      mockStat.mockImplementation(path => {
        if (path === testPath) return Promise.resolve({ size: 100 });
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file read to fail with permission error
      mockReadFile.mockImplementation((path, options) => {
        if (path === testPath) return Promise.reject(new Error('Permission denied'));
        return Promise.reject(new Error('ENOENT'));
      });

      // Execute the method under test
      const result = await service.readFile(testPath);

      // Verify results
      expect(result.success).toBe(false);
      expect(result.error).toContain('Read failed');
    });
  });

  describe('writeFile', () => {
    it('should write file successfully', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/output.txt';
      
      // Set up directory creation success
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      // Set up successful file write
      mockWriteFile.mockImplementation((path, content, options) => Promise.resolve(undefined));
      
      // Set up stats for the newly written file
      mockStat.mockImplementation(path => {
        if (path === testPath) {
          return Promise.resolve({
            size: testContent.length,
            mtime: new Date(),
            birthtime: new Date()
          });
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Make file exists check succeed for getFileStats call
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });

      // Execute the method under test
      const result = await service.writeFile(testPath, testContent);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(testContent.length);
      expect(mockMkdir).toHaveBeenCalledWith(dirname(testPath), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(testPath, testContent, { encoding: 'utf-8' });
    });

    it('should handle write errors', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/error.txt';
      
      // Mock directory creation success
      mockMkdir.mockResolvedValue(undefined);
      // But make write fail with disk full error
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const result = await service.writeFile(testPath, testContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Write failed');
    });

    it('should use custom encoding', async () => {
      const testContent = 'Hello, World!';
      const testPath = '/test/output.txt';
      const encoding = 'latin1';
      
      // Set up directory creation success
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      // Set up successful file write
      mockWriteFile.mockImplementation((path, content, options) => Promise.resolve(undefined));
      
      // Set up stats for the newly written file
      mockStat.mockImplementation(path => {
        if (path === testPath) {
          return Promise.resolve({
            size: testContent.length,
            mtime: new Date(),
            birthtime: new Date()
          });
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Make file exists check succeed for getFileStats call
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });

      // Execute the method under test
      await service.writeFile(testPath, testContent, encoding);

      // Verify results
      expect(mockWriteFile).toHaveBeenCalledWith(testPath, testContent, { encoding });
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const testPath = '/test/delete.txt';
      
      // Set up successful file deletion
      mockUnlink.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });

      // Execute the method under test
      const result = await service.deleteFile(testPath);

      // Verify results
      expect(result.success).toBe(true);
      expect(mockUnlink).toHaveBeenCalledWith(testPath);
    });

    it('should handle delete errors', async () => {
      const testPath = '/test/error.txt';
      
      // Set up file deletion to fail with permission error
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      const result = await service.deleteFile(testPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Delete failed');
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      const sourcePath = '/test/source.txt';
      const targetPath = '/test/target.txt';
      
      // Setup mocks for this test
      setupMocks();
      
      // Setup directory creation for target
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      // Setup successful file rename
      mockRename.mockImplementation((source, target) => {
        if (source === sourcePath && target === targetPath) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file stats after move
      mockStat.mockImplementation(path => {
        if (path === targetPath) {
          return Promise.resolve({
            size: 100,
            mtime: new Date(),
            birthtime: new Date()
          });
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Make file access check succeed for getFileStats
      mockAccess.mockImplementation(path => {
        if (path === targetPath) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.moveFile(sourcePath, targetPath);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(100);
      expect(mockRename).toHaveBeenCalledWith(sourcePath, targetPath);
    });

    it('should handle move errors', async () => {
      const sourcePath = '/test/source.txt';
      const targetPath = '/test/target.txt';
      
      // Setup mocks for this test
      setupMocks();
      
      // Setup directory creation success
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      // Setup file rename to fail
      mockRename.mockImplementation((source, target) => {
        return Promise.reject(new Error('File not found'));
      });

      const result = await service.moveFile(sourcePath, targetPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Move failed');
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      const sourcePath = '/test/source.txt';
      const targetPath = '/test/target.txt';
      
      // Setup mocks for this test
      setupMocks();
      
      // Setup directory creation
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      // Setup successful file copy
      mockCopyFile.mockImplementation((source, target) => {
        if (source === sourcePath && target === targetPath) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file stats after copy
      mockStat.mockImplementation(path => {
        if (path === targetPath) {
          return Promise.resolve({
            size: 100,
            mtime: new Date(),
            birthtime: new Date()
          });
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Make file access check succeed for getFileStats
      mockAccess.mockImplementation(path => {
        if (path === targetPath) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.copyFile(sourcePath, targetPath);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(100);
      expect(mockCopyFile).toHaveBeenCalledWith(sourcePath, targetPath);
    });

    it('should handle copy errors', async () => {
      const sourcePath = '/test/source.txt';
      const targetPath = '/test/target.txt';
      
      // Setup mocks for this test
      setupMocks();
      
      // Setup directory creation success
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      // Setup file copy to fail
      mockCopyFile.mockImplementation((source, target) => {
        return Promise.reject(new Error('File not found'));
      });

      const result = await service.copyFile(sourcePath, targetPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Copy failed');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const testPath = '/test/exists.txt';
      
      // Reset mocks to ensure clean state
      vi.resetAllMocks();
      // Mock access check to succeed for this test
      mockAccess.mockImplementation((path) => {
        if (path === testPath) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.fileExists(testPath);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false for non-existing file', async () => {
      const testPath = '/test/nonexistent.txt';
      
      // Reset mocks to ensure clean state
      vi.resetAllMocks();
      // Mock access check to fail for this test
      mockAccess.mockImplementation((path) => {
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.fileExists(testPath);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('should return file statistics', async () => {
      const testPath = '/test/stats.txt';
      const mockStats = {
        size: 1024,
        mtime: new Date('2023-01-01'),
        birthtime: new Date('2023-01-01')
      };
      
      // Setup mocks for this test
      setupMocks();
      
      // Setup stat to succeed with mock stats
      mockStat.mockImplementation(path => {
        if (path === testPath) {
          return Promise.resolve(mockStats);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.getFileStats(testPath);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(1024);
      expect(result.data?.modified).toEqual(mockStats.mtime);
      expect(result.data?.created).toEqual(mockStats.birthtime);
    });

    it('should handle stat errors', async () => {
      const testPath = '/test/error.txt';
      
      // Setup mocks for this test
      setupMocks();
      
      // Setup stat to fail
      mockStat.mockImplementation(path => {
        return Promise.reject(new Error('File not found'));
      });

      const result = await service.getFileStats(testPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get file stats');
    });
  });

  describe('readFileLines', () => {
    it('should read file as lines', async () => {
      const testContent = 'line1\nline2\nline3';
      const testPath = '/test/lines.txt';
      
      // Setup mocks for this test
      setupMocks();
      
      // Mock the readFile method indirectly by mocking its dependencies
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      
      mockStat.mockImplementation(path => {
        if (path === testPath) return Promise.resolve({ size: testContent.length });
        return Promise.reject(new Error('ENOENT'));
      });
      
      mockReadFile.mockImplementation((path, options) => {
        if (path === testPath) return Promise.resolve(testContent);
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.readFileLines(testPath);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle binary files', async () => {
      const testPath = '/test/binary.png';
      const buffer = Buffer.from('binary data');
      
      // Setup mocks for this test
      setupMocks();
      
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      
      mockStat.mockImplementation(path => {
        if (path === testPath) return Promise.resolve({ size: buffer.length });
        return Promise.reject(new Error('ENOENT'));
      });
      
      mockReadFile.mockImplementation((path, options) => {
        if (path === testPath) return Promise.resolve(buffer);
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.readFileLines(testPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot read binary file as lines');
    });
  });

  describe('writeFileLines', () => {
    it('should write lines to file', async () => {
      const lines = ['line1', 'line2', 'line3'];
      const testPath = '/test/lines.txt';
      const expectedContent = 'line1\nline2\nline3';
      
      // Setup mocks for this test
      setupMocks();
      
      // Setup directory creation
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      // Setup successful file write
      mockWriteFile.mockImplementation((path, content, options) => {
        if (path === testPath && content === expectedContent) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file stats after write
      mockStat.mockImplementation(path => {
        if (path === testPath) {
          return Promise.resolve({
            size: expectedContent.length,
            mtime: new Date(),
            birthtime: new Date()
          });
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Make file access check succeed for getFileStats
      mockAccess.mockImplementation(path => {
        if (path === testPath) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.writeFileLines(testPath, lines);

      expect(result.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(testPath, expectedContent, { encoding: 'utf-8' });
    });
  });

  describe('appendToFile', () => {
    it('should append to existing file', async () => {
      const testPath = '/test/append.txt';
      const existingContent = 'existing';
      const newContent = '\nnew content';
      
      // Setup mocks for this test
      setupMocks();
      
      // Mock fileExists - file exists
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.resolve(undefined);
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Mock readFile to return existing content
      mockStat.mockImplementation(path => {
        if (path === testPath) {
          if (mockReadFile.mock.calls.length === 0) {
            // First stat call for readFile
            return Promise.resolve({ size: existingContent.length });
          } else {
            // Second stat call for getFileStats after writeFile
            return Promise.resolve({
              size: (existingContent + newContent).length,
              mtime: new Date(),
              birthtime: new Date()
            });
          }
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      mockReadFile.mockImplementation((path, options) => {
        if (path === testPath) return Promise.resolve(existingContent);
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Mock writeFile for the combined content
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      mockWriteFile.mockImplementation((path, content, options) => {
        if (path === testPath && content === existingContent + newContent) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.appendToFile(testPath, newContent);

      expect(result.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(
        testPath, 
        existingContent + newContent, 
        { encoding: 'utf-8' }
      );
    });

    it('should create new file if not exists', async () => {
      const testPath = '/test/new.txt';
      const content = 'new content';
      
      // Setup mocks for this test
      setupMocks();
      
      // Mock fileExists - file does not exist
      mockAccess.mockImplementation(path => {
        if (path === testPath) return Promise.reject(new Error('ENOENT'));
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Mock writeFile
      mockMkdir.mockImplementation(path => Promise.resolve(undefined));
      
      mockWriteFile.mockImplementation((path, fileContent, options) => {
        if (path === testPath && fileContent === content) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });
      
      // Setup file stats for getFileStats after write
      mockStat.mockImplementation(path => {
        if (path === testPath) {
          return Promise.resolve({
            size: content.length,
            mtime: new Date(),
            birthtime: new Date()
          });
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const result = await service.appendToFile(testPath, content);

      expect(result.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalledWith(testPath, content, { encoding: 'utf-8' });
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customService = createFileIOService({
        fileSizeLimit: 2048,
        defaultEncoding: 'latin1',
        createDirectories: false
      });

      expect(customService.getFileSizeLimit()).toBe(2048);
    });

    it('should update configuration', () => {
      service.updateConfig({ fileSizeLimit: 2048 });
      expect(service.getFileSizeLimit()).toBe(2048);
    });
  });

  describe('binary file detection', () => {
    it('should detect binary extensions', async () => {
      const binaryFiles = [
        '/test/image.png',
        '/test/video.mp4',
        '/test/archive.zip',
        '/test/executable.exe'
      ];

      for (const filePath of binaryFiles) {
        // Setup mocks for each iteration
        setupMocks();
        
        // Setup file exists check
        mockAccess.mockImplementation(path => {
          if (path === filePath) return Promise.resolve(undefined);
          return Promise.reject(new Error('ENOENT'));
        });
        
        // Setup file stats
        mockStat.mockImplementation(path => {
          if (path === filePath) return Promise.resolve({ size: 100 });
          return Promise.reject(new Error('ENOENT'));
        });
        
        // Setup file read as binary buffer
        const buffer = Buffer.from('binary');
        mockReadFile.mockImplementation((path, options) => {
          if (path === filePath) return Promise.resolve(buffer);
          return Promise.reject(new Error('ENOENT'));
        });

        const result = await service.readFile(filePath);
        
        expect(result.success).toBe(true);
        expect(result.data?.binary).toBe(true);
        expect(result.data?.encoding).toBe('base64');
      }
    });

    it('should detect text extensions', async () => {
      const textFiles = [
        '/test/code.js',
        '/test/style.css',
        '/test/document.txt',
        '/test/config.json'
      ];

      for (const filePath of textFiles) {
        // Setup mocks for each iteration
        setupMocks();
        
        // Setup file exists check
        mockAccess.mockImplementation(path => {
          if (path === filePath) return Promise.resolve(undefined);
          return Promise.reject(new Error('ENOENT'));
        });
        
        // Setup file stats
        mockStat.mockImplementation(path => {
          if (path === filePath) return Promise.resolve({ size: 100 });
          return Promise.reject(new Error('ENOENT'));
        });
        
        // Setup file read as text content
        const content = 'text content';
        mockReadFile.mockImplementation((path, options) => {
          if (path === filePath) return Promise.resolve(content);
          return Promise.reject(new Error('ENOENT'));
        });

        const result = await service.readFile(filePath);
        
        expect(result.success).toBe(true);
        expect(result.data?.binary).toBe(false);
        expect(result.data?.encoding).toBe('utf-8');
      }
    });
  });

  describe('timing', () => {
    it('should include timing information', async () => {
      const testPath = '/test/timing.txt';
      
      mockAccess.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ size: 100 } as any);
      mockReadFile.mockResolvedValue('content' as any);

      const result = await service.readFile(testPath);

      expect(result.timing).toBeDefined();
      expect(typeof result.timing?.startTime).toBe('number');
      expect(typeof result.timing?.duration).toBe('number');
      expect(result.timing?.duration).toBeGreaterThanOrEqual(0);
    });
  });
});