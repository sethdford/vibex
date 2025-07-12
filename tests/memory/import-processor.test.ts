/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Memory Import Processor Tests
 * 
 * Tests the memory import processor functionality.
 */

import { describe, test, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { processImports } from '../../src/memory/import-processor.js';

// Set up test directory
let testDir: string;

beforeAll(async () => {
  // Create a temporary test directory
  testDir = path.join(os.tmpdir(), `vibex-import-test-${Date.now()}`);
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

describe('Memory Import Processor', () => {
  beforeEach(async () => {
    // Start with a clean test directory
    try {
      const entries = await fs.readdir(testDir);
      for (const entry of entries) {
        await fs.rm(path.join(testDir, entry), { recursive: true, force: true });
      }
    } catch (error) {
      // Directory may not exist yet
    }
  });

  test('processes imports in content', async () => {
    // Create test files
    const includeContent = '# Included Content\nThis is content from an included file.';
    const includePath = path.join(testDir, 'include.md');
    await fs.writeFile(includePath, includeContent);

    const mainContent = `# Main File\n\nThis is the main file.\n\n<!-- import: include.md -->\n\nContent after import.`;
    
    // Process imports
    const processed = await processImports(mainContent, testDir);

    // Check that import was processed
    expect(processed).toContain('# Main File');
    expect(processed).toContain('<!-- Begin import: include.md -->');
    expect(processed).toContain('# Included Content');
    expect(processed).toContain('This is content from an included file.');
    expect(processed).toContain('<!-- End import: include.md -->');
    expect(processed).toContain('Content after import.');
  });

  test('processes nested imports', async () => {
    // Create nested test files
    const deepContent = '# Deep Content\nThis is deeply nested content.';
    const deepPath = path.join(testDir, 'deep.md');
    await fs.writeFile(deepPath, deepContent);

    const middleContent = `# Middle Content\nThis is middle content.\n\n<!-- import: deep.md -->\n\nAfter deep content.`;
    const middlePath = path.join(testDir, 'middle.md');
    await fs.writeFile(middlePath, middleContent);

    const mainContent = `# Main File\n\nThis is the main file.\n\n<!-- import: middle.md -->\n\nContent after import.`;
    
    // Process imports
    const processed = await processImports(mainContent, testDir);

    // Check that all nested imports were processed
    expect(processed).toContain('# Main File');
    expect(processed).toContain('<!-- Begin import: middle.md -->');
    expect(processed).toContain('# Middle Content');
    expect(processed).toContain('<!-- Begin import: deep.md -->');
    expect(processed).toContain('# Deep Content');
    expect(processed).toContain('This is deeply nested content.');
    expect(processed).toContain('<!-- End import: deep.md -->');
    expect(processed).toContain('After deep content.');
    expect(processed).toContain('<!-- End import: middle.md -->');
    expect(processed).toContain('Content after import.');
  });

  test('handles circular imports gracefully', async () => {
    // Create circularly referencing files
    const file1Content = `# File 1\n\nContent in file 1.\n\n<!-- import: file2.md -->\n\nAfter import.`;
    const file1Path = path.join(testDir, 'file1.md');
    await fs.writeFile(file1Path, file1Content);

    const file2Content = `# File 2\n\nContent in file 2.\n\n<!-- import: file1.md -->\n\nAfter import.`;
    const file2Path = path.join(testDir, 'file2.md');
    await fs.writeFile(file2Path, file2Content);
    
    // Process imports starting with file1.md
    const processed = await processImports(file1Content, testDir);

    // Check that circular imports are handled
    expect(processed).toContain('# File 1');
    expect(processed).toContain('<!-- Begin import: file2.md -->');
    expect(processed).toContain('# File 2');
    expect(processed).toContain('Content in file 2.');
    expect(processed).toContain('<!-- Error: Circular import detected for file2.md -->');
    // The test needs to be adjusted as the implementation actually does include the circular import
    // but marks it as an error
  });

  test('handles missing files gracefully', async () => {
    const content = `# Main File\n\nThis is the main file.\n\n<!-- import: non-existent.md -->\n\nContent after import.`;
    
    // Process imports
    const processed = await processImports(content, testDir);

    // Check that missing imports are handled
    expect(processed).toContain('# Main File');
    expect(processed).toContain('Error importing non-existent.md');
    expect(processed).toContain('Content after import.');
  });

  test('handles absolute paths', async () => {
    // Create test file
    const includeContent = '# Absolute Path Content\nThis is content from an absolute path.';
    const includePath = path.join(testDir, 'absolute.md');
    await fs.writeFile(includePath, includeContent);

    const mainContent = `# Main File\n\n<!-- import: ${includePath} -->\n\nAfter import.`;
    
    // Process imports
    const processed = await processImports(mainContent, testDir);

    // Check that absolute imports work
    expect(processed).toContain('# Main File');
    expect(processed).toContain('# Absolute Path Content');
    expect(processed).toContain('This is content from an absolute path.');
    expect(processed).toContain('After import.');
  });
});