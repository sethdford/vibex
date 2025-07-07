/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Comprehensive Tests for Tools Module
 * 
 * These tests cover the core tools functionality:
 * - Web fetch tool
 * - Code analyzer tool
 */

import { jest } from 'vitest';
import * as fs from 'fs/promises';
import path from 'path';
import * as nodeFetch from 'node-fetch';

// Import tools
import { executeWebFetch, createWebFetchTool } from '../../../src/tools/web-fetch.js';
import { executeCodeAnalysis, createCodeAnalyzerTool } from '../../../src/tools/code-analyzer.js';
import { fileExists, readTextFile } from '../../../src/fs/operations.js';

// Mock dependencies
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('node-fetch', () => {
  return {
    __esModule: true,
    default: vi.fn()
  };
});

vi.mock('../../../src/fs/operations.js', () => ({
  fileExists: vi.fn(),
  readTextFile: vi.fn()
}));

describe('Web Fetch Tool', () => {
  // Mock Response class
  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: vi.fn().mockResolvedValue('<html><head><title>Test Page</title></head><body><p>Test content</p></body></html>'),
    headers: {
      get: vi.fn().mockReturnValue('text/html')
    }
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock for fetch
    (nodeFetch.default as jest.Mock).mockResolvedValue(mockResponse);
  });
  
  describe('createWebFetchTool', () => {
    it('should return a valid tool definition', () => {
      const tool = createWebFetchTool();
      
      expect(tool.name).toBe('web_fetch');
      expect(tool.description).toBeDefined();
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.required).toContain('prompt');
    });
  });
  
  describe('executeWebFetch', () => {
    it('should extract URLs from prompt and fetch content', async () => {
      const result = await executeWebFetch({
        prompt: 'Please analyze content from https://example.com and https://test.com'
      });
      
      expect(result.success).toBe(true);
      expect(nodeFetch.default).toHaveBeenCalledTimes(2);
      expect(nodeFetch.default).toHaveBeenCalledWith('https://example.com', expect.any(Object));
      expect(nodeFetch.default).toHaveBeenCalledWith('https://test.com', expect.any(Object));
      expect(result.result).toContain('**https://example.com**');
      expect(result.result).toContain('**https://test.com**');
    });
    
    it('should handle missing URLs in prompt', async () => {
      const result = await executeWebFetch({
        prompt: 'This is a prompt without any URLs'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('No URLs found in the prompt.');
      expect(nodeFetch.default).not.toHaveBeenCalled();
    });
    
    it('should handle empty or missing prompt', async () => {
      const result = await executeWebFetch({});
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(nodeFetch.default).not.toHaveBeenCalled();
    });
    
    it('should respect max_urls parameter', async () => {
      const result = await executeWebFetch({
        prompt: 'Check https://site1.com https://site2.com https://site3.com',
        max_urls: 2
      });
      
      expect(result.success).toBe(true);
      expect(nodeFetch.default).toHaveBeenCalledTimes(2);
      expect(nodeFetch.default).not.toHaveBeenCalledWith('https://site3.com', expect.any(Object));
    });
    
    it('should handle fetch errors for individual URLs', async () => {
      // First call succeeds, second call fails
      (nodeFetch.default as jest.Mock)
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValueOnce(new Error('Network error'));
      
      const result = await executeWebFetch({
        prompt: 'Analyze https://success.com and https://failure.com'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('**https://success.com**');
      expect(result.result).toContain('**https://failure.com**');
      expect(result.result).toContain('Error:');
    });
    
    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        ...mockResponse,
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      
      (nodeFetch.default as jest.Mock).mockResolvedValue(errorResponse);
      
      const result = await executeWebFetch({
        prompt: 'Check https://notfound.com'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('Error: HTTP 404: Not Found');
    });
    
    it('should handle unsupported content types', async () => {
      const pdfResponse = {
        ...mockResponse,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        }
      };
      
      (nodeFetch.default as jest.Mock).mockResolvedValue(pdfResponse);
      
      const result = await executeWebFetch({
        prompt: 'Download https://document.com/file.pdf'
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('Error: Unsupported content type: application/pdf');
    });
    
    it('should extract text from HTML when extract_text_only is true', async () => {
      const htmlContent = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Test Heading</h1>
            <script>console.log("This should be removed");</script>
            <p>This is <b>important</b> content.</p>
            <style>.hidden { display: none; }</style>
          </body>
        </html>
      `;
      
      mockResponse.text.mockResolvedValueOnce(htmlContent);
      
      const result = await executeWebFetch({
        prompt: 'Read https://example.com',
        extract_text_only: true
      });
      
      expect(result.success).toBe(true);
      expect(result.result).not.toContain('script');
      expect(result.result).not.toContain('style');
      expect(result.result).toContain('Test Heading');
      expect(result.result).toContain('important');
    });
    
    it('should return raw HTML when extract_text_only is false', async () => {
      const htmlContent = '<html><body><h1>Raw HTML</h1></body></html>';
      mockResponse.text.mockResolvedValueOnce(htmlContent);
      
      const result = await executeWebFetch({
        prompt: 'Fetch HTML from https://example.com',
        extract_text_only: false
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('<html>');
      expect(result.result).toContain('<body>');
    });
    
    it('should truncate large content', async () => {
      // Create a very large HTML document
      const largeContent = '<html><body>' + 'x'.repeat(10000) + '</body></html>';
      mockResponse.text.mockResolvedValueOnce(largeContent);
      
      const result = await executeWebFetch({
        prompt: 'Fetch https://large-content.com',
        extract_text_only: true
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toContain('[content truncated]');
    });
  });
});

describe('Code Analyzer Tool', () => {
  const testFilePath = '/test/path/test-file.ts';
  const testFileContent = `
    import { something } from 'somewhere';
    
    /**
     * This is a test class
     */
    export class TestClass {
      private password = "hardcoded-password";
      
      constructor() {
        // Init
      }
      
      public doSomething(): void {
        // Do stuff
        if (condition) {
          // More stuff
        }
      }
      
      private helperFunction() {
        return true;
      }
    }
    
    // Utility function
    function utilityFunction(input: string) {
      return input.length;
    }
  `;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (fileExists as jest.Mock).mockResolvedValue(true);
    (readTextFile as jest.Mock).mockResolvedValue(testFileContent);
  });
  
  describe('createCodeAnalyzerTool', () => {
    it('should return a valid tool definition', () => {
      const tool = createCodeAnalyzerTool();
      
      expect(tool.name).toBe('analyze_code');
      expect(tool.description).toBeDefined();
      expect(tool.input_schema).toBeDefined();
      expect(tool.input_schema.required).toContain('file_path');
    });
  });
  
  describe('executeCodeAnalysis', () => {
    it('should analyze TypeScript file correctly', async () => {
      const result = await executeCodeAnalysis({
        file_path: testFilePath
      });
      
      expect(result.success).toBe(true);
      expect(fileExists).toHaveBeenCalledWith(testFilePath);
      expect(readTextFile).toHaveBeenCalledWith(testFilePath);
      
      // Check analysis output contains expected sections
      expect(result.result).toContain('# Code Analysis Report');
      expect(result.result).toContain('## 📊 Code Structure');
      expect(result.result).toContain('## ✨ Code Quality');
      expect(result.result).toContain('## 🔒 Security Analysis');
      expect(result.result).toContain('## 💡 Recommendations');
    });
    
    it('should handle file not found errors', async () => {
      (fileExists as jest.Mock).mockResolvedValue(false);
      
      const result = await executeCodeAnalysis({
        file_path: '/nonexistent/file.ts'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
      expect(readTextFile).not.toHaveBeenCalled();
    });
    
    it('should handle file read errors', async () => {
      (readTextFile as jest.Mock).mockRejectedValue(new Error('Read error'));
      
      const result = await executeCodeAnalysis({
        file_path: testFilePath
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Read error');
    });
    
    it('should detect language correctly based on file extension', async () => {
      // Test TypeScript
      let result = await executeCodeAnalysis({
        file_path: '/test/file.ts'
      });
      expect(result.result).toContain('**Language:** TypeScript');
      
      // Test JavaScript
      result = await executeCodeAnalysis({
        file_path: '/test/file.js'
      });
      expect(result.result).toContain('**Language:** JavaScript');
      
      // Test Python
      result = await executeCodeAnalysis({
        file_path: '/test/file.py'
      });
      expect(result.result).toContain('**Language:** Python');
      
      // Test unknown extension
      result = await executeCodeAnalysis({
        file_path: '/test/file.xyz'
      });
      expect(result.result).toContain('**Language:** Unknown');
    });
    
    it('should include structure analysis metrics', async () => {
      const result = await executeCodeAnalysis({
        file_path: testFilePath
      });
      
      // Structure metrics are present
      expect(result.result).toContain('Functions:');
      expect(result.result).toContain('Classes:');
      expect(result.result).toContain('Interfaces:');
      expect(result.result).toContain('Imports:');
      expect(result.result).toContain('Comments:');
    });
    
    it('should detect security issues in code', async () => {
      // Use content with security issues
      const contentWithSecurityIssues = `
        const apiKey = "1234567890abcdef";
        function dangerousCode() {
          eval(userInput);
        }
      `;
      
      (readTextFile as jest.Mock).mockResolvedValue(contentWithSecurityIssues);
      
      const result = await executeCodeAnalysis({
        file_path: testFilePath
      });
      
      expect(result.result).toContain('Hardcoded API key detected');
      expect(result.result).toContain('Use of eval() function');
      expect(result.result).toContain('🚨 Vulnerabilities');
    });
    
    it('should exclude suggestions when requested', async () => {
      const result = await executeCodeAnalysis({
        file_path: testFilePath,
        include_suggestions: false
      });
      
      expect(result.result).not.toContain('## 💡 Recommendations');
    });
    
    it('should handle code with quality issues', async () => {
      // Create content with quality issues (very long lines)
      const contentWithLongLines = `
        // This is a very short comment
        ${'.'.repeat(200)}
        ${'.'.repeat(200)}
        ${'.'.repeat(200)}
        ${'.'.repeat(200)}
      `;
      
      (readTextFile as jest.Mock).mockResolvedValue(contentWithLongLines);
      
      const result = await executeCodeAnalysis({
        file_path: testFilePath
      });
      
      expect(result.result).toContain('Too many long lines');
      expect(result.result).toContain('Issues:');
    });
  });
});