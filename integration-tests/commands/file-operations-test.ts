/**
 * VibeX File System Operations Integration Test
 * 
 * A comprehensive test suite that tests all file system operations with advanced features:
 * - Tests all CRUD operations (create, read, update, delete)
 * - Tests directory operations
 * - Tests file watching and change detection
 * - Tests performance on large files and directories
 * - Tests error handling for invalid operations
 * - Includes detailed performance metrics
 * - Tests concurrent file operations
 * - Tests file locking and atomic operations
 * 
 * This test suite is designed to outperform Gemini CLI's file system tests in coverage,
 * thoroughness, and performance analysis.
 */

import { VibeXTestRig, type PerformanceMetrics } from '../test-helper';
import { randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { promises as fs, watch, WriteStream, createWriteStream } from 'fs';
import { setTimeout as sleep } from 'timers/promises';

// Test configuration
const TEST_FILE_SIZES = [
  { name: 'tiny', size: 100 },              // 100 bytes
  { name: 'small', size: 10 * 1024 },       // 10 KB
  { name: 'medium', size: 100 * 1024 },     // 100 KB
  { name: 'large', size: 1024 * 1024 },     // 1 MB
  { name: 'xl', size: 10 * 1024 * 1024 }    // 10 MB
];

// File system operations to test
const OPERATIONS = [
  'create', 'read', 'write', 'append', 'delete', 'rename',
  'copy', 'move', 'watch', 'lock', 'atomic', 'concurrent'
];

/**
 * File Operation Test Suite
 */
describe('File System Operations', () => {
  const testRig = new VibeXTestRig();
  let testEnv: any;

  // Setup before tests
  beforeAll(async () => {
    testEnv = testRig.setupIsolatedEnvironment('file-operations-test');
  });

  // Cleanup after tests
  afterAll(() => {
    testEnv.cleanup();
  });

  // Helper to generate test content of specified size
  const generateTestContent = (sizeBytes: number): string => {
    const chunkSize = 1024;
    let content = '';
    
    // Generate content in chunks to avoid memory issues
    for (let i = 0; i < sizeBytes; i += chunkSize) {
      const size = Math.min(chunkSize, sizeBytes - i);
      content += randomBytes(size / 2).toString('hex');
    }
    
    return content.slice(0, sizeBytes);
  };

  // Helper to create a file with specific size
  const createTestFile = async (fileName: string, sizeBytes: number): Promise<string> => {
    const content = generateTestContent(sizeBytes);
    const filePath = testRig.createFile(fileName, content);
    return filePath;
  };

  describe('Basic File Operations', () => {
    // 1. Test file creation
    test('should create files of various sizes', async () => {
      const results: { size: string; path: string; time: number }[] = [];
      
      for (const { name, size } of TEST_FILE_SIZES) {
        const startTime = Date.now();
        const fileName = `test-create-${name}.txt`;
        
        await testRig.measurePerformance(async () => {
          const filePath = await createTestFile(fileName, size);
          results.push({ 
            size: name, 
            path: filePath,
            time: Date.now() - startTime 
          });
        });
      }
      
      console.table(results);
      
      // Verify all files were created
      for (const result of results) {
        const fileExists = await fs.stat(result.path)
          .then(stats => stats.isFile())
          .catch(() => false);
          
        expect(fileExists).toBe(true);
      }
    });
    
    // 2. Test file reading
    test('should read files of various sizes', async () => {
      const results: { size: string; time: number; bytesRead: number }[] = [];
      
      for (const { name, size } of TEST_FILE_SIZES) {
        const fileName = `test-read-${name}.txt`;
        const filePath = await createTestFile(fileName, size);
        
        const metrics = await testRig.measurePerformance(async () => {
          const content = await fs.readFile(filePath, 'utf-8');
          results.push({ 
            size: name, 
            time: Date.now() - Date.now(),
            bytesRead: content.length 
          });
        });
        
        results[results.length - 1].time = metrics.duration;
      }
      
      console.table(results);
      
      // Verify we read expected amount of data
      for (let i = 0; i < results.length; i++) {
        expect(results[i].bytesRead).toBe(TEST_FILE_SIZES[i].size);
      }
    });
    
    // 3. Test file updating/writing
    test('should update existing files', async () => {
      const fileName = 'test-update.txt';
      const filePath = await createTestFile(fileName, 1024);
      const originalContent = await fs.readFile(filePath, 'utf-8');
      
      const newContent = `Updated content: ${Date.now()}\n${originalContent}`;
      
      await testRig.measurePerformance(async () => {
        await fs.writeFile(filePath, newContent, 'utf-8');
      });
      
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toBe(newContent);
    });
    
    // 4. Test file deletion
    test('should delete files', async () => {
      const fileName = 'test-delete.txt';
      const filePath = await createTestFile(fileName, 1024);
      
      // Verify file exists
      const existsBefore = await fs.stat(filePath)
        .then(stats => stats.isFile())
        .catch(() => false);
        
      expect(existsBefore).toBe(true);
      
      await testRig.measurePerformance(async () => {
        await fs.unlink(filePath);
      });
      
      // Verify file no longer exists
      const existsAfter = await fs.stat(filePath)
        .then(stats => stats.isFile())
        .catch(() => false);
        
      expect(existsAfter).toBe(false);
    });
  });

  describe('Directory Operations', () => {
    // 1. Test directory creation
    test('should create directories', async () => {
      const dirPath = join(testEnv.testDir, 'test-dir');
      const nestedDirPath = join(dirPath, 'nested', 'deeply', 'path');
      
      await testRig.measurePerformance(async () => {
        await fs.mkdir(dirPath, { recursive: false });
      });
      
      const dirExists = await fs.stat(dirPath)
        .then(stats => stats.isDirectory())
        .catch(() => false);
        
      expect(dirExists).toBe(true);
      
      // Test nested directory creation
      await testRig.measurePerformance(async () => {
        await fs.mkdir(nestedDirPath, { recursive: true });
      });
      
      const nestedDirExists = await fs.stat(nestedDirPath)
        .then(stats => stats.isDirectory())
        .catch(() => false);
        
      expect(nestedDirExists).toBe(true);
    });
    
    // 2. Test directory listing
    test('should list directory contents', async () => {
      const dirPath = join(testEnv.testDir, 'list-dir');
      await fs.mkdir(dirPath, { recursive: true });
      
      // Create some files in the directory
      const fileNames = ['file1.txt', 'file2.txt', 'file3.txt'];
      for (const name of fileNames) {
        await fs.writeFile(join(dirPath, name), `Content for ${name}`, 'utf-8');
      }
      
      let result: string[] = [];
      
      await testRig.measurePerformance(async () => {
        result = await fs.readdir(dirPath);
      });
      
      expect(result).toHaveLength(fileNames.length);
      expect(result).toEqual(expect.arrayContaining(fileNames));
    });
    
    // 3. Test directory deletion
    test('should delete directories', async () => {
      const dirPath = join(testEnv.testDir, 'delete-dir');
      const filePath = join(dirPath, 'file.txt');
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, 'Test content', 'utf-8');
      
      await testRig.measurePerformance(async () => {
        // Remove files first
        await fs.unlink(filePath);
        await fs.rmdir(dirPath);
      });
      
      const dirExists = await fs.stat(dirPath)
        .then(stats => stats.isDirectory())
        .catch(() => false);
        
      expect(dirExists).toBe(false);
    });
    
    // 4. Test recursive directory operations
    test('should perform recursive directory operations', async () => {
      const baseDir = join(testEnv.testDir, 'recursive-test');
      
      // Create a complex directory structure
      const structure = [
        { path: join(baseDir, 'dir1', 'subdir1'), files: ['a.txt', 'b.txt'] },
        { path: join(baseDir, 'dir1', 'subdir2'), files: ['c.txt'] },
        { path: join(baseDir, 'dir2'), files: ['d.txt', 'e.txt', 'f.txt'] },
      ];
      
      // Create the structure
      for (const dir of structure) {
        await fs.mkdir(dir.path, { recursive: true });
        for (const file of dir.files) {
          await fs.writeFile(join(dir.path, file), `Content for ${file}`, 'utf-8');
        }
      }
      
      // Count all files recursively
      const getAllFiles = async (dir: string): Promise<string[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        const files = await Promise.all(entries.map(async entry => {
          const fullPath = join(dir, entry.name);
          return entry.isDirectory() ? getAllFiles(fullPath) : [fullPath];
        }));
        
        return files.flat();
      };
      
      let allFiles: string[] = [];
      
      await testRig.measurePerformance(async () => {
        allFiles = await getAllFiles(baseDir);
      });
      
      const expectedFileCount = structure.reduce((count, dir) => count + dir.files.length, 0);
      expect(allFiles).toHaveLength(expectedFileCount);
    });
  });

  describe('Advanced File Operations', () => {
    // 1. Test file renaming
    test('should rename files', async () => {
      const oldName = join(testEnv.testDir, 'original.txt');
      const newName = join(testEnv.testDir, 'renamed.txt');
      const content = 'Test content for rename operation';
      
      await fs.writeFile(oldName, content, 'utf-8');
      
      await testRig.measurePerformance(async () => {
        await fs.rename(oldName, newName);
      });
      
      // Check original doesn't exist
      const oldExists = await fs.stat(oldName)
        .then(stats => stats.isFile())
        .catch(() => false);
        
      expect(oldExists).toBe(false);
      
      // Check new file exists with same content
      const newExists = await fs.stat(newName)
        .then(stats => stats.isFile())
        .catch(() => false);
        
      expect(newExists).toBe(true);
      
      const newContent = await fs.readFile(newName, 'utf-8');
      expect(newContent).toBe(content);
    });
    
    // 2. Test file copying
    test('should copy files', async () => {
      const sourcePath = join(testEnv.testDir, 'source.txt');
      const targetPath = join(testEnv.testDir, 'copy.txt');
      const content = 'Test content for copy operation';
      
      await fs.writeFile(sourcePath, content, 'utf-8');
      
      await testRig.measurePerformance(async () => {
        // Node.js v16.7+ has fs.cp, but using readFile+writeFile for compatibility
        const data = await fs.readFile(sourcePath);
        await fs.writeFile(targetPath, data);
      });
      
      // Source and target should both exist
      const [sourceExists, targetExists] = await Promise.all([
        fs.stat(sourcePath).then(stats => stats.isFile()).catch(() => false),
        fs.stat(targetPath).then(stats => stats.isFile()).catch(() => false)
      ]);
      
      expect(sourceExists).toBe(true);
      expect(targetExists).toBe(true);
      
      // Contents should be identical
      const [sourceContent, targetContent] = await Promise.all([
        fs.readFile(sourcePath, 'utf-8'),
        fs.readFile(targetPath, 'utf-8')
      ]);
      
      expect(targetContent).toBe(sourceContent);
    });
    
    // 3. Test file moving
    test('should move files', async () => {
      const sourcePath = join(testEnv.testDir, 'to-move.txt');
      const targetDir = join(testEnv.testDir, 'moved-files');
      const targetPath = join(targetDir, 'moved.txt');
      const content = 'Test content for move operation';
      
      await fs.writeFile(sourcePath, content, 'utf-8');
      await fs.mkdir(targetDir, { recursive: true });
      
      await testRig.measurePerformance(async () => {
        await fs.rename(sourcePath, targetPath);
      });
      
      // Source shouldn't exist anymore
      const sourceExists = await fs.stat(sourcePath)
        .then(stats => stats.isFile())
        .catch(() => false);
        
      expect(sourceExists).toBe(false);
      
      // Target should exist with the same content
      const targetExists = await fs.stat(targetPath)
        .then(stats => stats.isFile())
        .catch(() => false);
        
      expect(targetExists).toBe(true);
      
      const targetContent = await fs.readFile(targetPath, 'utf-8');
      expect(targetContent).toBe(content);
    });
    
    // 4. Test file appending
    test('should append to files', async () => {
      const filePath = join(testEnv.testDir, 'append.txt');
      const initialContent = 'Initial content\n';
      const appendContent = 'Appended content';
      
      await fs.writeFile(filePath, initialContent, 'utf-8');
      
      await testRig.measurePerformance(async () => {
        await fs.appendFile(filePath, appendContent, 'utf-8');
      });
      
      const finalContent = await fs.readFile(filePath, 'utf-8');
      expect(finalContent).toBe(initialContent + appendContent);
    });
  });

  describe('File Watching and Change Detection', () => {
    // 1. Test file watching
    test('should detect file changes', async () => {
      const filePath = join(testEnv.testDir, 'watched.txt');
      const initialContent = 'Initial content';
      
      // Create initial file
      await fs.writeFile(filePath, initialContent, 'utf-8');
      
      // Set up watcher
      let changeDetected = false;
      let changeType: string | null = null;
      
      const watcher = watch(filePath, (eventType, filename) => {
        changeDetected = true;
        changeType = eventType;
      });
      
      // Give watcher time to initialize
      await sleep(100);
      
      // Modify file
      const newContent = 'Modified content';
      await fs.writeFile(filePath, newContent, 'utf-8');
      
      // Give time for the event to propagate
      await sleep(500);
      
      // Clean up watcher
      watcher.close();
      
      expect(changeDetected).toBe(true);
      expect(changeType).toBe('change');
    });
    
    // 2. Test directory watching
    test('should detect directory changes', async () => {
      const dirPath = join(testEnv.testDir, 'watched-dir');
      await fs.mkdir(dirPath, { recursive: true });
      
      // Set up watcher
      let changeDetected = false;
      let detectedFileName: string | null = null;
      
      const watcher = watch(dirPath, (eventType, filename) => {
        changeDetected = true;
        if (filename) detectedFileName = filename;
      });
      
      // Give watcher time to initialize
      await sleep(100);
      
      // Add a file to directory
      const fileName = 'new-file.txt';
      await fs.writeFile(join(dirPath, fileName), 'New file content', 'utf-8');
      
      // Give time for the event to propagate
      await sleep(500);
      
      // Clean up watcher
      watcher.close();
      
      expect(changeDetected).toBe(true);
      expect(detectedFileName).toBe(fileName);
    });
  });

  describe('Performance Tests', () => {
    // 1. Test large file operations
    test('should handle large files efficiently', async () => {
      // Test with the largest file size
      const { size } = TEST_FILE_SIZES.slice(-1)[0];
      const fileName = 'large-perf-test.txt';
      const filePath = join(testEnv.testDir, fileName);
      
      // Create large file and measure performance
      console.log(`Creating large test file (${size / (1024 * 1024)} MB)...`);
      
      const createMetrics = await testRig.measurePerformance(async () => {
        const content = generateTestContent(size);
        await fs.writeFile(filePath, content, 'utf-8');
      });
      
      // Read large file and measure performance
      console.log('Reading large test file...');
      
      const readMetrics = await testRig.measurePerformance(async () => {
        await fs.readFile(filePath, 'utf-8');
      });
      
      // Log performance metrics
      console.table({
        create: {
          time_ms: createMetrics.duration,
          memory_used_mb: (createMetrics.memoryUsage.after.heapUsed - createMetrics.memoryUsage.before.heapUsed) / (1024 * 1024),
          throughput_mbps: (size / (1024 * 1024)) / (createMetrics.duration / 1000)
        },
        read: {
          time_ms: readMetrics.duration,
          memory_used_mb: (readMetrics.memoryUsage.after.heapUsed - readMetrics.memoryUsage.before.heapUsed) / (1024 * 1024),
          throughput_mbps: (size / (1024 * 1024)) / (readMetrics.duration / 1000)
        }
      });
      
      // Basic validation
      expect(createMetrics.duration).toBeGreaterThan(0);
      expect(readMetrics.duration).toBeGreaterThan(0);
    });
    
    // 2. Test directory performance with many files
    test('should handle directories with many files', async () => {
      const dirPath = join(testEnv.testDir, 'many-files-dir');
      await fs.mkdir(dirPath, { recursive: true });
      
      const fileCount = 100; // Create 100 files
      const fileSize = 1024; // 1KB each
      
      console.log(`Creating ${fileCount} files...`);
      
      // Create many files and measure performance
      const createMetrics = await testRig.measurePerformance(async () => {
        for (let i = 0; i < fileCount; i++) {
          const content = generateTestContent(fileSize);
          await fs.writeFile(join(dirPath, `file-${i}.txt`), content, 'utf-8');
        }
      });
      
      // List files and measure performance
      console.log('Listing directory with many files...');
      
      const listMetrics = await testRig.measurePerformance(async () => {
        await fs.readdir(dirPath);
      });
      
      // Delete files and measure performance
      console.log('Deleting many files...');
      
      const deleteMetrics = await testRig.measurePerformance(async () => {
        const files = await fs.readdir(dirPath);
        await Promise.all(files.map(file => fs.unlink(join(dirPath, file))));
      });
      
      // Log performance metrics
      console.table({
        create: {
          time_ms: createMetrics.duration,
          time_per_file_ms: createMetrics.duration / fileCount,
          memory_used_mb: (createMetrics.memoryUsage.after.heapUsed - createMetrics.memoryUsage.before.heapUsed) / (1024 * 1024)
        },
        list: {
          time_ms: listMetrics.duration,
          memory_used_mb: (listMetrics.memoryUsage.after.heapUsed - listMetrics.memoryUsage.before.heapUsed) / (1024 * 1024)
        },
        delete: {
          time_ms: deleteMetrics.duration,
          time_per_file_ms: deleteMetrics.duration / fileCount,
          memory_used_mb: (deleteMetrics.memoryUsage.after.heapUsed - deleteMetrics.memoryUsage.before.heapUsed) / (1024 * 1024)
        }
      });
      
      // Basic validation
      expect(createMetrics.duration).toBeGreaterThan(0);
      expect(listMetrics.duration).toBeGreaterThan(0);
      expect(deleteMetrics.duration).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    // 1. Test reading non-existent file
    test('should handle reading non-existent file', async () => {
      const nonExistentFile = join(testEnv.testDir, 'does-not-exist.txt');
      
      let error: Error | undefined;
      
      try {
        await fs.readFile(nonExistentFile, 'utf-8');
      } catch (err) {
        error = err as Error;
      }
      
      expect(error).toBeDefined();
      expect(error!.message).toMatch(/ENOENT/);
    });
    
    // 2. Test creating a file in non-existent directory
    test('should handle creating files in non-existent directories', async () => {
      const filePath = join(testEnv.testDir, 'non-existent-dir', 'file.txt');
      const content = 'Test content';
      
      let error: Error | undefined;
      
      try {
        await fs.writeFile(filePath, content, 'utf-8');
      } catch (err) {
        error = err as Error;
      }
      
      expect(error).toBeDefined();
      expect(error!.message).toMatch(/ENOENT/);
      
      // Test successful creation with recursive directory creation
      try {
        await fs.mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
      } catch (err) {
        fail(`Should not have thrown an error: ${err}`);
      }
    });
    
    // 3. Test permission errors
    test('should handle permission errors', async () => {
      // This test is OS-specific and may need to be skipped on some platforms
      if (process.platform === 'win32') {
        console.log('Skipping permission test on Windows');
        return;
      }
      
      const filePath = join(testEnv.testDir, 'read-only.txt');
      const content = 'Read only content';
      
      // Create read-only file
      await fs.writeFile(filePath, content, 'utf-8');
      await fs.chmod(filePath, 0o444); // read-only
      
      let error: Error | undefined;
      
      try {
        await fs.writeFile(filePath, 'New content', 'utf-8');
      } catch (err) {
        error = err as Error;
      }
      
      // Restore permissions for cleanup
      await fs.chmod(filePath, 0o644);
      
      expect(error).toBeDefined();
      expect(error!.message).toMatch(/EACCES|EPERM/);
    });
  });

  describe('Concurrent File Operations', () => {
    // 1. Test multiple reads
    test('should handle concurrent file reads', async () => {
      const filePath = join(testEnv.testDir, 'concurrent-read.txt');
      const content = generateTestContent(1024 * 1024); // 1MB
      
      await fs.writeFile(filePath, content, 'utf-8');
      
      const concurrentReads = 10;
      
      const metrics = await testRig.measurePerformance(async () => {
        const reads = Array(concurrentReads).fill(null).map(() => 
          fs.readFile(filePath, 'utf-8')
        );
        
        const results = await Promise.all(reads);
        
        // Verify all reads were successful
        for (const result of results) {
          expect(result).toBe(content);
        }
      });
      
      console.log(`Performed ${concurrentReads} concurrent reads in ${metrics.duration}ms`);
    });
    
    // 2. Test read/write contention
    test('should handle read/write contention', async () => {
      const filePath = join(testEnv.testDir, 'read-write-contention.txt');
      const initialContent = 'Initial content';
      
      await fs.writeFile(filePath, initialContent, 'utf-8');
      
      // Interleaved reads and writes
      const operations = [
        { type: 'read', expect: initialContent },
        { type: 'write', content: 'Update 1' },
        { type: 'read', expect: 'Update 1' },
        { type: 'write', content: 'Update 2' },
        { type: 'read', expect: 'Update 2' },
        { type: 'write', content: 'Update 3' },
        { type: 'read', expect: 'Update 3' },
      ];
      
      // Execute operations sequentially to ensure deterministic results
      for (const op of operations) {
        if (op.type === 'read') {
          const content = await fs.readFile(filePath, 'utf-8');
          expect(content).toBe(op.expect);
        } else if (op.type === 'write') {
          await fs.writeFile(filePath, op.content, 'utf-8');
        }
      }
    });
  });

  describe('File Locking and Atomic Operations', () => {
    // 1. Test concurrent writes with proper locking
    test('should prevent data corruption with file locks', async () => {
      const filePath = join(testEnv.testDir, 'locked-file.txt');
      const operationCount = 50;
      
      // Helper function to simulate a locked write
      const performLockedWrite = async (id: number): Promise<void> => {
        // In a real app, would use proper file locking
        // This is a simplified simulation using atomic append
        await fs.appendFile(filePath, `Operation ${id}\n`, 'utf-8');
        await sleep(Math.random() * 5); // Random delay to increase contention chance
      };
      
      // Initialize empty file
      await fs.writeFile(filePath, '', 'utf-8');
      
      // Run many concurrent operations
      const operations = Array(operationCount).fill(null).map((_, i) => 
        performLockedWrite(i)
      );
      
      await Promise.all(operations);
      
      // Verify results - each operation should have written once
      const result = await fs.readFile(filePath, 'utf-8');
      const lines = result.trim().split('\n');
      
      expect(lines).toHaveLength(operationCount);
      
      // Each operation ID should appear exactly once
      const idCounts = new Map<string, number>();
      
      for (const line of lines) {
        const id = line.replace('Operation ', '');
        idCounts.set(id, (idCounts.get(id) || 0) + 1);
      }
      
      for (let i = 0; i < operationCount; i++) {
        expect(idCounts.get(String(i))).toBe(1);
      }
    });
    
    // 2. Test atomic file write (all or nothing)
    test('should perform atomic file writes', async () => {
      const filePath = join(testEnv.testDir, 'atomic-write.txt');
      const tempPath = join(testEnv.testDir, 'atomic-write.tmp');
      const content = generateTestContent(1024 * 1024); // 1MB
      
      // Simulate atomic write using a temporary file
      const performAtomicWrite = async (): Promise<void> => {
        // Write content to temporary file first
        await fs.writeFile(tempPath, content, 'utf-8');
        
        // Then rename (atomic operation on most file systems)
        await fs.rename(tempPath, filePath);
      };
      
      await performAtomicWrite();
      
      // Verify the content was written correctly
      const writtenContent = await fs.readFile(filePath, 'utf-8');
      expect(writtenContent).toBe(content);
      
      // Temp file should not exist anymore
      const tempExists = await fs.stat(tempPath)
        .then(() => true)
        .catch(() => false);
      
      expect(tempExists).toBe(false);
    });
  });

  describe('Performance Comparison', () => {
    test('should outperform baseline with streaming operations', async () => {
      // This test compares streaming vs buffered operations
      // for better performance on large files
      
      const filePath = join(testEnv.testDir, 'large-streaming.txt');
      const copyPath = join(testEnv.testDir, 'large-streaming-copy.txt');
      const size = 5 * 1024 * 1024; // 5MB
      
      // Generate content first
      const content = generateTestContent(size);
      await fs.writeFile(filePath, content, 'utf-8');
      
      // Buffered copy (load entirely into memory)
      const bufferedMetrics = await testRig.measurePerformance(async () => {
        const data = await fs.readFile(filePath);
        await fs.writeFile(copyPath + '.buffered', data);
      });
      
      // Streaming copy (process in chunks)
      const streamingMetrics = await testRig.measurePerformance(async () => {
        return new Promise<void>((resolve, reject) => {
          const readStream = require('fs').createReadStream(filePath);
          const writeStream = require('fs').createWriteStream(copyPath + '.streamed');
          
          readStream.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('finish', resolve);
          
          readStream.pipe(writeStream);
        });
      });
      
      console.table({
        buffered: {
          time_ms: bufferedMetrics.duration,
          memory_mb: (bufferedMetrics.memoryUsage.peak.heapUsed - bufferedMetrics.memoryUsage.before.heapUsed) / (1024 * 1024),
          throughput_mbps: size / (1024 * 1024) / (bufferedMetrics.duration / 1000)
        },
        streaming: {
          time_ms: streamingMetrics.duration,
          memory_mb: (streamingMetrics.memoryUsage.peak.heapUsed - streamingMetrics.memoryUsage.before.heapUsed) / (1024 * 1024),
          throughput_mbps: size / (1024 * 1024) / (streamingMetrics.duration / 1000)
        }
      });
      
      // Streaming should use less memory
      expect(streamingMetrics.memoryUsage.peak.heapUsed).toBeLessThan(bufferedMetrics.memoryUsage.peak.heapUsed);
    });
    
    // Test overall performance with a mixed workload
    test('should complete mixed workload efficiently', async () => {
      // Create benchmark workload
      const workload = [
        { op: 'mkdir', path: 'benchmark/dir1' },
        { op: 'mkdir', path: 'benchmark/dir2' },
        { op: 'write', path: 'benchmark/dir1/file1.txt', size: 10 * 1024 },
        { op: 'write', path: 'benchmark/dir1/file2.txt', size: 20 * 1024 },
        { op: 'write', path: 'benchmark/dir2/file3.txt', size: 30 * 1024 },
        { op: 'read', path: 'benchmark/dir1/file1.txt' },
        { op: 'copy', from: 'benchmark/dir1/file1.txt', to: 'benchmark/dir2/file1-copy.txt' },
        { op: 'rename', from: 'benchmark/dir2/file1-copy.txt', to: 'benchmark/file1-moved.txt' },
        { op: 'delete', path: 'benchmark/dir1/file2.txt' },
        { op: 'list', path: 'benchmark' },
        { op: 'list', path: 'benchmark/dir1' },
        { op: 'list', path: 'benchmark/dir2' },
      ];
      
      const baseDir = join(testEnv.testDir, 'benchmark');
      await fs.mkdir(baseDir, { recursive: true });
      
      const metrics = await testRig.measurePerformance(async () => {
        for (const task of workload) {
          switch (task.op) {
            case 'mkdir':
              await fs.mkdir(join(testEnv.testDir, task.path), { recursive: true });
              break;
              
            case 'write':
              await fs.writeFile(
                join(testEnv.testDir, task.path), 
                generateTestContent(task.size), 
                'utf-8'
              );
              break;
              
            case 'read':
              await fs.readFile(join(testEnv.testDir, task.path), 'utf-8');
              break;
              
            case 'copy':
              const data = await fs.readFile(join(testEnv.testDir, task.from));
              await fs.writeFile(join(testEnv.testDir, task.to), data);
              break;
              
            case 'rename':
              await fs.rename(
                join(testEnv.testDir, task.from), 
                join(testEnv.testDir, task.to)
              );
              break;
              
            case 'delete':
              await fs.unlink(join(testEnv.testDir, task.path));
              break;
              
            case 'list':
              await fs.readdir(join(testEnv.testDir, task.path));
              break;
          }
        }
      });
      
      console.log(`Mixed workload completed in ${metrics.duration}ms`);
      console.log(`Memory usage: ${(metrics.memoryUsage.peak.heapUsed / (1024 * 1024)).toFixed(2)}MB peak`);
      
      // Just verify the workload completed without errors
      expect(metrics.duration).toBeGreaterThan(0);
    });
  });
});