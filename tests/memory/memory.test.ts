/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Memory System Tests
 * 
 * Unit tests for the memory loading system
 */

import { describe, test, expect, beforeEach, afterEach, jest, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { 
  loadMemoryFiles, 
  saveMemoryFile,
  createDefaultMemoryFile
} from '../../src/memory/index.js';

// Set up test directory
let testDir: string;

beforeAll(async () => {
  // Create a temporary test directory
  testDir = path.join(os.tmpdir(), `vibex-test-${Date.now()}`);
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

describe('Memory System', () => {
  describe('loadMemoryFiles', () => {
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

    test('loads VIBEX.md from project root', async () => {
      // Create a test VIBEX.md file
      const vibexContent = '# Test VIBEX.md\nThis is a test file.';
      await fs.writeFile(path.join(testDir, 'VIBEX.md'), vibexContent);

      // Load memory files
      const result = await loadMemoryFiles(testDir);

      // Check result
      expect(result.count).toBe(1);
      expect(result.charCount).toBeGreaterThan(0);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('VIBEX.md');
      expect(result.content).toContain('# Test VIBEX.md');
    });

    test('loads CLAUDE.md from project root', async () => {
      // Create a test CLAUDE.md file
      const claudeContent = '# Test CLAUDE.md\nThis is a test file.';
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), claudeContent);

      // Load memory files
      const result = await loadMemoryFiles(testDir);

      // Check result
      expect(result.count).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('CLAUDE.md');
      expect(result.content).toContain('# Test CLAUDE.md');
    });

    test('loads GEMINI.md from project root', async () => {
      // Create a test GEMINI.md file
      const geminiContent = '# Test GEMINI.md\nThis is a test file.';
      await fs.writeFile(path.join(testDir, 'GEMINI.md'), geminiContent);

      // Load memory files
      const result = await loadMemoryFiles(testDir);

      // Check result
      expect(result.count).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('GEMINI.md');
      expect(result.content).toContain('# Test GEMINI.md');
    });

    test('loads multiple memory files and sorts by priority', async () => {
      // Create test files
      const vibexContent = '# Test VIBEX.md\nThis is a test file.';
      const claudeContent = '# Test CLAUDE.md\nThis is a test file.';
      const geminiContent = '# Test GEMINI.md\nThis is a test file.';

      await fs.writeFile(path.join(testDir, 'VIBEX.md'), vibexContent);
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), claudeContent);
      await fs.writeFile(path.join(testDir, 'GEMINI.md'), geminiContent);

      // Load memory files
      const result = await loadMemoryFiles(testDir);

      // Check result
      expect(result.count).toBe(3);
      expect(result.files).toHaveLength(3);

      // Check priority order (VIBEX.md > CLAUDE.md > GEMINI.md)
      expect(result.files[0].name).toBe('VIBEX.md');
      expect(result.files[1].name).toBe('CLAUDE.md');
      expect(result.files[2].name).toBe('GEMINI.md');
    });

    test('loads files from .vibex directory', async () => {
      // Create a test file in .vibex directory
      const customContent = '# Custom Memory\nThis is a custom memory file.';
      await fs.writeFile(path.join(testDir, '.vibex', 'custom.md'), customContent);

      // Load memory files
      const result = await loadMemoryFiles(testDir);

      // Check result
      expect(result.count).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('custom.md');
      expect(result.content).toContain('# Custom Memory');
    });

    test('loads JSON files when includeJsonFiles is true', async () => {
      // Create a test JSON file
      const jsonContent = '{"name": "Test", "value": 123}';
      await fs.writeFile(path.join(testDir, '.vibex', 'test.json'), jsonContent);

      // Load memory files with includeJsonFiles: true
      const result = await loadMemoryFiles(testDir, { includeJsonFiles: true });

      // Check result
      expect(result.count).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('test.json');
      expect(result.files[0].format).toBe('json');
      expect(result.content).toContain('"name": "Test"');
    });

    test('ignores JSON files when includeJsonFiles is false', async () => {
      // Create a test JSON file
      const jsonContent = '{"name": "Test", "value": 123}';
      await fs.writeFile(path.join(testDir, '.vibex', 'test.json'), jsonContent);

      // Load memory files with includeJsonFiles: false
      const result = await loadMemoryFiles(testDir, { includeJsonFiles: false });

      // Check result
      expect(result.count).toBe(0);
      expect(result.files).toHaveLength(0);
    });

    test('ignores deeper nested files when maxDepth is set', async () => {
      // Create a deep directory structure
      const deepDir = path.join(testDir, 'level1', 'level2', 'level3');
      await fs.mkdir(deepDir, { recursive: true });

      // Create files at different levels
      await fs.writeFile(path.join(testDir, 'level1', 'file1.md'), '# Level 1 File');
      await fs.writeFile(path.join(testDir, 'level1', 'level2', 'file2.md'), '# Level 2 File');
      await fs.writeFile(path.join(deepDir, 'file3.md'), '# Level 3 File');

      // Load memory files with maxDepth: 1
      const result = await loadMemoryFiles(testDir, { 
        maxDepth: 1,
        includeRootFiles: false
      });

      // Check result - should only find file1.md
      expect(result.count).toBe(1);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('file1.md');
    });

    test('handles empty or non-existent directories', async () => {
      // Create a non-existent directory path
      const nonExistentDir = path.join(testDir, 'non-existent');

      // Try to load memory files from the non-existent directory
      const result = await loadMemoryFiles(nonExistentDir);

      // Check result
      expect(result.count).toBe(0);
      expect(result.files).toHaveLength(0);
      expect(result.charCount).toBe(0);
      expect(result.content).toBe('');
    });
  });

  describe('saveMemoryFile', () => {
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

    test('saves a file to the .vibex directory', async () => {
      // Save a test file
      const testContent = '# Test Content\nThis is a test file.';
      await saveMemoryFile(testDir, 'test.md', testContent);

      // Check if file was created
      const vibexDir = path.join(testDir, '.vibex');
      const filePath = path.join(vibexDir, 'test.md');
      
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Check file content
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(testContent);
    });

    test('creates .vibex directory if it does not exist', async () => {
      // Save a test file (should create .vibex directory)
      const testContent = '# Test Content\nThis is a test file.';
      await saveMemoryFile(testDir, 'test.md', testContent);

      // Check if .vibex directory was created
      const vibexDir = path.join(testDir, '.vibex');
      const dirExists = await fs.stat(vibexDir).then(stats => stats.isDirectory()).catch(() => false);
      
      expect(dirExists).toBe(true);
    });

    test('overwrites existing file with same name', async () => {
      // Create .vibex directory and initial file
      const vibexDir = path.join(testDir, '.vibex');
      await fs.mkdir(vibexDir, { recursive: true });
      
      const initialContent = '# Initial Content';
      await fs.writeFile(path.join(vibexDir, 'test.md'), initialContent);

      // Save a new file with the same name
      const newContent = '# New Content';
      await saveMemoryFile(testDir, 'test.md', newContent);

      // Check file content
      const content = await fs.readFile(path.join(vibexDir, 'test.md'), 'utf-8');
      expect(content).toBe(newContent);
    });
  });

  describe('createDefaultMemoryFile', () => {
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

    test('creates a default VIBEX.md file if it does not exist', async () => {
      // Create default memory file
      await createDefaultMemoryFile(testDir);

      // Check if file was created
      const filePath = path.join(testDir, 'VIBEX.md');
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      
      expect(exists).toBe(true);

      // Check file content
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toContain('# VIBEX.md - Memory File');
    });

    test('does not overwrite existing VIBEX.md file', async () => {
      // Create an existing VIBEX.md file
      const customContent = '# Custom VIBEX.md\nDo not overwrite this!';
      await fs.writeFile(path.join(testDir, 'VIBEX.md'), customContent);

      // Try to create default memory file
      await createDefaultMemoryFile(testDir);

      // Check file content
      const content = await fs.readFile(path.join(testDir, 'VIBEX.md'), 'utf-8');
      expect(content).toBe(customContent);
      expect(content).not.toContain('# VIBEX.md - Memory File');
    });
  });
});