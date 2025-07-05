/**
 * VibeX MCP Server Integration Tests
 * 
 * Comprehensive testing of MCP server functionality, outperforming Gemini CLI's
 * basic implementation with robust error handling, performance metrics,
 * protocol validation, and concurrent execution capabilities.
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { VibeXTestRig, type PerformanceMetrics } from '../test-helper.js';
import { MCPClient, MCPServerStatus, type MCPServerConfig } from '../../src/tools/mcp-client.js';
import { spawn, type ChildProcess } from 'child_process';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * Create a mock MCP server for testing
 */
class MockMCPServer {
  private process: ChildProcess | null = null;
  private port: number;
  private tools: any[] = [];
  private config: {
    responseDelay: number;
    shouldFail: boolean;
    protocol: string;
    validateSchema: boolean;
    simulateLoad: boolean;
  };

  constructor(options: {
    port?: number;
    tools?: any[];
    responseDelay?: number;
    shouldFail?: boolean;
    protocol?: string;
    validateSchema?: boolean;
    simulateLoad?: boolean;
  } = {}) {
    this.port = options.port || 10000 + Math.floor(Math.random() * 1000);
    this.tools = options.tools || [
      {
        name: 'calculator',
        description: 'Performs basic arithmetic operations',
        input_schema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add', 'subtract', 'multiply', 'divide'],
              description: 'The arithmetic operation to perform'
            },
            a: {
              type: 'number',
              description: 'First operand'
            },
            b: {
              type: 'number',
              description: 'Second operand'
            }
          },
          required: ['operation', 'a', 'b']
        }
      },
      {
        name: 'textAnalyzer',
        description: 'Analyzes text for various metrics',
        input_schema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to analyze'
            },
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['length', 'words', 'sentiment', 'entities']
              },
              description: 'Metrics to compute'
            }
          },
          required: ['text']
        }
      }
    ];
    
    this.config = {
      responseDelay: options.responseDelay || 0,
      shouldFail: options.shouldFail || false,
      protocol: options.protocol || 'json-rpc',
      validateSchema: options.validateSchema !== undefined ? options.validateSchema : true,
      simulateLoad: options.simulateLoad || false
    };
  }

  async start(): Promise<number> {
    // Create a simple Node.js script for our mock MCP server
    const script = `
      const http = require('http');
      
      const tools = ${JSON.stringify(this.tools)};
      const config = ${JSON.stringify(this.config)};
      const metrics = {
        requests: 0,
        errors: 0,
        startTime: Date.now(),
        responseTimes: [],
        currentConnections: 0,
        peakConnections: 0,
        toolExecutions: {}
      };
      
      // Simple JSON-RPC server
      const server = http.createServer((req, res) => {
        let body = '';
        metrics.requests++;
        metrics.currentConnections++;
        metrics.peakConnections = Math.max(metrics.peakConnections, metrics.currentConnections);
        
        const requestStart = Date.now();
        
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          let response;
          
          try {
            const request = JSON.parse(body);
            
            // Handle methods
            if (request.method === 'tools/list') {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: { tools }
              };
            }
            else if (request.method === 'tools/call') {
              // Track tool executions
              const toolName = request.params?.name;
              if (toolName) {
                metrics.toolExecutions[toolName] = (metrics.toolExecutions[toolName] || 0) + 1;
              }
              
              // Validate input against schema if enabled
              if (config.validateSchema) {
                const tool = tools.find(t => t.name === toolName);
                if (tool) {
                  const args = request.params?.arguments || {};
                  const schema = tool.input_schema;
                  
                  // Simple validation - check required fields
                  if (schema.required) {
                    for (const required of schema.required) {
                      if (args[required] === undefined) {
                        throw new Error(\`Missing required parameter: \${required}\`);
                      }
                    }
                  }
                }
              }
              
              // Simulate processing
              if (config.simulateLoad) {
                const start = Date.now();
                while (Date.now() - start < 50) {
                  // Busy wait to simulate CPU load
                }
              }
              
              // Handle specific tools
              if (toolName === 'calculator') {
                const args = request.params?.arguments || {};
                const { operation, a, b } = args;
                
                let result;
                switch (operation) {
                  case 'add':
                    result = a + b;
                    break;
                  case 'subtract':
                    result = a - b;
                    break;
                  case 'multiply':
                    result = a * b;
                    break;
                  case 'divide':
                    if (b === 0) throw new Error('Division by zero');
                    result = a / b;
                    break;
                  default:
                    throw new Error('Unknown operation');
                }
                
                response = {
                  jsonrpc: '2.0',
                  id: request.id,
                  result: { value: result }
                };
              }
              else if (toolName === 'textAnalyzer') {
                const args = request.params?.arguments || {};
                const { text, metrics = ['length', 'words'] } = args;
                
                const result = {};
                
                if (metrics.includes('length')) {
                  result.length = text.length;
                }
                if (metrics.includes('words')) {
                  result.words = text.trim().split(/\\s+/).length;
                }
                if (metrics.includes('sentiment')) {
                  // Simplified sentiment analysis
                  const positive = ['good', 'great', 'excellent', 'happy', 'positive'].filter(word => 
                    text.toLowerCase().includes(word)).length;
                  const negative = ['bad', 'terrible', 'sad', 'negative', 'awful'].filter(word => 
                    text.toLowerCase().includes(word)).length;
                  result.sentiment = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';
                }
                if (metrics.includes('entities')) {
                  // Simplified entity extraction
                  const names = ['John', 'Mary', 'Bob', 'Alice'].filter(name => 
                    text.includes(name));
                  const places = ['New York', 'London', 'Paris', 'Tokyo'].filter(place => 
                    text.includes(place));
                  result.entities = { names, places };
                }
                
                response = {
                  jsonrpc: '2.0',
                  id: request.id,
                  result
                };
              }
              else {
                throw new Error(\`Unknown tool: \${toolName}\`);
              }
            }
            else if (request.method === 'server/metrics') {
              metrics.uptime = Date.now() - metrics.startTime;
              const avgResponseTime = metrics.responseTimes.length > 0 
                ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length 
                : 0;
              
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  ...metrics,
                  avgResponseTime
                }
              };
            }
            else {
              throw new Error(\`Unknown method: \${request.method}\`);
            }
            
            // Force failure if configured
            if (config.shouldFail) {
              throw new Error('Server configured to fail');
            }
            
          } catch (error) {
            metrics.errors++;
            response = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32000,
                message: error.message || 'Unknown error',
                data: { stack: error.stack }
              }
            };
          }
          
          // Calculate response time
          const responseTime = Date.now() - requestStart;
          metrics.responseTimes.push(responseTime);
          
          // Apply artificial delay if configured
          setTimeout(() => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
            metrics.currentConnections--;
          }, config.responseDelay);
        });
      });
      
      // Start server
      const port = ${this.port};
      server.listen(port, () => {
        console.log(\`Mock MCP server running at http://localhost:\${port}/\`);
        // Signal to parent process that server is ready
        if (process.send) {
          process.send('ready');
        }
      });
      
      // Capture errors
      server.on('error', (err) => {
        console.error('Server error:', err);
        process.exit(1);
      });
      
      // Clean shutdown
      process.on('SIGTERM', () => {
        console.log('Shutting down mock MCP server');
        server.close(() => {
          process.exit(0);
        });
      });
    `;

    // Start the server
    this.process = spawn('node', ['-e', script], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    });

    // Wait for server to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stop();
        reject(new Error('Server startup timeout'));
      }, 5000);

      this.process!.on('message', (message) => {
        if (message === 'ready') {
          clearTimeout(timeout);
          resolve(this.port);
        }
      });

      this.process!.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.process!.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}, signal ${signal}`));
        }
      });

      this.process!.stdout?.on('data', (data) => {
        console.log(`[Mock MCP Server]: ${data.toString().trim()}`);
      });

      this.process!.stderr?.on('data', (data) => {
        console.error(`[Mock MCP Server ERROR]: ${data.toString().trim()}`);
      });
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      return new Promise<void>((resolve) => {
        this.process!.on('exit', () => {
          this.process = null;
          resolve();
        });
        
        // Force kill after timeout
        setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
            this.process = null;
            resolve();
          }
        }, 1000);
      });
    }
  }

  getServerConfig(): MCPServerConfig {
    return {
      name: `test-server-${randomUUID().slice(0, 8)}`,
      command: 'curl',
      args: [
        '-s',
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', '@-',
        `http://localhost:${this.port}`
      ],
      timeout: 5000
    };
  }
}

describe('MCP Server Integration Tests', () => {
  let rig: VibeXTestRig;
  let mockServer: MockMCPServer;
  let mcpClient: MCPClient;

  beforeEach(async () => {
    rig = new VibeXTestRig();
    rig.setupIsolatedEnvironment('mcp-server-test');
    
    // Create and start a fresh MCP client for each test
    mcpClient = new MCPClient();
  });

  afterEach(async () => {
    // Clean up resources
    if (mockServer) {
      await mockServer.stop();
    }
    await mcpClient.disconnectAll();
    rig.cleanup();
  });

  test('should connect to MCP server and discover tools', async () => {
    // Setup mock MCP server
    mockServer = new MockMCPServer();
    const port = await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Check server status
    const status = mcpClient.getServerStatus(serverConfig.name);
    assert.equal(status, MCPServerStatus.CONNECTED, 'Server should be connected');
    
    // Check tools were discovered
    const tools = mcpClient.getAllTools();
    assert.ok(tools.size >= 2, 'Should discover at least 2 tools');
    
    // Verify tool names
    let hasCalculator = false;
    let hasTextAnalyzer = false;
    
    for (const [name, tool] of tools.entries()) {
      if (name.includes('calculator')) hasCalculator = true;
      if (name.includes('textAnalyzer')) hasTextAnalyzer = true;
    }
    
    assert.ok(hasCalculator, 'Calculator tool should be discovered');
    assert.ok(hasTextAnalyzer, 'TextAnalyzer tool should be discovered');
  });

  test('should execute tool calls successfully', async () => {
    // Setup mock server
    mockServer = new MockMCPServer();
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Find calculator tool
    const tools = mcpClient.getAllTools();
    const calculatorToolName = Array.from(tools.keys()).find(name => name.includes('calculator'));
    assert.ok(calculatorToolName, 'Calculator tool should be available');
    
    // Execute calculator tool
    const result = await mcpClient.executeTool(calculatorToolName!, {
      operation: 'add',
      a: 5,
      b: 3
    });
    
    assert.ok(result.success, 'Tool execution should succeed');
    assert.equal((result.result as any).value, 8, 'Addition should return correct result');
    
    // Test another operation
    const multiplyResult = await mcpClient.executeTool(calculatorToolName!, {
      operation: 'multiply',
      a: 4,
      b: 7
    });
    
    assert.ok(multiplyResult.success, 'Multiplication should succeed');
    assert.equal((multiplyResult.result as any).value, 28, 'Multiplication should return correct result');
  });
  
  test('should handle tool execution errors properly', async () => {
    // Setup mock server
    mockServer = new MockMCPServer();
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Find calculator tool
    const tools = mcpClient.getAllTools();
    const calculatorToolName = Array.from(tools.keys()).find(name => name.includes('calculator'));
    
    // Test division by zero error
    try {
      await mcpClient.executeTool(calculatorToolName!, {
        operation: 'divide',
        a: 10,
        b: 0
      });
      
      assert.fail('Should throw error on division by zero');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error');
      assert.ok(error.message.includes('Division by zero'), 'Error should mention division by zero');
    }
    
    // Test invalid operation
    try {
      await mcpClient.executeTool(calculatorToolName!, {
        operation: 'power', // Not supported
        a: 2,
        b: 3
      });
      
      assert.fail('Should throw error on invalid operation');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error');
      assert.ok(error.message.includes('Unknown operation'), 'Error should mention unknown operation');
    }
  });
  
  test('should handle server connection errors gracefully', async () => {
    // Create server config with non-existent server
    const serverConfig: MCPServerConfig = {
      name: 'non-existent-server',
      command: 'curl',
      args: [
        '-s',
        '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', '@-',
        'http://localhost:9999' // Assuming this port is not in use
      ],
      timeout: 1000 // Short timeout for faster test
    };
    
    // Connect should fail
    try {
      await mcpClient.connectServer(serverConfig);
      assert.fail('Should throw error on connection failure');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error');
    }
    
    // Server status should be error or disconnected
    const status = mcpClient.getServerStatus(serverConfig.name);
    assert.ok(
      status === MCPServerStatus.ERROR || status === MCPServerStatus.DISCONNECTED,
      'Server status should be ERROR or DISCONNECTED'
    );
  });

  test('should measure tool execution performance', async () => {
    // Setup mock server with artificial delay
    mockServer = new MockMCPServer({ responseDelay: 50 });
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Find text analyzer tool
    const tools = mcpClient.getAllTools();
    const analyzerToolName = Array.from(tools.keys()).find(name => name.includes('textAnalyzer'));
    assert.ok(analyzerToolName, 'TextAnalyzer tool should be available');
    
    // Measure performance of text analysis
    const sampleText = "This is a sample text for analysis. It contains some words that the analyzer will count.";
    
    const metrics = await rig.measurePerformance(async () => {
      const result = await mcpClient.executeTool(analyzerToolName!, {
        text: sampleText,
        metrics: ['length', 'words']
      });
      
      assert.ok(result.success, 'Text analysis should succeed');
      assert.equal((result.result as any).length, sampleText.length, 'Length should match');
    });
    
    // Performance assertions
    assert.ok(metrics.duration >= 50, 'Duration should include artificial delay');
    assert.ok(metrics.duration < 500, 'Duration should be reasonable (<500ms)');
    
    console.log(`Tool execution performance: ${metrics.duration}ms`);
  });
  
  test('should handle multiple tool calls concurrently', async () => {
    // Setup mock server
    mockServer = new MockMCPServer();
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Find tools
    const tools = mcpClient.getAllTools();
    const calculatorToolName = Array.from(tools.keys()).find(name => name.includes('calculator'));
    const analyzerToolName = Array.from(tools.keys()).find(name => name.includes('textAnalyzer'));
    
    // Make multiple concurrent calls
    const promises = [
      mcpClient.executeTool(calculatorToolName!, { operation: 'add', a: 1, b: 2 }),
      mcpClient.executeTool(calculatorToolName!, { operation: 'subtract', a: 10, b: 5 }),
      mcpClient.executeTool(analyzerToolName!, { text: "Hello world" }),
      mcpClient.executeTool(analyzerToolName!, { text: "Testing concurrent calls", metrics: ['length', 'words'] })
    ];
    
    // All should complete successfully
    const results = await Promise.all(promises);
    assert.equal(results.length, 4, 'All calls should complete');
    
    // Verify results
    assert.equal((results[0].result as any).value, 3, 'Addition should work correctly');
    assert.equal((results[1].result as any).value, 5, 'Subtraction should work correctly');
    assert.equal((results[2].result as any).length, 11, 'Text length should be correct');
    assert.equal((results[3].result as any).words, 3, 'Word count should be correct');
  });
  
  test('should support different transport protocols', async () => {
    // This test simulates different protocol handling by setting a custom protocol flag
    // In a real scenario, we would test actual different protocols (HTTP, WebSockets, etc.)
    mockServer = new MockMCPServer({ protocol: 'custom-protocol' });
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Verify connection still works with custom protocol
    const status = mcpClient.getServerStatus(serverConfig.name);
    assert.equal(status, MCPServerStatus.CONNECTED, 'Server should connect regardless of protocol');
    
    // Ensure tools are discovered
    const tools = mcpClient.getAllTools();
    assert.ok(tools.size > 0, 'Tools should be discovered over custom protocol');
  });
  
  test('should disconnect from server properly', async () => {
    mockServer = new MockMCPServer();
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Get initial tool count
    const initialTools = mcpClient.getAllTools();
    const initialToolCount = initialTools.size;
    assert.ok(initialToolCount > 0, 'Should have discovered tools');
    
    // Disconnect
    await mcpClient.disconnectServer(serverConfig.name);
    
    // Verify status is disconnected
    const status = mcpClient.getServerStatus(serverConfig.name);
    assert.equal(status, MCPServerStatus.DISCONNECTED, 'Server should be disconnected');
    
    // Tools from this server should be removed
    const finalTools = mcpClient.getAllTools();
    assert.equal(finalTools.size, 0, 'Tools from disconnected server should be removed');
  });
  
  test('should validate tool parameter schemas', async () => {
    // Setup mock server with schema validation enabled
    mockServer = new MockMCPServer({ validateSchema: true });
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Find calculator tool
    const tools = mcpClient.getAllTools();
    const calculatorToolName = Array.from(tools.keys()).find(name => name.includes('calculator'));
    
    // Missing required parameter should fail
    try {
      await mcpClient.executeTool(calculatorToolName!, {
        // Missing 'operation'
        a: 5,
        b: 3
      });
      
      assert.fail('Should throw error on missing required parameter');
    } catch (error) {
      assert.ok(error instanceof Error, 'Should throw Error');
      assert.ok(error.message.includes('Missing required parameter'), 
        'Error should mention missing parameter');
    }
  });
  
  test('should handle multiple servers simultaneously', async () => {
    // Create two mock servers
    const server1 = new MockMCPServer({ port: 10001 });
    const server2 = new MockMCPServer({ 
      port: 10002,
      tools: [
        {
          name: 'fileAnalyzer',
          description: 'Analyzes file properties',
          input_schema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'File path'
              },
              options: {
                type: 'object',
                properties: {
                  includeMetadata: {
                    type: 'boolean',
                    description: 'Whether to include metadata'
                  }
                }
              }
            },
            required: ['path']
          }
        }
      ]
    });
    
    await Promise.all([server1.start(), server2.start()]);
    
    // Connect to both servers
    const config1 = server1.getServerConfig();
    const config2 = server2.getServerConfig();
    
    await mcpClient.connectServer(config1);
    await mcpClient.connectServer(config2);
    
    // Verify both servers are connected
    const status1 = mcpClient.getServerStatus(config1.name);
    const status2 = mcpClient.getServerStatus(config2.name);
    
    assert.equal(status1, MCPServerStatus.CONNECTED, 'Server 1 should be connected');
    assert.equal(status2, MCPServerStatus.CONNECTED, 'Server 2 should be connected');
    
    // Check combined tools from both servers
    const allTools = mcpClient.getAllTools();
    assert.ok(allTools.size >= 3, 'Should have tools from both servers');
    
    // Verify tools from each server
    let hasCalculator = false;
    let hasFileAnalyzer = false;
    
    for (const [name, tool] of allTools.entries()) {
      if (name.includes('calculator')) hasCalculator = true;
      if (name.includes('fileAnalyzer')) hasFileAnalyzer = true;
    }
    
    assert.ok(hasCalculator, 'Should have calculator tool from server 1');
    assert.ok(hasFileAnalyzer, 'Should have fileAnalyzer tool from server 2');
    
    // Disconnect from both
    await mcpClient.disconnectAll();
    
    // Clean up additional server
    await server1.stop();
    await server2.stop();
  });
  
  test('should handle server reconnection', async () => {
    // Start server
    mockServer = new MockMCPServer();
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Check initial connection
    let status = mcpClient.getServerStatus(serverConfig.name);
    assert.equal(status, MCPServerStatus.CONNECTED, 'Server should be initially connected');
    
    // Disconnect
    await mcpClient.disconnectServer(serverConfig.name);
    status = mcpClient.getServerStatus(serverConfig.name);
    assert.equal(status, MCPServerStatus.DISCONNECTED, 'Server should be disconnected');
    
    // Reconnect
    await mcpClient.connectServer(serverConfig);
    status = mcpClient.getServerStatus(serverConfig.name);
    assert.equal(status, MCPServerStatus.CONNECTED, 'Server should be reconnected');
    
    // Verify tools are rediscovered
    const tools = mcpClient.getAllTools();
    assert.ok(tools.size > 0, 'Tools should be rediscovered after reconnection');
  });
  
  test('should handle high load and stress testing', async () => {
    // Configure server to simulate load
    mockServer = new MockMCPServer({ simulateLoad: true });
    await mockServer.start();
    
    // Connect to server
    const serverConfig = mockServer.getServerConfig();
    await mcpClient.connectServer(serverConfig);
    
    // Find calculator tool
    const tools = mcpClient.getAllTools();
    const calculatorToolName = Array.from(tools.keys()).find(name => name.includes('calculator'));
    
    // Make many concurrent requests
    const requests = 20;
    const operations = ['add', 'subtract', 'multiply', 'divide'];
    
    const promises = Array.from({ length: requests }, (_, i) => {
      const operation = operations[i % operations.length];
      const a = Math.floor(Math.random() * 100);
      const b = operation === 'divide' ? Math.floor(Math.random() * 10) + 1 : Math.floor(Math.random() * 100); // Avoid divide by zero
      
      return mcpClient.executeTool(calculatorToolName!, {
        operation,
        a,
        b
      });
    });
    
    // Measure performance under load
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // Verify all operations succeeded
    assert.equal(results.length, requests, 'All requests should complete');
    assert.ok(results.every(r => r.success), 'All requests should succeed');
    
    // Check performance
    const requestsPerSecond = (requests / duration) * 1000;
    console.log(`Load test: ${requests} requests in ${duration}ms (${requestsPerSecond.toFixed(2)} req/sec)`);
    
    // Basic throughput assertion - adjust based on actual capabilities
    assert.ok(requestsPerSecond > 5, 'Should handle at least 5 requests per second under load');
  });
});