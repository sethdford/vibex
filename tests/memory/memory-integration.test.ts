/**
 * Memory System Integration Tests
 * 
 * Tests the memory system's integration with other components
 */

import { describe, test, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { 
  loadMemoryFiles, 
  saveMemoryFile,
  createDefaultMemoryFile,
  watchMemoryFiles
} from '../../src/memory/index.js';

// Set up test directory
let testDir: string;

beforeAll(async () => {
  // Create a temporary test directory
  testDir = path.join(os.tmpdir(), `vibex-integration-test-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  // Clean up test directory
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error cleaning up test directory: ${error}`);
  }
});

describe('Memory System Integration', () => {
  beforeEach(async () => {
    // Create .vibex directory in the test directory
    const vibexDir = path.join(testDir, '.vibex');
    await fs.mkdir(vibexDir, { recursive: true });
  });

  afterEach(async () => {
    // Clear test directory between tests
    const entries = await fs.readdir(testDir);
    for (const entry of entries) {
      await fs.rm(path.join(testDir, entry), { recursive: true, force: true });
    }
  });

  test('file watching triggers callback when files change', async () => {
    // Create initial test files
    await fs.writeFile(path.join(testDir, 'VIBEX.md'), '# Initial Content');
    
    // Set up the mock callback function
    const onChange = jest.fn();
    
    // Start watching the files
    const watcher = await watchMemoryFiles(testDir, {
      includeVibexDir: true,
      includeRootFiles: true,
      includeMarkdownFiles: true
    }, onChange);
    
    // Give the watcher time to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Modify a file to trigger the watcher
    await fs.writeFile(path.join(testDir, 'VIBEX.md'), '# Updated Content');
    
    // Give the watcher time to detect the change and call the callback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Stop the watcher
    watcher.stop();
    
    // Verify the callback was called
    expect(onChange).toHaveBeenCalled();
    
    // Check that the callback received updated content
    const callArgs = onChange.mock.calls[0][0];
    expect(callArgs).toBeDefined();
    expect(callArgs.content).toContain('# Updated Content');
  });
  
  test('memory system loads files with CLI entry point', async () => {
    // Mock the CLI entry point behavior
    
    // Create test files
    await fs.writeFile(path.join(testDir, 'VIBEX.md'), '# Project Context\nThis is a test file.');
    await fs.writeFile(path.join(testDir, '.vibex', 'config.json'), '{"name": "Test Config"}');
    
    // Load memory files like the CLI does
    const result = await loadMemoryFiles(testDir, {
      includeVibexDir: true,
      includeRootFiles: true,
      includeJsonFiles: true,
      includeMarkdownFiles: true,
      maxDepth: 2
    });
    
    // Check that both files were loaded
    expect(result.count).toBe(2);
    expect(result.files.map(f => f.name)).toContain('VIBEX.md');
    expect(result.files.map(f => f.name)).toContain('config.json');
    
    // Check that content is properly combined
    expect(result.content).toContain('# Project Context');
    expect(result.content).toContain('"name": "Test Config"');
  });
  
  test('memory file watching recovers from errors', async () => {
    // Create a test file
    await fs.writeFile(path.join(testDir, 'VIBEX.md'), '# Test Content');
    
    // Mock functions to simulate errors
    const originalLoadMemoryFiles = await import('../../src/memory/index.js').then(m => m.loadMemoryFiles);
    const mockLoadMemoryFiles = jest.fn()
      .mockImplementationOnce(() => { throw new Error('Simulated error'); })
      .mockImplementationOnce(originalLoadMemoryFiles);
      
    jest.doMock('../../src/memory/index.js', async () => {
      const actual = await jest.importActual('../../src/memory/index.js');
      return {
        ...actual,
        loadMemoryFiles: mockLoadMemoryFiles
      };
    });
    
    // Set up a callback to track calls
    const onChange = jest.fn();
    
    // Start watching files
    const watcher = await watchMemoryFiles(testDir, {
      includeRootFiles: true,
      includeMarkdownFiles: true
    }, onChange);
    
    // Modify the file to trigger the watcher (this should cause an error)
    await fs.writeFile(path.join(testDir, 'VIBEX.md'), '# Updated Content 1');
    
    // Give time for first error to occur
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Modify the file again to trigger recovery
    await fs.writeFile(path.join(testDir, 'VIBEX.md'), '# Updated Content 2');
    
    // Give time for the recovery
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Stop watching
    watcher.stop();
    
    // The second call should have succeeded
    expect(mockLoadMemoryFiles).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});