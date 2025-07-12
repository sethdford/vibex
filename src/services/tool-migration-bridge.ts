/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tool Migration Bridge - New Architecture Only
 * 
 * Simplified bridge service that provides unified access to the new architecture tool system.
 * Legacy systems and enhanced registry complexity have been eliminated.
 */

import { logger } from '../utils/logger.js';
import { toolAPI } from '../core/domain/tool/tool-api.js';
import { registerCoreTools } from '../core/adapters/tools/index.js';
import { registerAdvancedFileTools } from '../core/adapters/tools/advanced-tools.js';
import { createWebToolsFactory } from '../core/adapters/tools/web-tools-factory.js';
import { RipgrepTool } from '../core/adapters/tools/ripgrep-adapter.js';
import { CodeAnalyzerTool } from '../core/adapters/tools/code-analyzer-adapter.js';
import { ScreenshotTool } from '../core/adapters/tools/screenshot-adapter.js';
import { MCPToolFactory } from '../core/adapters/tools/mcp-client-adapter.js';
import { mcpClient } from '../tools/mcp-client.js';

// Types
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface LegacyToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LegacyToolHandler {
  (input: Record<string, unknown>): Promise<{ success: boolean; data?: any; error?: string }>;
}

/**
 * Simplified migration bridge configuration
 */
export interface MigrationBridgeConfig {
  /**
   * Web search configuration
   */
  webSearchConfig?: Record<string, unknown>;
  
  /**
   * MCP server configurations
   */
  mcpServerConfigs?: Array<{
    name: string;
    command: string;
    args: string[];
    url?: string;
    trust?: boolean;
  }>;
}

/**
 * New Architecture Only Tool Bridge Service
 */
export class ToolMigrationBridge {
  private initialized = false;
  private webToolsFactory: any = null;
  private mcpToolFactory: MCPToolFactory | null = null;
  private executionStats = {
    newArchitectureUsage: 0,
    totalExecutions: 0
  };
  
  constructor(private config: MigrationBridgeConfig = {}) {
    // Set defaults
    this.config = {
      webSearchConfig: {},
      mcpServerConfigs: [],
      ...config
    };
  }
  
  /**
   * Initialize the new architecture tool system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    logger.info('🔄 Initializing New Architecture Tool System...');
    
    try {
      await this.initializeNewArchitecture();
      
      this.initialized = true;
      logger.info('✅ New Architecture Tool System initialized successfully');
      
      // Log tool counts
      const newTools = toolAPI.getAllTools() || [];
      const newToolCount = newTools.length;
      logger.info(`📊 Tools available: ${newToolCount} new architecture tools`);
      
    } catch (error) {
      logger.error('❌ Failed to initialize New Architecture Tool System:', error);
      throw error;
    }
  }
  
  /**
   * Initialize new architecture tools
   */
  private async initializeNewArchitecture(): Promise<void> {
    logger.info('🏗️ Registering new architecture tools...');
    
    // Register core tools
    const coreTools = registerCoreTools();
    logger.info(`✅ Registered ${Object.keys(coreTools).length} core tools`);
    
    // Register advanced file tools
    const advancedTools = registerAdvancedFileTools();
    logger.info(`✅ Registered ${Object.keys(advancedTools).length} advanced file tools`);
    
    // Register web tools
    this.webToolsFactory = createWebToolsFactory();
    const webTools = await this.webToolsFactory.createWebTools(this.config.webSearchConfig);
    toolAPI.registerTool(webTools.webFetchTool);
    toolAPI.registerTool(webTools.webSearchTool);
    logger.info('✅ Registered web tools (fetch, search)');
    
    // Register specialized tools
    const ripgrepTool = new RipgrepTool();
    const codeAnalyzerTool = new CodeAnalyzerTool();
    const screenshotTool = new ScreenshotTool();
    
    toolAPI.registerTool(ripgrepTool);
    toolAPI.registerTool(codeAnalyzerTool);
    toolAPI.registerTool(screenshotTool);
    logger.info('✅ Registered specialized tools (ripgrep, code analyzer, screenshot)');
    
    // Register MCP tools if configured
    if (this.config.mcpServerConfigs && this.config.mcpServerConfigs.length > 0) {
      this.mcpToolFactory = new MCPToolFactory(mcpClient);
      
      for (const serverConfig of this.config.mcpServerConfigs) {
        try {
          const mcpTools = await this.mcpToolFactory.connectServerAndCreateTools({
            ...serverConfig,
            url: serverConfig.url || `command://${serverConfig.command}`
          });
          for (const tool of mcpTools) {
            toolAPI.registerTool(tool);
          }
          logger.info(`✅ Registered ${mcpTools.length} MCP tools from server: ${serverConfig.name}`);
        } catch (error) {
          logger.warn(`⚠️ Failed to register MCP server ${serverConfig.name}:`, error);
        }
      }
    }
  }
  
  /**
   * Execute a tool using new architecture only
   */
  async executeTool(toolUse: ToolUseBlock): Promise<ToolResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.executionStats.totalExecutions++;
    
    // Execute using new architecture only
    const tool = toolAPI.getTool(toolUse.name);
    if (tool) {
      logger.debug(`🔧 Executing tool "${toolUse.name}" using new architecture`);
      
      try {
        const result = await tool.execute(toolUse.input);
        this.executionStats.newArchitectureUsage++;
        
        return {
          tool_use_id: toolUse.id,
          content: result.success 
            ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2))
            : (typeof result.error === 'string' ? result.error : result.error?.message || 'Tool execution failed'),
          is_error: !result.success
        };
      } catch (error) {
        logger.error(`❌ New architecture tool execution failed for "${toolUse.name}":`, error);
        return {
          tool_use_id: toolUse.id,
          content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          is_error: true
        };
      }
    }
    
    // Tool not found
    const error = `Tool "${toolUse.name}" not found in new architecture`;
    logger.error(error);
    return {
      tool_use_id: toolUse.id,
      content: error,
      is_error: true
    };
  }
  
  /**
   * Get all available tools from new architecture
   */
  getAllTools(): LegacyToolDefinition[] {
    if (!this.initialized) {
      logger.warn('Tool system not initialized, returning empty array');
      return [];
    }
    
    // Get tools from new architecture only
    const newTools = toolAPI.getAllTools() || [];
    
    return newTools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as { type: "object"; properties: Record<string, any>; required?: string[] }
    }));
  }
  
  /**
   * Get a specific tool by name
   */
  getTool(name: string): { definition: LegacyToolDefinition; handler: LegacyToolHandler } | undefined {
    if (!this.initialized) {
      logger.warn('Tool system not initialized');
      return undefined;
    }
    
    const tool = toolAPI.getTool(name);
    if (tool) {
      return {
        definition: {
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters as { type: "object"; properties: Record<string, any>; required?: string[] }
        },
        handler: async (input: Record<string, unknown>) => {
          const result = await tool.execute(input);
          return {
            success: result.success,
            data: result.data,
            error: result.error ? (typeof result.error === 'string' ? result.error : result.error.message) : undefined
          };
        }
      };
    }
    
    return undefined;
  }
  
  /**
   * Get execution statistics
   */
  getStats(): Record<string, { count: number; successRate: number; avgTime: number }> {
    // Simplified stats for new architecture only
    const tools = toolAPI.getAllTools() || [];
    const stats: Record<string, { count: number; successRate: number; avgTime: number }> = {};
    
    for (const tool of tools) {
      stats[tool.name] = {
        count: 0, // Tool API doesn't track individual stats yet
        successRate: 100, // Assume 100% for now
        avgTime: 0 // Not tracked yet
      };
    }
    
    return stats;
  }
  
  /**
   * Clear execution statistics
   */
  clearStats(): void {
    this.executionStats = {
      newArchitectureUsage: 0,
      totalExecutions: 0
    };
    logger.info('📊 Execution statistics cleared');
  }
  
  /**
   * Get migration metrics (simplified for new architecture only)
   */
  getMigrationMetrics(): {
    newArchitectureUsage: number;
    totalExecutions: number;
  } {
    return {
      newArchitectureUsage: this.executionStats.newArchitectureUsage,
      totalExecutions: this.executionStats.totalExecutions
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MigrationBridgeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('🔧 Migration bridge configuration updated');
  }
  
  /**
   * Legacy compatibility method
   */
  async execute(toolUse: ToolUseBlock): Promise<{ success: boolean; result?: any; error?: string }> {
    const result = await this.executeTool(toolUse);
    return {
      success: !result.is_error,
      result: result.content,
      error: result.is_error ? result.content : undefined
    };
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.mcpToolFactory) {
      // MCPToolFactory doesn't have cleanup method, so we'll just set it to null
      this.mcpToolFactory = null;
    }
    
    this.initialized = false;
    logger.info('🧹 Tool Migration Bridge cleaned up');
  }
}

// Global tool migration bridge instance
export const toolMigrationBridge = new ToolMigrationBridge();

/**
 * Initialize the tool migration bridge with configuration
 */
export async function initializeToolMigrationBridge(config?: MigrationBridgeConfig): Promise<void> {
  if (config) {
    toolMigrationBridge.updateConfig(config);
  }
  await toolMigrationBridge.initialize();
}

// Legacy compatibility exports
export const getToolRegistry = () => toolMigrationBridge;
export const getAllTools = () => toolMigrationBridge.getAllTools();
export const executeTool = (toolUse: ToolUseBlock) => toolMigrationBridge.executeTool(toolUse);
export const getToolStats = () => toolMigrationBridge.getStats();
export const clearToolStats = () => toolMigrationBridge.clearStats();

// Alias for registerBuiltInTools compatibility
export const registerBuiltInTools = () => toolMigrationBridge.initialize(); 