/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * MCP Tools Compatibility Layer
 * 
 * This file provides backwards compatibility for legacy code
 * that uses the old MCP tools API.
 */

import { getCoreInstance } from '../../initialization';
import { toolAPI } from '../../domain/tool/tool-api';
import { MCPServerConfig } from '../../../tools/mcp-client';

/**
 * Connect to an MCP server
 */
export async function connectMCPServer(config: MCPServerConfig): Promise<void> {
  const { services } = await getCoreInstance();
  return services.mcpService.connectServer(config);
}

/**
 * Disconnect from an MCP server
 */
export async function disconnectMCPServer(serverName: string): Promise<void> {
  const { services } = await getCoreInstance();
  return services.mcpService.disconnectServer(serverName);
}

/**
 * Get status of an MCP server
 */
export async function getMCPServerStatus(serverName: string): Promise<string> {
  const { services } = await getCoreInstance();
  return services.mcpService.getServerStatus(serverName);
}

/**
 * Get all connected MCP servers
 */
export async function getAllMCPServers(): Promise<string[]> {
  const { services } = await getCoreInstance();
  return services.mcpService.getServers();
}

/**
 * Execute an MCP tool
 */
export async function executeMCPTool(toolName: string, parameters: Record<string, any>): Promise<any> {
  try {
    const result = await toolAPI.executeTool(toolName, parameters);
    
    if (!result.success) {
      throw result.error;
    }
    
    return {
      success: true,
      result: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Discover tools from an MCP server
 */
export async function discoverMCPTools(): Promise<any[]> {
  const { services } = await getCoreInstance();
  return services.mcpService.getTools();
}

/**
 * Disconnect from all MCP servers
 */
export async function disconnectAllMCPServers(): Promise<void> {
  const { services } = await getCoreInstance();
  return services.mcpService.disconnectAll();
}