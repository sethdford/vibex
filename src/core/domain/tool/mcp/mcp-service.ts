/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { 
  MCPClient, 
  MCPServerConfig,
  MCPToolDefinition,
  MCPToolParameters,
  MCPServerStatus,
  MCPToolResult
} from '../../../../tools/mcp-client';
import {
  EventBus,
  MCPServerConnectedEvent,
  MCPServerDisconnectedEvent,
  MCPToolExecutedEvent,
  MCPAllDisconnectedEvent
} from '../tool-events';
import { Tool } from '../tool-interfaces';

/**
 * MCP Service Interface
 * 
 * Provides an interface for working with MCP servers and tools
 * within the Clean Architecture.
 */
export interface MCPService {
  /**
   * Connect to an MCP server
   */
  connectServer(config: MCPServerConfig): Promise<void>;
  
  /**
   * Disconnect from an MCP server
   */
  disconnectServer(serverName: string): Promise<void>;
  
  /**
   * Get status of an MCP server
   */
  getServerStatus(serverName: string): MCPServerStatus;
  
  /**
   * Get all connected MCP servers
   */
  getServers(): string[];
  
  /**
   * Get all available MCP tools
   */
  getTools(): MCPToolDefinition[];
  
  /**
   * Execute an MCP tool call
   */
  executeTool(toolName: string, parameters: MCPToolParameters): Promise<MCPToolResult>;
  
  /**
   * Create tool adapters for all tools from a server
   */
  createToolAdapters(serverName: string): Promise<Tool[]>;
  
  /**
   * Disconnect from all MCP servers
   */
  disconnectAll(): Promise<void>;
}

/**
 * Implementation of the MCP Service
 */
export class MCPServiceImpl implements MCPService {
  private mcpClient: MCPClient;
  private eventBus?: EventBus;
  
  /**
   * Constructor
   */
  constructor(mcpClient: MCPClient, eventBus?: EventBus) {
    this.mcpClient = mcpClient;
    this.eventBus = eventBus;
  }
  
  /**
   * Connect to an MCP server
   */
  async connectServer(config: MCPServerConfig): Promise<void> {
    await this.mcpClient.connectServer(config);
    
    if (this.eventBus) {
      this.eventBus.publish(new MCPServerConnectedEvent(config.name));
    }
  }
  
  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverName: string): Promise<void> {
    await this.mcpClient.disconnectServer(serverName);
    
    if (this.eventBus) {
      this.eventBus.publish(new MCPServerDisconnectedEvent(serverName));
    }
  }
  
  /**
   * Get status of an MCP server
   */
  getServerStatus(serverName: string): MCPServerStatus {
    return this.mcpClient.getServerStatus(serverName);
  }
  
  /**
   * Get all connected MCP servers
   */
  getServers(): string[] {
    return Array.from(this.mcpClient.getAllServers().keys());
  }
  
  /**
   * Get all available MCP tools
   */
  getTools(): MCPToolDefinition[] {
    return Array.from(this.mcpClient.getAllTools().values());
  }
  
  /**
   * Execute an MCP tool call
   */
  async executeTool(toolName: string, parameters: MCPToolParameters): Promise<MCPToolResult> {
    const result = await this.mcpClient.executeTool(toolName, parameters);
    
    if (this.eventBus) {
      this.eventBus.publish(new MCPToolExecutedEvent(toolName, result.success));
    }
    
    return result;
  }
  
  /**
   * Create tool adapters for all tools from a server
   */
  async createToolAdapters(serverName: string): Promise<Tool[]> {
    throw new Error('Method must be implemented by MCP tool factory');
  }
  
  /**
   * Disconnect from all MCP servers
   */
  async disconnectAll(): Promise<void> {
    await this.mcpClient.disconnectAll();
    
    if (this.eventBus) {
      this.eventBus.publish(new MCPAllDisconnectedEvent());
    }
  }
}

/**
 * Create an MCP Service instance
 */
export function createMCPService(mcpClient: MCPClient, eventBus?: EventBus): MCPService {
  return new MCPServiceImpl(mcpClient, eventBus);
}