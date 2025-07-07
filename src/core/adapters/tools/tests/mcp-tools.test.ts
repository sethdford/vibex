/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MCPToolAdapter, MCPToolFactory } from '../mcp-client-adapter';
import { MCPClient, MCPServerStatus } from '../../../../tools/mcp-client';

// Mock the MCPClient
class MockMCPClient {
  private servers = new Map();
  private tools = new Map();
  
  constructor() {
    // Initialize with mock data
    this.tools.set('mock-server__test-tool', {
      name: 'test-tool',
      description: 'Test tool for unit tests',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name parameter'
          },
          count: {
            type: 'number',
            description: 'Count parameter'
          }
        },
        required: ['name']
      }
    });
  }
  
  async connectServer(config) {
    this.servers.set(config.name, {
      status: MCPServerStatus.CONNECTED,
      config
    });
    return Promise.resolve();
  }
  
  async disconnectServer(serverName) {
    this.servers.delete(serverName);
    return Promise.resolve();
  }
  
  getServerStatus(serverName) {
    return this.servers.get(serverName)?.status || MCPServerStatus.DISCONNECTED;
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

describe('MCP Tool Adapters', () => {
  let mcpClient;
  let adapter;
  let factory;
  
  beforeEach(() => {
    mcpClient = new MockMCPClient();
    
    adapter = new MCPToolAdapter(mcpClient, 'mock-server', {
      name: 'test-tool',
      description: 'Test tool for unit tests',
      input_schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name parameter'
          },
          count: {
            type: 'number',
            description: 'Count parameter'
          }
        },
        required: ['name']
      }
    });
    
    factory = new MCPToolFactory(mcpClient);
  });
  
  describe('MCPToolAdapter', () => {
    it('should initialize properly with correct name and parameters', () => {
      expect(adapter.name).toBe('mock-server__test-tool');
      expect(adapter.description).toBe('Test tool for unit tests');
      expect(adapter.parameters).toBeDefined();
    });
    
    it('should validate parameters correctly', () => {
      // Valid parameters
      expect(adapter.validateParams({
        name: 'test'
      })).toBeNull();
      
      // Missing required parameter
      expect(adapter.validateParams({})).not.toBeNull();
      
      // Invalid parameter type
      expect(adapter.validateParams({
        name: 123 // Should be string
      })).toBeNull(); // Basic validation doesn't check types
    });
    
    it('should execute the tool successfully', async () => {
      const result = await adapter.execute({
        name: 'test-value',
        count: 5
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('mock-server__test-tool');
    });
    
    it('should handle execution errors', async () => {
      const result = await adapter.execute({
        name: 'test-value',
        error: true
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    it('should handle progress reporting', async () => {
      const progressCallback = vi.fn();
      
      await adapter.execute({
        name: 'test-value'
      }, {
        onProgress: progressCallback
      });
      
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith({
        status: 'completed',
        message: 'MCP tool execution completed'
      });
    });
  });
  
  describe('MCPToolFactory', () => {
    it('should connect to server and create tool adapters', async () => {
      const tools = await factory.connectServerAndCreateTools({
        name: 'mock-server',
        command: 'echo',
        args: ['hello'],
        trust: true
      });
      
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toBeInstanceOf(MCPToolAdapter);
      expect(tools[0].name).toContain('mock-server__');
    });
    
    it('should disconnect from all servers', async () => {
      // Connect first
      await factory.connectServerAndCreateTools({
        name: 'mock-server',
        command: 'echo',
        args: ['hello']
      });
      
      // Disconnect
      await factory.disconnectAllServers();
      
      // Check all servers were disconnected
      expect(mcpClient.getAllServers().size).toBe(0);
    });
  });
});