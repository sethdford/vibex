/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { toolAPI } from '../../domain/tool/tool-api';
import { ReadFileTool } from './read-file-adapter';
import { WriteFileTool } from './write-file-adapter';
import { ShellTool } from './shell-adapter';
import { ListDirectoryTool } from './list-directory-adapter';
import { ReadManyFilesTool } from './read-many-files-adapter';
import { EditTool } from './edit-adapter';
import { GlobTool } from './glob-adapter';
import { WebFetchTool } from './web-fetch-adapter';
import { WebSearchTool } from './web-search-adapter';
import { createWebToolsFactory } from './web-tools-factory';
import { MCPToolFactory } from './mcp-client-adapter';
import { mcpClient } from '../../../tools/mcp-client';
import { RipgrepTool } from './ripgrep-adapter';
import { CodeAnalyzerTool } from './code-analyzer-adapter';
import { ScreenshotTool } from './screenshot-adapter';
import { ToolSystemConfig } from '../../domain/tool/tool-interfaces';
import { MCPServerConfig } from '../../../tools/mcp-client';

/**
 * Register all core tools with the new tool system
 */
export function registerCoreTools() {
  // Create core tool instances
  const readFileTool = new ReadFileTool();
  const writeFileTool = new WriteFileTool();
  const shellTool = new ShellTool();

  // Register core tools
  toolAPI.registerTool(readFileTool);
  toolAPI.registerTool(writeFileTool);
  toolAPI.registerTool(shellTool);
  
  return {
    readFileTool,
    writeFileTool,
    shellTool
  };
}

/**
 * Register all advanced file tools with the new tool system
 */
export function registerAdvancedFileTools() {
  // Create advanced file tool instances
  const listDirectoryTool = new ListDirectoryTool();
  const readManyFilesTool = new ReadManyFilesTool();
  const editTool = new EditTool();
  const globTool = new GlobTool();

  // Register advanced file tools
  toolAPI.registerTool(listDirectoryTool);
  toolAPI.registerTool(readManyFilesTool);
  toolAPI.registerTool(editTool);
  toolAPI.registerTool(globTool);
  
  return {
    listDirectoryTool,
    readManyFilesTool,
    editTool,
    globTool
  };
}

/**
 * Register all specialized tools with the new tool system
 * 
 * This includes high-performance tools like ripgrep for code searching,
 * code analysis tools, and screenshot capture capabilities.
 */
export function registerSpecializedTools(config: ToolSystemConfig = {}) {
  // Create specialized tool instances
  const ripgrepTool = new RipgrepTool();
  const codeAnalyzerTool = new CodeAnalyzerTool();
  const screenshotTool = new ScreenshotTool();

  // Register specialized tools
  toolAPI.registerTool(ripgrepTool);
  toolAPI.registerTool(codeAnalyzerTool);
  toolAPI.registerTool(screenshotTool);
  
  // Log registration
  console.info('Registered specialized tools:', [
    ripgrepTool.name, 
    codeAnalyzerTool.name, 
    screenshotTool.name
  ].join(', '));
  
  return {
    ripgrepTool,
    codeAnalyzerTool,
    screenshotTool
  };
}

/**
 * Register all web tools with the new tool system
 */
export async function registerWebTools(config: ToolSystemConfig = {}) {
  // Create web tools factory
  const webToolsFactory = createWebToolsFactory();
  
  // Create web tools
  const { webFetchTool, webSearchTool } = await webToolsFactory.createWebTools(config);
  
  // Register web tools
  toolAPI.registerTool(webFetchTool);
  toolAPI.registerTool(webSearchTool);
  
  return {
    webFetchTool,
    webSearchTool
  };
}

/**
 * Register all MCP tools with the new tool system
 */
export async function registerMCPTools(config: ToolSystemConfig = {}) {
  // Create MCP tool factory
  const mcpToolFactory = new MCPToolFactory(mcpClient);
  
  // Get MCP server configs from the overall config
  const mcpServers = (config.mcp?.servers || []) as MCPServerConfig[];
  
  // Connect to each MCP server and create tools
  const allTools: any = {};
  
  for (const serverConfig of mcpServers) {
    try {
      const tools = await mcpToolFactory.connectServerAndCreateTools(serverConfig);
      
      // Register MCP tools
      for (const tool of tools) {
        toolAPI.registerTool(tool);
        allTools[tool.name] = tool;
      }
    } catch (error) {
      console.warn(`Failed to connect to MCP server ${serverConfig.name}:`, error);
    }
  }
  
  return allTools;
}

/**
 * Register all tools with the new tool system
 */
export async function registerAllTools(config: ToolSystemConfig = {}) {
  const coreTools = registerCoreTools();
  const advancedFileTools = registerAdvancedFileTools();
  const specializedTools = registerSpecializedTools(config);
  const webTools = await registerWebTools(config);
  const mcpTools = await registerMCPTools(config);
  
  return {
    ...coreTools,
    ...advancedFileTools,
    ...specializedTools,
    ...webTools,
    ...mcpTools
  };
}

/**
 * Configure the tool system with proper settings
 */
export function configureToolSystem(config: ToolSystemConfig = {}) {
  toolAPI.configure({
    git: {
      enableCheckpoints: true,
      checkpointBranch: 'vibex-tool-checkpoints',
      ...(config.git || {})
    },
    confirmation: {
      requireForDangerous: true,
      trustedTools: [], // Start with no trusted tools
      ...(config.confirmation || {})
    },
    execution: {
      defaultTimeout: 30000,
      maxParallelExecutions: 3,
      ...(config.execution || {})
    },
    mcp: {
      servers: [],
      autoTrust: false,
      connectionTimeout: 10000,
      ...(config.mcp || {})
    }
  });
}