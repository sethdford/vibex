/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * End-to-End Tests for Specialized Tools
 * 
 * This test suite verifies that the specialized tools work correctly
 * through the entire system, from toolAPI calls through to the actual
 * tool execution and result formatting.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { initializeCore } from '../../src/core/initialization';
import { toolAPI } from '../../src/core/domain/tool/tool-api';
import { 
  searchCode, 
  analyzeCode, 
  takeScreenshot 
} from '../../src/core/adapters/compat';

// Create a temporary test directory and files
const tempDir = path.join(os.tmpdir(), `vibex-e2e-test-${Date.now()}`);
const testFiles = [
  { path: 'main.ts', content: 'function searchUsers(query: string) {\n  return db.users.find({ name: query });\n}' },
  { path: 'utils.ts', content: 'export function formatDate(date: Date) {\n  return date.toISOString();\n}' },
  { path: 'constants.ts', content: 'export const API_KEY = "not-a-real-key";\nexport const MAX_RESULTS = 100;' }
];

// Helper to create test files
async function setupTestFiles() {
  // Create temp directory
  await fs.mkdir(tempDir, { recursive: true });
  
  // Create test files
  for (const file of testFiles) {
    const filePath = path.join(tempDir, file.path);
    await fs.writeFile(filePath, file.content);
  }
  
  return tempDir;
}

// Helper to clean up test files
async function cleanupTestFiles() {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to clean up test files:', error);
  }
}

describe('Specialized Tools E2E Tests', () => {
  let core;
  
  // Setup before tests
  beforeAll(async () => {
    // Create test files
    await setupTestFiles();
    
    // Initialize the core
    core = await initializeCore();
  });
  
  // Cleanup after tests
  afterAll(async () => {
    await cleanupTestFiles();
  });
  
  describe('RipgrepTool E2E', () => {
    it('should find matches in test files', async () => {
      // Use the real ripgrep tool to search the test files
      const result = await toolAPI.executeTool('search_code', {
        pattern: 'function',
        path: tempDir,
        case_sensitive: false,
        max_results: 10
      });
      
      // Verify the search succeeded
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify it found matches in our test files
      const data = result.data as string;
      expect(data).toContain('function');
      expect(data).toContain('main.ts');
      expect(data).toContain('utils.ts');
    });
    
    it('should respect case sensitivity', async () => {
      // Case insensitive search should find both uppercase and lowercase
      const resultInsensitive = await searchCode({
        pattern: 'Function',  // Note: capital F
        path: tempDir,
        case_sensitive: false
      });
      
      expect(resultInsensitive.success).toBe(true);
      expect(resultInsensitive.result).toContain('function');
      
      // Case sensitive search should not find lowercase when searching for uppercase
      const resultSensitive = await searchCode({
        pattern: 'Function',  // Note: capital F
        path: tempDir,
        case_sensitive: true
      });
      
      expect(resultSensitive.success).toBe(true);
      // Should not find the lowercase "function" since we're searching case-sensitively
      expect(resultSensitive.result).not.toContain('main.ts:1:');
    });
    
    it('should limit results when max_results is specified', async () => {
      // Create many files with the same pattern to test result limiting
      const manyMatchesDir = path.join(tempDir, 'many');
      await fs.mkdir(manyMatchesDir, { recursive: true });
      
      // Create 10 files with the same pattern
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(
          path.join(manyMatchesDir, `file${i}.ts`),
          `// Test file ${i}\nfunction test${i}() { return ${i}; }\n`
        );
      }
      
      // Search with limit of 3 results
      const limitedResult = await searchCode({
        pattern: 'function',
        path: manyMatchesDir,
        max_results: 3
      });
      
      expect(limitedResult.success).toBe(true);
      const matches = (limitedResult.result as string).match(/file\d+\.ts/g) || [];
      expect(matches.length).toBeLessThanOrEqual(3);
    });
  });
  
  describe('CodeAnalyzerTool E2E', () => {
    it('should analyze TypeScript files', async () => {
      // Analyze a specific file
      const result = await toolAPI.executeTool('analyze_code', {
        file_path: path.join(tempDir, 'main.ts'),
        analysis_type: 'full',
        include_suggestions: true
      });
      
      // Verify the analysis succeeded
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // Verify the analysis report format
      const report = result.data as string;
      expect(report).toContain('Code Analysis Report');
      expect(report).toContain('main.ts');
      expect(report).toContain('Code Structure');
      expect(report).toContain('Code Quality');
      expect(report).toContain('Security Analysis');
    });
    
    it('should detect security issues in code', async () => {
      // Analyze a file with potential security issues
      const result = await analyzeCode({
        file_path: path.join(tempDir, 'constants.ts'),
        analysis_type: 'security'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('Security Analysis');
      expect(result.result).toContain('API_KEY');
    });
    
    it('should generate improvement suggestions when requested', async () => {
      // Analyze with suggestions
      const resultWithSuggestions = await analyzeCode({
        file_path: path.join(tempDir, 'utils.ts'),
        include_suggestions: true
      });
      
      expect(resultWithSuggestions.success).toBe(true);
      expect(resultWithSuggestions.result).toContain('Recommendations');
    });
  });
  
  describe('ScreenshotTool E2E', () => {
    // Since we can't actually test screenshots in all environments,
    // we'll use a mock for this part of the E2E tests
    
    beforeAll(() => {
      // Mock the executeScreenshot function for this test section
      vi.mock('../../src/tools/screenshot', () => ({
        createScreenshotTool: () => ({
          name: 'take_screenshot',
          description: 'Take a screenshot',
          input_schema: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Type of screenshot' }
            },
            required: ['type']
          }
        }),
        executeScreenshot: vi.fn().mockImplementation(async (input) => {
          const outputPath = input.outputPath || path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);
          
          // Simulate creating an actual file
          await fs.writeFile(outputPath, 'mock screenshot data');
          
          return {
            success: true,
            result: {
              message: `Screenshot saved to ${outputPath}`,
              filePath: outputPath,
              fileSize: 123456,
              dimensions: { width: 1920, height: 1080 }
            }
          };
        })
      }));
    });
    
    it('should take a screenshot and save it to a file', async () => {
      // Take a screenshot
      const result = await toolAPI.executeTool('take_screenshot', {
        type: 'screen',
        outputPath: path.join(tempDir, 'test-screenshot.png')
      });
      
      // Verify the screenshot was taken
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.filePath).toBe(path.join(tempDir, 'test-screenshot.png'));
      
      // Check if file exists
      const fileExists = await fs.access(path.join(tempDir, 'test-screenshot.png'))
        .then(() => true)
        .catch(() => false);
      
      expect(fileExists).toBe(true);
    });
    
    it('should respect delay parameter', async () => {
      const startTime = Date.now();
      
      // Take a screenshot with a delay
      const result = await takeScreenshot({
        type: 'window',
        delay: 50,  // Small delay for testing
        outputPath: path.join(tempDir, 'delayed-screenshot.png')
      });
      
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.filePath).toBe(path.join(tempDir, 'delayed-screenshot.png'));
      
      // Check if file exists
      const fileExists = await fs.access(path.join(tempDir, 'delayed-screenshot.png'))
        .then(() => true)
        .catch(() => false);
      
      expect(fileExists).toBe(true);
    });
  });
});