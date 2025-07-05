/**
 * Unit tests for Web Fetch tool
 */

import { jest } from '@jest/globals';
import { createWebFetchTool, executeWebFetch } from '../../../src/tools/web-fetch.js';
import type { InternalToolResult } from '../../../src/tools/index.js';

// Mock dependencies
jest.mock('node-fetch', () => {
  return {
    __esModule: true,
    default: jest.fn()
  };
});

jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Web Fetch Tool', () => {
  // Setup fetch mock
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fetch mock
    mockFetch = jest.fn();
    jest.requireMock('node-fetch').default = mockFetch;
    
    // Setup basic successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: jest.fn().mockReturnValue('text/html')
      },
      text: jest.fn().mockResolvedValue(`
        <html>
          <head>
            <title>Test Page</title>
          </head>
          <body>
            <h1>Hello World</h1>
            <p>This is a test page.</p>
            <script>console.log("This should be removed");</script>
            <style>body { color: red; }</style>
          </body>
        </html>
      `)
    });
  });

  describe('createWebFetchTool', () => {
    test('should create a valid tool definition', () => {
      const toolDef = createWebFetchTool();
      
      expect(toolDef.name).toBe('web_fetch');
      expect(toolDef.description).toBeDefined();
      expect(toolDef.input_schema).toBeDefined();
      expect(toolDef.input_schema.properties.prompt).toBeDefined();
    });
  });

  describe('executeWebFetch', () => {
    test('should extract URLs from prompt and fetch content', async () => {
      const result = await executeWebFetch({
        prompt: 'Please fetch content from https://example.com and analyze it.'
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.anything());
      expect(result.success).toBe(true);
      
      // Check the result contains expected content
      const resultStr = result.result as string;
      expect(resultStr).toContain('Source 1: Test Page');
      expect(resultStr).toContain('URL: https://example.com');
      expect(resultStr).toContain('Hello World');
      expect(resultStr).toContain('This is a test page');
      
      // Check it doesn't contain script content
      expect(resultStr).not.toContain('This should be removed');
    });

    test('should handle multiple URLs', async () => {
      const result = await executeWebFetch({
        prompt: 'Compare the content from https://example.com and https://test.com',
        max_urls: 2
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com', expect.anything());
      expect(mockFetch).toHaveBeenCalledWith('https://test.com', expect.anything());
      expect(result.success).toBe(true);
    });

    test('should respect max_urls limit', async () => {
      const result = await executeWebFetch({
        prompt: 'Fetch from https://site1.com https://site2.com https://site3.com https://site4.com',
        max_urls: 2
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).not.toHaveBeenCalledWith('https://site3.com', expect.anything());
      expect(mockFetch).not.toHaveBeenCalledWith('https://site4.com', expect.anything());
      expect(result.success).toBe(true);
    });

    test('should handle failed fetch requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        }
      });
      
      const result = await executeWebFetch({
        prompt: 'Please fetch content from https://non-existent.com'
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true); // Overall success is still true
      
      // Check the result contains failed fetch info
      const resultStr = result.result as string;
      expect(resultStr).toContain('Failed to fetch');
      expect(resultStr).toContain('https://non-existent.com');
      expect(resultStr).toContain('HTTP 404: Not Found');
    });

    test('should handle mixed success and failure', async () => {
      // First fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        },
        text: jest.fn().mockResolvedValue('<html><title>Success</title><body>Content</body></html>')
      });
      
      // Second fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        }
      });
      
      const result = await executeWebFetch({
        prompt: 'Compare https://success.com and https://failure.com'
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      
      const resultStr = result.result as string;
      expect(resultStr).toContain('Fetched content from 1 of 2 URLs');
      expect(resultStr).toContain('Success');
      expect(resultStr).toContain('Failed to fetch');
      expect(resultStr).toContain('HTTP 500: Internal Server Error');
    });

    test('should handle unsupported content types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockReturnValue('application/pdf')
        }
      });
      
      const result = await executeWebFetch({
        prompt: 'Analyze this PDF: https://example.com/doc.pdf'
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true); // Overall success is still true
      
      const resultStr = result.result as string;
      expect(resultStr).toContain('Failed to fetch');
      expect(resultStr).toContain('Unsupported content type: application/pdf');
    });

    test('should handle no valid URLs', async () => {
      const result = await executeWebFetch({
        prompt: 'Please analyze this without any URLs'
      });
      
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid URLs found');
    });

    test('should return raw HTML when extract_text_only is false', async () => {
      const htmlContent = '<html><body><h1>Raw HTML</h1></body></html>';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        },
        text: jest.fn().mockResolvedValue(htmlContent)
      });
      
      const result = await executeWebFetch({
        prompt: 'Get the raw HTML from https://example.com',
        extract_text_only: false
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      
      const resultStr = result.result as string;
      expect(resultStr).toContain(htmlContent);
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await executeWebFetch({
        prompt: 'Fetch from https://example.com'
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true); // Overall success is true, specific URL failed
      
      const resultStr = result.result as string;
      expect(resultStr).toContain('Failed to fetch');
      expect(resultStr).toContain('Network error');
    });

    test('should truncate very long content', async () => {
      // Create a very long HTML document
      const longText = 'a'.repeat(10000);
      const longHtml = `<html><title>Long Page</title><body>${longText}</body></html>`;
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: jest.fn().mockReturnValue('text/html')
        },
        text: jest.fn().mockResolvedValue(longHtml)
      });
      
      const result = await executeWebFetch({
        prompt: 'Fetch from https://example.com'
      });
      
      expect(result.success).toBe(true);
      
      const resultStr = result.result as string;
      expect(resultStr).toContain('content truncated');
      expect(resultStr.length).toBeLessThan(longHtml.length);
    });
  });
});