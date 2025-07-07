/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Integration Tests for MCP Tool System
 * 
 * These tests verify that the MCP tool system components work together correctly,
 * including the Clean Architecture implementation, adaptation layers, UI components,
 * and event-driven communication.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolConfirmationOutcome } from '../../../src/core/domain/tool/tool-interfaces';
import { initializeCore } from '../../../src/core/initialization';
import { toolAPI } from '../../../src/core/domain/tool/tool-api';
import { mcpClient } from '../../../src/tools/mcp-client';
import { InMemoryEventBus } from '../../../src/core/domain/tool/tool-events';
import { MCPServerConfig } from '../../../src/tools/mcp-client';

// Mock the MCPClient class
vi.mock('../../../src/tools/mcp-client', () => {
  const EventEmitter = require('events');
  
  class MockMCPClient extends EventEmitter {
    private servers = new Map();
    private tools = new Map();
    
    constructor() {
      super();
      
      // Initialize with mock data
      this.tools.set('mock-server__test-tool', {
        name: 'test-tool',
        description: 'Test tool for unit tests',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Query parameter'
            },
            limit: {
              type: 'number',
              description: 'Limit parameter'
            }
          },
          required: ['query']
        }
      });
    }
    
    async connectServer(config) {
      this.servers.set(config.name, {
        status: 'connected',
        config
      });
      
      // Add tools for this server
      if (config.name === 'mock-server') {
        this.tools.set('mock-server__test-tool', {
          name: 'test-tool',
          description: 'Test tool for integration tests',
          input_schema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Query parameter'
              },
              limit: {
                type: 'number',
                description: 'Limit parameter'
              }
            },
            required: ['query']
          }
        });
      }
      
      this.emit('server:connected', config.name);
      return Promise.resolve();
    }
    
    async disconnectServer(serverName) {
      this.servers.delete(serverName);
      
      // Remove tools for this server
      for (const [toolName] of this.tools.entries()) {
        if (toolName.startsWith(`${serverName}__`)) {
          this.tools.delete(toolName);
        }
      }
      
      this.emit('server:disconnected', serverName);
      return Promise.resolve();
    }
    
    getServerStatus(serverName) {
      return this.servers.get(serverName)?.status || 'disconnected';
    }
    
    getAllServers() {
      return this.servers;
    }
    
    getAllTools() {
      return this.tools;
    }
    
    async executeTool(toolName, parameters) {
      if (parameters.error) {
        return {
          success: false,
          error: 'Error executing tool'
        };
      }
      
      return {
        success: true,
        result: {
          message: `Executed ${toolName} with parameters: ${JSON.stringify(parameters)}`
        }
      };
    }
    
    async disconnectAll() {
      this.servers.clear();
      return Promise.resolve();
    }
  }
  
  return {
    mcpClient: new MockMCPClient(),
    MCPClient: MockMCPClient
  };
});

// Mock the confirmation service to auto-confirm
vi.mock('../../../src/core/domain/tool/confirmation', () => {
  return {
    createConfirmationService: () => ({
      requestConfirmation: async () => ToolConfirmationOutcome.ProceedOnce,
      isTrusted: () => false,
      markAsTrusted: () => {}
    })
  };
});

describe('MCP Tool System Integration', () => {
  let core;
  let eventBus;
  let mockServerConfig: MCPServerConfig;
  
  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Initialize the core with test configuration
    mockServerConfig = {
      name: 'mock-server',
      command: 'echo',
      args: ['test'],
      trust: false
    };
    
    const config = {
      mcp: {
        servers: [mockServerConfig],
        autoTrust: false
      }
    };
    
    core = await initializeCore(config);
    eventBus = core.eventBus;
  });
  
  afterEach(async () => {
    // Clean up
    if (mcpClient) {
      await mcpClient.disconnectAll();
    }
  });
  
  it('should initialize the core with MCP service', () => {
    expect(core).toBeDefined();
    expect(core.services.mcpService).toBeDefined();
    expect(core.tools).toBeDefined();
  });
  
  it('should connect to MCP server during initialization', async () => {
    const serverStatus = await core.services.mcpService.getServerStatus('mock-server');
    expect(serverStatus).toBe('connected');
  });
  
  it('should register MCP tools during initialization', () => {
    const tools = core.tools;
    
    // Find the MCP tool in the registered tools
    const mcpTool = Object.values(tools).find(tool => 
      (tool as any).name?.includes('mock-server__test-tool')
    );
    
    expect(mcpTool).toBeDefined();
  });
  
  it('should execute MCP tool through the tool API', async () => {
    // Set up event listener to verify events
    let executionStarted = false;
    let executionCompleted = false;
    
    eventBus.subscribe('tool_execution_started', () => {
      executionStarted = true;
    });
    
    eventBus.subscribe('tool_execution_completed', () => {
      executionCompleted = true;
    });
    
    // Execute the tool
    const result = await toolAPI.executeTool('mock-server__test-tool', {
      query: 'test query',
      limit: 10
    });
    
    // Verify the result
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.message).toContain('mock-server__test-tool');
    expect(result.data.message).toContain('test query');
    
    // Verify events were fired
    expect(executionStarted).toBe(true);
    expect(executionCompleted).toBe(true);
  });
  
  it('should handle MCP tool execution errors', async () => {
    // Execute the tool with error flag
    const result = await toolAPI.executeTool('mock-server__test-tool', {
      query: 'test query',
      error: true
    });
    
    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
  
  it('should handle disconnecting from MCP server', async () => {
    // Disconnect the server
    await core.services.mcpService.disconnectServer('mock-server');
    
    // Verify server is disconnected
    const serverStatus = core.services.mcpService.getServerStatus('mock-server');
    expect(serverStatus).toBe('disconnected');
    
    // Try to execute the tool (should fail)
    const result = await toolAPI.executeTool('mock-server__test-tool', {
      query: 'test query'
    });
    
    expect(result.success).toBe(false);
  });
  
  it('should handle reconnecting to MCP server', async () => {
    // Disconnect first
    await core.services.mcpService.disconnectServer('mock-server');
    
    // Reconnect
    await core.services.mcpService.connectServer(mockServerConfig);
    
    // Verify server is reconnected
    const serverStatus = core.services.mcpService.getServerStatus('mock-server');
    expect(serverStatus).toBe('connected');
    
    // Execute the tool again
    const result = await toolAPI.executeTool('mock-server__test-tool', {
      query: 'test query'
    });
    
    expect(result.success).toBe(true);
  });
});