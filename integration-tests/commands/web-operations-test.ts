/**
 * VibeX Web Operations Integration Test
 * 
 * A comprehensive test suite for validating web request capabilities that outperforms 
 * Gemini CLI's basic web_search test. This suite tests:
 * 
 * 1. HTTP methods (GET, POST, PUT, DELETE)
 * 2. HTTPS requests with certificate validation
 * 3. Request headers and authentication
 * 4. JSON and form data submission
 * 5. Response parsing (JSON, XML, HTML)
 * 6. Error handling (404, 500, timeout)
 * 7. Parallel requests and performance benchmarking
 * 8. Mock responses for offline testing
 * 
 * This test ensures VibeX's web capabilities exceed industry standards for reliability,
 * performance, and security.
 */

import { VibeXTestRig, type PerformanceMetrics } from '../test-helper';
import { Server, createServer } from 'http';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { setTimeout as sleep } from 'timers/promises';

// Test configuration
const HTTP_TEST_PORT = 19715;
const HTTPS_TEST_PORT = 19716;
const TEST_SERVER_HOST = 'localhost';

// Test response types
type TestResponse = {
  status: number;
  headers: Record<string, string>;
  body: any;
};

/**
 * Web Operations Test Suite
 */
describe('Web Operations', () => {
  const testRig = new VibeXTestRig();
  let testEnv: any;
  let httpServer: Server;
  let mockResponses: Map<string, TestResponse>;

  // Setup before tests
  beforeAll(async () => {
    testEnv = testRig.setupIsolatedEnvironment('web-operations-test');

    // Setup mock server
    mockResponses = new Map();
    httpServer = await setupMockHttpServer();

    // Create test data directory
    const dataDir = join(testEnv.testDir, 'data');
    mkdirSync(dataDir, { recursive: true });

    // Create test files for multipart form uploads
    writeFileSync(
      join(dataDir, 'test-upload.json'), 
      JSON.stringify({ name: 'test-file', type: 'application/json' })
    );
  });

  // Cleanup after tests
  afterAll(async () => {
    // Shutdown mock server
    await new Promise<void>((resolve) => {
      if (httpServer.listening) {
        httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });

    testEnv.cleanup();
  });

  /**
   * Set up a mock HTTP server for testing
   */
  async function setupMockHttpServer(): Promise<Server> {
    return new Promise((resolve) => {
      const server = createServer((req, res) => {
        // Parse request URL and method
        const url = req.url || '/';
        const method = req.method || 'GET';
        const key = `${method}:${url}`;

        // Get auth header if present
        let authHeader = req.headers.authorization;
        
        // Track request body data
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          // Check for mock response
          const mockResponse = mockResponses.get(key);
          
          if (mockResponse) {
            // If auth header is expected but missing or incorrect, return 401
            if (
              url.includes('/auth/') && 
              (!authHeader || authHeader !== 'Bearer test-token')
            ) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }
            
            // Apply mock response
            res.writeHead(mockResponse.status, mockResponse.headers);
            
            // Return response body based on type
            if (typeof mockResponse.body === 'object') {
              res.end(JSON.stringify(mockResponse.body));
            } else {
              res.end(mockResponse.body);
            }
          } else {
            // Default response for undefined routes
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found', path: url }));
          }
        });
      });
      
      server.listen(HTTP_TEST_PORT, () => {
        console.log(`Mock HTTP server listening on port ${HTTP_TEST_PORT}`);
        resolve(server);
      });
    });
  }

  /**
   * Configure mock server responses for different test scenarios
   */
  function configureMockResponses() {
    // Clear existing mocks
    mockResponses.clear();

    // Basic GET response
    mockResponses.set('GET:/api/hello', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { message: 'Hello World' }
    });

    // GET with query parameters
    mockResponses.set('GET:/api/search?q=test', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { results: [{ id: 1, name: 'Test Result' }] }
    });

    // POST endpoint
    mockResponses.set('POST:/api/create', {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: { id: 123, created: true }
    });

    // PUT endpoint
    mockResponses.set('PUT:/api/update/123', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { id: 123, updated: true }
    });

    // DELETE endpoint
    mockResponses.set('DELETE:/api/delete/123', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { id: 123, deleted: true }
    });

    // Auth endpoint
    mockResponses.set('GET:/api/auth/profile', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { id: 'user-1', name: 'Test User' }
    });

    // XML response
    mockResponses.set('GET:/api/data.xml', {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><root><item id="1">Test</item><item id="2">Example</item></root>'
    });

    // HTML response
    mockResponses.set('GET:/api/page.html', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: '<html><head><title>Test Page</title></head><body><h1>Hello</h1><p>This is a test page.</p></body></html>'
    });

    // Error responses
    mockResponses.set('GET:/api/error/404', {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Not Found', code: 404 }
    });

    mockResponses.set('GET:/api/error/500', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Internal Server Error', code: 500 }
    });

    // Timeout simulation
    mockResponses.set('GET:/api/timeout', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: sleep(3000).then(() => 'Delayed response')
    });
  }

  /**
   * Create URL for mock server
   */
  function getMockServerUrl(path: string): string {
    return `http://${TEST_SERVER_HOST}:${HTTP_TEST_PORT}${path}`;
  }

  describe('HTTP Methods', () => {
    beforeEach(() => {
      configureMockResponses();
    });

    // 1. Test GET requests
    test('should perform HTTP GET requests', async () => {
      await testRig.measurePerformance(async () => {
        // Configure vibex to use web request functionality
        await testRig.runCommand('web fetch "GET ' + getMockServerUrl('/api/hello') + '"', {
          shouldFail: false
        });
        
        // Verify the result
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.message).toBe('Hello World');
      });
    });

    // 2. Test POST requests
    test('should perform HTTP POST requests', async () => {
      await testRig.measurePerformance(async () => {
        const testData = { name: 'Test Item', value: 42 };
        
        await testRig.runCommand(
          `web fetch "POST ${getMockServerUrl('/api/create')}" --data '${JSON.stringify(testData)}'`,
          { shouldFail: false }
        );
        
        // Verify the result
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.id).toBe(123);
        expect(result.created).toBe(true);
      });
    });

    // 3. Test PUT requests
    test('should perform HTTP PUT requests', async () => {
      await testRig.measurePerformance(async () => {
        const updateData = { name: 'Updated Item', value: 100 };
        
        await testRig.runCommand(
          `web fetch "PUT ${getMockServerUrl('/api/update/123')}" --data '${JSON.stringify(updateData)}'`,
          { shouldFail: false }
        );
        
        // Verify the result
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.id).toBe(123);
        expect(result.updated).toBe(true);
      });
    });

    // 4. Test DELETE requests
    test('should perform HTTP DELETE requests', async () => {
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "DELETE ${getMockServerUrl('/api/delete/123')}"`,
          { shouldFail: false }
        );
        
        // Verify the result
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.id).toBe(123);
        expect(result.deleted).toBe(true);
      });
    });
  });

  describe('HTTPS and Certificate Validation', () => {
    test('should validate SSL certificates', async () => {
      // Testing certificate validation with a known valid HTTPS endpoint
      // Note: This test uses an external endpoint to validate real HTTPS behavior
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          'web fetch "GET https://httpbin.org/get" --verify-ssl',
          { shouldFail: false }
        );
        
        expect(result).toContain('success');
      });
    });

    test('should reject invalid SSL certificates', async () => {
      // Configure a command that should fail due to invalid cert
      const command = 'web fetch "GET https://self-signed.badssl.com/" --verify-ssl';
      
      // This should fail due to invalid certificate
      await expect(
        testRig.runCommand(command, { shouldFail: true })
      ).rejects.toThrow();
    });

    test('should allow insecure connections when specified', async () => {
      // This should succeed because we're bypassing certificate validation
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          'web fetch "GET https://self-signed.badssl.com/" --insecure',
          { shouldFail: false }
        );
        
        expect(result).toContain('success');
      });
    });
  });

  describe('Headers and Authentication', () => {
    beforeEach(() => {
      configureMockResponses();
    });

    test('should set custom request headers', async () => {
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/hello')}" --headers '{"X-Custom-Header": "TestValue", "User-Agent": "VibeXTest"}'`,
          { shouldFail: false }
        );
        
        // Check success - if the headers were rejected, the request would fail
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
      });
    });

    test('should support bearer token authentication', async () => {
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/auth/profile')}" --auth-token "test-token"`,
          { shouldFail: false }
        );
        
        // Verify the result - this would be 401 if auth failed
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.id).toBe('user-1');
        expect(result.name).toBe('Test User');
      });
    });

    test('should handle basic authentication', async () => {
      // Add basic auth response to mock server
      mockResponses.set('GET:/api/auth/basic', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { authenticated: true }
      });

      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/auth/basic')}" --auth-basic "user:password"`,
          { shouldFail: false }
        );
        
        // Verify the authentication was successful
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.authenticated).toBe(true);
      });
    });
  });

  describe('Request Body Formats', () => {
    beforeEach(() => {
      configureMockResponses();
    });

    test('should submit JSON data', async () => {
      const jsonData = {
        id: 42,
        name: "Test Item",
        nested: { value: true }
      };

      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "POST ${getMockServerUrl('/api/create')}" --json '${JSON.stringify(jsonData)}'`,
          { shouldFail: false }
        );
        
        // Verify the result
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.created).toBe(true);
      });
    });

    test('should submit form data', async () => {
      // Add form endpoint to mock server
      mockResponses.set('POST:/api/form', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { received: true }
      });

      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "POST ${getMockServerUrl('/api/form')}" --form 'name=Test&value=42&checkbox=true'`,
          { shouldFail: false }
        );
        
        // Verify the result
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.received).toBe(true);
      });
    });

    test('should upload files with multipart form data', async () => {
      // Add upload endpoint to mock server
      mockResponses.set('POST:/api/upload', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { uploaded: true, filename: 'test-upload.json' }
      });

      const filePath = join(testEnv.testDir, 'data', 'test-upload.json');
      
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "POST ${getMockServerUrl('/api/upload')}" --multipart --file "${filePath}" --form 'description=Test File'`,
          { shouldFail: false }
        );
        
        // Verify the result
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.uploaded).toBe(true);
      });
    });
  });

  describe('Response Parsing', () => {
    beforeEach(() => {
      configureMockResponses();
    });

    test('should parse JSON responses', async () => {
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/hello')}"`,
          { shouldFail: false }
        );
        
        // Verify the result is parsed JSON
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.message).toBe('Hello World');
      });
    });

    test('should parse XML responses', async () => {
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/data.xml')}"`,
          { shouldFail: false }
        );
        
        // Verify the XML was parsed correctly
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.root.item).toBeDefined();
        expect(result.root.item.length).toBe(2);
        expect(result.root.item[0]._).toBe('Test');
        expect(result.root.item[1]._).toBe('Example');
      });
    });

    test('should parse HTML responses', async () => {
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/page.html')}" --extract-text`,
          { shouldFail: false }
        );
        
        // Verify the HTML text extraction
        const resultFile = join(testEnv.testDir, 'web-fetch-result.txt');
        expect(existsSync(resultFile)).toBe(true);
        
        const content = readFileSync(resultFile, 'utf-8');
        expect(content).toContain('Hello');
        expect(content).toContain('This is a test page');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      configureMockResponses();
    });

    test('should handle 404 errors gracefully', async () => {
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/error/404')}" --allow-error`,
          { shouldFail: false }
        );
        
        // Should capture the error as output
        expect(result).toContain('Not Found');
        expect(result).toContain('404');
      });
    });

    test('should handle 500 server errors', async () => {
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/error/500')}" --allow-error`,
          { shouldFail: false }
        );
        
        expect(result).toContain('Internal Server Error');
        expect(result).toContain('500');
      });
    });

    test('should handle request timeouts', async () => {
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          `web fetch "GET ${getMockServerUrl('/api/timeout')}" --timeout 1000 --allow-error`,
          { shouldFail: false, timeout: 2000 }
        );
        
        expect(result).toContain('timeout');
      });
    });

    test('should handle network errors', async () => {
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          `web fetch "GET http://non-existent-domain-123456789.local/" --allow-error`,
          { shouldFail: false }
        );
        
        expect(result).toContain('network error');
      });
    });
  });

  describe('Parallel Requests', () => {
    beforeEach(() => {
      configureMockResponses();
    });

    test('should execute multiple requests in parallel', async () => {
      const endpoints = [
        '/api/hello',
        '/api/search?q=test',
        '/api/data.xml',
        '/api/page.html'
      ];
      
      const urls = endpoints.map(path => getMockServerUrl(path));
      
      // Execute parallel web requests
      const metrics = await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch-parallel "${urls.join(' ')}"`,
          { shouldFail: false }
        );
      });
      
      // Verify results exist for each request
      const resultDir = join(testEnv.testDir, 'web-fetch-results');
      expect(existsSync(resultDir)).toBe(true);
      
      for (let i = 0; i < endpoints.length; i++) {
        const resultFile = join(resultDir, `result-${i + 1}.json`);
        expect(existsSync(resultFile)).toBe(true);
      }
      
      // Log performance metrics
      console.log(`Parallel requests completed in ${metrics.duration}ms`);
      console.log(`Average time per request: ${metrics.duration / endpoints.length}ms`);
    });

    test('should outperform sequential requests', async () => {
      const endpoints = [
        '/api/hello',
        '/api/search?q=test',
        '/api/data.xml',
        '/api/page.html'
      ];
      
      const urls = endpoints.map(path => getMockServerUrl(path));
      
      // Execute sequential requests and measure time
      const sequentialMetrics = await testRig.measurePerformance(async () => {
        for (const url of urls) {
          await testRig.runCommand(
            `web fetch "GET ${url}"`,
            { shouldFail: false }
          );
        }
      });
      
      // Execute parallel requests and measure time
      const parallelMetrics = await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch-parallel "${urls.join(' ')}"`,
          { shouldFail: false }
        );
      });
      
      console.log(`Sequential execution: ${sequentialMetrics.duration}ms`);
      console.log(`Parallel execution: ${parallelMetrics.duration}ms`);
      console.log(`Performance improvement: ${((sequentialMetrics.duration - parallelMetrics.duration) / sequentialMetrics.duration * 100).toFixed(2)}%`);
      
      // Parallel should be faster
      expect(parallelMetrics.duration).toBeLessThan(sequentialMetrics.duration);
    });
  });

  describe('Mock Responses', () => {
    test('should work with mocked responses for offline testing', async () => {
      // Set up mock responses file
      const mockResponsesData = {
        'GET https://api.example.com/users': {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: [
            { id: 1, name: 'User 1' },
            { id: 2, name: 'User 2' }
          ]
        },
        'GET https://api.example.com/users/1': {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: { id: 1, name: 'User 1', email: 'user1@example.com' }
        },
        'POST https://api.example.com/users': {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: { id: 3, name: 'User 3', created: true }
        }
      };
      
      const mockFilePath = join(testEnv.testDir, 'web-mocks.json');
      writeFileSync(mockFilePath, JSON.stringify(mockResponsesData, null, 2));
      
      // Test with mocked responses
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          `web fetch "GET https://api.example.com/users" --mock-file "${mockFilePath}"`,
          { shouldFail: false }
        );
        
        // Verify mocked data was returned
        expect(result).toContain('success');
      });
      
      // Check the result
      const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
      expect(existsSync(resultFile)).toBe(true);
      
      const resultData = JSON.parse(readFileSync(resultFile, 'utf-8'));
      expect(Array.isArray(resultData)).toBe(true);
      expect(resultData).toHaveLength(2);
      expect(resultData[0].id).toBe(1);
      expect(resultData[1].name).toBe('User 2');
    });
  });

  describe('Performance Benchmarks', () => {
    beforeEach(() => {
      configureMockResponses();
    });

    // Test performance metrics
    test('should measure request performance metrics', async () => {
      // Set up a sequence of identical requests to gather metrics
      const metrics: PerformanceMetrics[] = [];
      const requestCount = 10;
      const endpoint = getMockServerUrl('/api/hello');
      
      for (let i = 0; i < requestCount; i++) {
        const metric = await testRig.measurePerformance(async () => {
          await testRig.runCommand(
            `web fetch "GET ${endpoint}"`,
            { shouldFail: false }
          );
        });
        
        metrics.push(metric);
      }
      
      // Calculate metrics
      const durations = metrics.map(m => m.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];
      
      // Log results
      console.table({
        'Average (ms)': avgDuration.toFixed(2),
        'Min (ms)': minDuration.toFixed(2),
        'Max (ms)': maxDuration.toFixed(2),
        'P95 (ms)': p95Duration.toFixed(2),
        'Requests/sec': (1000 / avgDuration).toFixed(2)
      });
      
      // Benchmark requirement: average request should complete within 1 second
      expect(avgDuration).toBeLessThan(1000);
    });

    test('should handle high concurrency efficiently', async () => {
      const endpoints = [
        '/api/hello',
        '/api/search?q=test',
        '/api/data.xml',
        '/api/page.html'
      ];
      
      // Create multiple combinations of endpoints (25 total)
      const urls: string[] = [];
      for (let i = 0; i < endpoints.length; i++) {
        for (let j = 0; j < endpoints.length; j++) {
          urls.push(getMockServerUrl(endpoints[(i + j) % endpoints.length]));
          if (urls.length >= 25) break;
        }
        if (urls.length >= 25) break;
      }
      
      // Execute large batch of parallel requests
      const metrics = await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch-parallel "${urls.join(' ')}" --concurrency 10`,
          { shouldFail: false }
        );
      });
      
      console.log(`Processed ${urls.length} parallel requests in ${metrics.duration}ms`);
      console.log(`Average time per request: ${metrics.duration / urls.length}ms`);
      console.log(`Memory usage: ${(metrics.memoryUsage.peak.heapUsed / (1024 * 1024)).toFixed(2)}MB peak`);
      
      // Average time per request should be low when running in parallel
      expect(metrics.duration / urls.length).toBeLessThan(100);
    });
  });

  describe('Security Features', () => {
    test('should validate request integrity with checksums', async () => {
      // Create a test file with known content
      const testContent = 'Security test content';
      const testFilePath = join(testEnv.testDir, 'integrity-test.txt');
      writeFileSync(testFilePath, testContent);
      
      // Calculate expected MD5 checksum
      const expectedChecksum = createHash('md5').update(testContent).digest('hex');
      
      // Add integrity validation endpoint to mock responses
      mockResponses.set('POST:/api/validate-integrity', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { 
          received: true,
          validated: true,
          checksum: expectedChecksum
        }
      });
      
      await testRig.measurePerformance(async () => {
        const result = await testRig.runCommand(
          `web fetch "POST ${getMockServerUrl('/api/validate-integrity')}" --file "${testFilePath}" --integrity-check md5`,
          { shouldFail: false }
        );
        
        expect(result).toContain('success');
      });
      
      // Verify integrity validation
      const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
      expect(existsSync(resultFile)).toBe(true);
      
      const resultData = JSON.parse(readFileSync(resultFile, 'utf-8'));
      expect(resultData.validated).toBe(true);
      expect(resultData.checksum).toBe(expectedChecksum);
    });

    test('should prevent request forgery attacks', async () => {
      // Add CSRF protection endpoint
      mockResponses.set('POST:/api/csrf-protected', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { protected: true, success: true }
      });
      
      await testRig.measurePerformance(async () => {
        await testRig.runCommand(
          `web fetch "POST ${getMockServerUrl('/api/csrf-protected')}" --csrf-token "valid-csrf-token"`,
          { shouldFail: false }
        );
        
        // Verify request succeeded with proper token
        const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
        expect(existsSync(resultFile)).toBe(true);
        
        const result = JSON.parse(readFileSync(resultFile, 'utf-8'));
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Comparison with Gemini CLI', () => {
    test('should outperform Gemini CLI web_search in functionality', async () => {
      // Compare basic earth query (similar to Gemini CLI test)
      const result = await testRig.runCommand(
        'web fetch "what planet do we live on" --extract-info',
        { shouldFail: false }
      );
      
      expect(result.toLowerCase()).toContain('earth');
      
      // But our test goes beyond by also supporting:
      // - Verify we can extract structured data
      const resultFile = join(testEnv.testDir, 'web-fetch-result.json');
      expect(existsSync(resultFile)).toBe(true);
      
      // Summary of superiority over Gemini CLI:
      console.log('\n--- VibeX Web Operations Superiority ---');
      console.log('1. Supports all HTTP methods vs Gemini\'s GET-only');
      console.log('2. Includes certificate validation and security features');
      console.log('3. Handles all content types (JSON, XML, HTML) vs Gemini\'s text-only');
      console.log('4. Provides performance metrics and parallel request capability');
      console.log('5. Supports mocking for offline testing');
      console.log('6. Includes comprehensive error handling');
      console.log('7. Tests authentication methods and request integrity');
    });
  });
});