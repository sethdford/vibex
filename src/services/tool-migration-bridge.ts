/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * Tool Migration Bridge Service
 * 
 * This service provides a bridge between the legacy tool registry system
 * and the new clean architecture tool system, allowing gradual migration
 * while maintaining compatibility.
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

// Legacy imports
import type { 
  ToolDefinition as LegacyToolDefinition, 
  ToolHandler as LegacyToolHandler,
  ToolUseBlock,
  ToolResult,
  InternalToolResult
} from '../tools/index.js';

/**
 * Migration Bridge Configuration
 */
export interface MigrationBridgeConfig {
  /**
   * Whether to use new architecture for tool execution
   */
  useNewArchitecture?: boolean;
  
  /**
   * Whether to register legacy tools as fallback
   */
  enableLegacyFallback?: boolean;
  
  /**
   * Whether to integrate enhanced registry features
   */
  enableEnhancedFeatures?: boolean;
  
  /**
   * Migration mode
   */
  migrationMode?: 'gradual' | 'legacy-only' | 'new-only';
  
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
 * Tool Migration Bridge Service
 */
export class ToolMigrationBridge {
  private initialized = false;
  private legacyRegistry: any = null;
  private enhancedRegistry: any = null;
  private webToolsFactory: any = null;
  private mcpToolFactory: MCPToolFactory | null = null;
  
  constructor(private config: MigrationBridgeConfig = {}) {
    // Set defaults
    this.config = {
      useNewArchitecture: true,
      enableLegacyFallback: true,
      enableEnhancedFeatures: true,
      migrationMode: 'gradual',
      webSearchConfig: {},
      mcpServerConfigs: [],
      ...config
    };
  }
  
  /**
   * Initialize the migration bridge
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    logger.info('🔄 Initializing Tool Migration Bridge...');
    
    try {
      if (this.config.useNewArchitecture) {
        await this.initializeNewArchitecture();
      }
      
      if (this.config.enableLegacyFallback) {
        await this.initializeLegacyFallback();
      }
      
      if (this.config.enableEnhancedFeatures) {
        await this.initializeEnhancedRegistry();
      }
      
      this.initialized = true;
      logger.info('✅ Tool Migration Bridge initialized successfully');
      
      // Log tool counts with null checks
      const newTools = toolAPI.getAllTools() || [];
      const newToolCount = newTools.length;
      const legacyToolCount = this.legacyRegistry ? (this.legacyRegistry.getAll()?.length || 0) : 0;
      logger.info(`📊 Tools available: ${newToolCount} new architecture, ${legacyToolCount} legacy fallback`);
      
    } catch (error) {
      logger.error('❌ Failed to initialize Tool Migration Bridge:', error);
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
   * Initialize legacy fallback system
   */
  private async initializeLegacyFallback(): Promise<void> {
    logger.info('🔄 Initializing legacy tool fallback...');
    
    try {
      // Import legacy tools directly, NOT the registry that uses this bridge
      // This prevents circular dependency
      const { createSimpleLegacyRegistry } = await import('../tools/legacy-tools.js');
      this.legacyRegistry = createSimpleLegacyRegistry();
      
      logger.info('✅ Legacy tool fallback initialized');
    } catch (error) {
      logger.warn('⚠️ Failed to initialize legacy fallback:', error);
    }
  }
  
  /**
   * Initialize enhanced registry features
   */
  private async initializeEnhancedRegistry(): Promise<void> {
    logger.info('🚀 Initializing enhanced registry features...');
    
    try {
      // Import enhanced registry
      const { enhancedToolRegistry } = await import('../tools/enhanced-registry.js');
      this.enhancedRegistry = enhancedToolRegistry;
      
      logger.info('✅ Enhanced registry features initialized');
    } catch (error) {
      logger.warn('⚠️ Failed to initialize enhanced registry:', error);
    }
  }
  
  /**
   * Execute a tool using the migration bridge
   */
  async executeTool(toolUse: ToolUseBlock): Promise<ToolResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Try new architecture first
    if (this.config.useNewArchitecture) {
      const tool = toolAPI.getTool(toolUse.name);
      if (tool) {
        logger.debug(`🔧 Executing tool "${toolUse.name}" using new architecture`);
        
        try {
          const result = await tool.execute(toolUse.input);
          
          return {
            tool_use_id: toolUse.id,
            content: result.success 
              ? (typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2))
              : (typeof result.error === 'string' ? result.error : result.error?.message || 'Tool execution failed'),
            is_error: !result.success
          };
        } catch (error) {
          logger.error(`❌ New architecture tool execution failed for "${toolUse.name}":`, error);
          
          // Fall back to legacy if enabled
          if (this.config.enableLegacyFallback && this.legacyRegistry) {
            logger.debug(`🔄 Falling back to legacy tool execution for "${toolUse.name}"`);
            return this.legacyRegistry.execute(toolUse);
          }
          
          return {
            tool_use_id: toolUse.id,
            content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
            is_error: true
          };
        }
      }
    }
    
    // Try enhanced registry if available
    if (this.config.enableEnhancedFeatures && this.enhancedRegistry) {
      const enhancedTool = this.enhancedRegistry.get(toolUse.name);
      if (enhancedTool) {
        logger.debug(`🚀 Executing tool "${toolUse.name}" using enhanced registry`);
        return this.enhancedRegistry.execute(toolUse.name, toolUse.input, toolUse.id);
      }
    }
    
    // Fall back to legacy registry
    if (this.config.enableLegacyFallback && this.legacyRegistry) {
      logger.debug(`🔄 Executing tool "${toolUse.name}" using legacy registry`);
      return this.legacyRegistry.execute(toolUse);
    }
    
    // Tool not found
    const error = `Tool "${toolUse.name}" not found in new architecture or legacy registry`;
    logger.error(error);
    return {
      tool_use_id: toolUse.id,
      content: error,
      is_error: true
    };
  }
  
  /**
   * Get all available tools from both systems
   */
  getAllTools(): LegacyToolDefinition[] {
    const tools: LegacyToolDefinition[] = [];
    
    try {
      // Get tools from new architecture
      if (this.config.useNewArchitecture) {
        const newTools = toolAPI.getAllTools() || [];
        for (const tool of newTools) {
          tools.push({
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters as { type: "object"; properties: Record<string, any>; required?: string[] }
          });
        }
      }
      
      // Get tools from enhanced registry (avoiding duplicates)
      if (this.config.enableEnhancedFeatures && this.enhancedRegistry) {
        const enhancedTools = this.enhancedRegistry.getAll() || [];
        const existingNames = new Set(tools.map(t => t.name));
        
        for (const enhancedTool of enhancedTools) {
          if (!existingNames.has(enhancedTool.name)) {
            tools.push(enhancedTool);
          }
        }
      }
      
      // Get tools from legacy registry (avoiding duplicates)
      if (this.config.enableLegacyFallback && this.legacyRegistry) {
        const legacyTools = this.legacyRegistry.getAll() || [];
        const existingNames = new Set(tools.map(t => t.name));
        
        for (const legacyTool of legacyTools) {
          if (!existingNames.has(legacyTool.name)) {
            tools.push(legacyTool);
          }
        }
      }
    } catch (error) {
      logger.error('Error getting tools:', error);
      // Return empty array on error instead of throwing
    }
    
    return tools;
  }
  
  /**
   * Get tool by name from either system
   */
  getTool(name: string): { definition: LegacyToolDefinition; handler: LegacyToolHandler } | undefined {
    // Try new architecture first
    if (this.config.useNewArchitecture) {
      const tool = toolAPI.getTool(name);
      if (tool) {
                  return {
            definition: {
              name: tool.name,
              description: tool.description,
              input_schema: tool.parameters as { type: "object"; properties: Record<string, any>; required?: string[] }
            },
            handler: async (input) => {
              const result = await tool.execute(input);
              return {
                success: result.success,
                result: result.data,
                error: result.error ? (typeof result.error === 'string' ? result.error : result.error.message) : undefined,
                metadata: result.metadata as any
              };
            }
          };
      }
    }
    
    // Fall back to legacy
    if (this.config.enableLegacyFallback && this.legacyRegistry) {
      return this.legacyRegistry.get(name);
    }
    
    return undefined;
  }
  
  /**
   * Get execution statistics
   */
  getStats(): Record<string, { count: number; successRate: number; avgTime: number }> {
    // For now, just return legacy stats if available
    if (this.legacyRegistry) {
      return this.legacyRegistry.getStats();
    }
    
    return {};
  }
  
  /**
   * Clear execution statistics
   */
  clearStats(): void {
    if (this.legacyRegistry && this.legacyRegistry.clearStats) {
      this.legacyRegistry.clearStats();
    }
  }
  
  /**
   * Get migration metrics
   */
  getMigrationMetrics(): {
    newArchitectureUsage: number;
    legacyFallbackUsage: number;
    enhancedRegistryUsage: number;
    totalExecutions: number;
  } {
    // This would track actual usage metrics in a real implementation
    // For now, return mock data
    return {
      newArchitectureUsage: 0,
      legacyFallbackUsage: 0,
      enhancedRegistryUsage: 0,
      totalExecutions: 0
    };
  }
  
  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<MigrationBridgeConfig>): void {
    // Validate the configuration
    if (newConfig.migrationMode && !['gradual', 'legacy-only', 'new-only'].includes(newConfig.migrationMode)) {
      throw new Error(`Invalid migration mode: ${newConfig.migrationMode}`);
    }

    this.config = { ...this.config, ...newConfig };
    logger.info('Configuration updated', newConfig);
  }
  
  /**
   * Execute tool (alias for executeTool for compatibility)
   */
  async execute(toolUse: ToolUseBlock): Promise<{ success: boolean; result?: any; error?: string }> {
    const result = await this.executeTool(toolUse);
    
    return {
      success: !result.is_error,
      result: result.is_error ? undefined : result.content,
      error: result.is_error ? result.content : undefined
    };
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.mcpToolFactory) {
      await this.mcpToolFactory.disconnectAllServers();
    }
    
    this.initialized = false;
    logger.info('🧹 Tool Migration Bridge cleaned up');
  }
}

/**
 * Global migration bridge instance
 */
export const toolMigrationBridge = new ToolMigrationBridge();

/**
 * Initialize the global migration bridge with configuration
 */
export async function initializeToolMigrationBridge(config?: MigrationBridgeConfig): Promise<void> {
  if (config) {
    // Create new instance with custom config
    const customBridge = new ToolMigrationBridge(config);
    await customBridge.initialize();
    
    // Replace global instance methods
    Object.assign(toolMigrationBridge, customBridge);
  } else {
    await toolMigrationBridge.initialize();
  }
}

/**
 * Legacy compatibility exports
 */
export const getToolRegistry = () => toolMigrationBridge;
export const getAllTools = () => toolMigrationBridge.getAllTools();
export const executeTool = (toolUse: ToolUseBlock) => toolMigrationBridge.executeTool(toolUse);
export const getToolStats = () => toolMigrationBridge.getStats();
export const clearToolStats = () => {}; // Not implemented in new architecture yet

/**
 * New architecture compatibility
 */
export const registerBuiltInTools = () => toolMigrationBridge.initialize(); 