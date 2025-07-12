/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * New Architecture Tool System - No Legacy Dependencies
 * 
 * This module provides a clean interface to the new architecture tool system
 * via the migration bridge, completely removing legacy tool registry code.
 */

import { toolMigrationBridge } from '../services/tool-migration-bridge.js';
import { logger } from '../utils/logger.js';

// Re-export essential types for backward compatibility
export interface ToolInputParameters {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ToolSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolSchemaProperty;
  properties?: Record<string, ToolSchemaProperty>;
  required?: string[];
  default?: string | number | boolean | null;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: ToolInputParameters;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, ToolSchemaProperty>;
    required?: string[];
  };
}

export interface InternalToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
  metadata?: {
    linesAdded?: number;
    linesRemoved?: number;
    linesModified?: number;
    filesAffected?: number;
    outputSize?: number;
    executionTime?: number;
    checkpointId?: string;
    checkpointCreated?: boolean;
  };
}

export type ToolHandler = (
  input: ToolInputParameters,
  feedback?: {
    onStart?: (operation: string, target?: string, message?: string) => string;
    onProgress?: (id: string, progress: Partial<any>) => void;
    onComplete?: (id: string, result: InternalToolResult) => void;
  }
) => Promise<InternalToolResult>;

/**
 * New Architecture Tool Interface
 * 
 * All methods delegate to the tool migration bridge which uses
 * the new architecture exclusively (legacy fallback disabled).
 */
class NewArchitectureToolSystem {
  private initialized = false;

  /**
   * Initialize the new architecture tool system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Initialize migration bridge with new architecture only
      await toolMigrationBridge.initialize();
      this.initialized = true;
      
      const toolCount = toolMigrationBridge.getAllTools().length;
      logger.info(`🚀 New architecture tool system initialized with ${toolCount} tools`);
    } catch (error) {
      logger.error('❌ Failed to initialize new architecture tool system:', error);
      throw error;
    }
  }

  /**
   * Get all available tools from new architecture
   */
  getAll(): ToolDefinition[] {
    return toolMigrationBridge.getAllTools();
  }

  /**
   * Get tool by name from new architecture
   */
  get(name: string): { definition: ToolDefinition; handler: ToolHandler } | undefined {
    return toolMigrationBridge.getTool(name);
  }

  /**
   * Execute a tool using new architecture
   */
  async execute(
    toolUse: ToolUseBlock,
    feedbackCallbacks?: {
      onStart?: (operation: string, target?: string, message?: string) => string;
      onProgress?: (id: string, progress: Partial<any>) => void;
      onComplete?: (id: string, result: InternalToolResult) => void;
    }
  ): Promise<ToolResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await toolMigrationBridge.executeTool(toolUse);
    } catch (error) {
      logger.error(`❌ Tool execution failed for "${toolUse.name}":`, error);
      return {
        tool_use_id: toolUse.id,
        content: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
        is_error: true
      };
    }
  }

  /**
   * Get execution statistics from new architecture
   */
  getStats(): Record<string, { count: number; successRate: number; avgTime: number }> {
    return toolMigrationBridge.getStats();
  }

  /**
   * Clear execution statistics
   */
  clearStats(): void {
    toolMigrationBridge.clearStats();
  }
}

// Global new architecture tool system instance
const newArchitectureToolSystem = new NewArchitectureToolSystem();

/**
 * Register built-in tools (now handled by migration bridge initialization)
 */
export async function registerBuiltInTools(): Promise<void> {
  // Migration bridge handles all tool registration in new architecture
  await newArchitectureToolSystem.initialize();
  
  const toolCount = newArchitectureToolSystem.getAll().length;
  logger.info(`✅ Registered ${toolCount} tools via new architecture`);
}

// Export the new architecture tool system with legacy-compatible interface
export const toolRegistry = newArchitectureToolSystem;
export const getToolRegistry = () => newArchitectureToolSystem;

export const getAllTools = async () => {
  await newArchitectureToolSystem.initialize();
  return newArchitectureToolSystem.getAll();
};

export const executeTool = async (
  toolUse: ToolUseBlock, 
  feedbackCallbacks?: Parameters<typeof newArchitectureToolSystem.execute>[1]
) => {
  await newArchitectureToolSystem.initialize();
  return newArchitectureToolSystem.execute(toolUse, feedbackCallbacks);
};

export const getToolStats = () => newArchitectureToolSystem.getStats();
export const clearToolStats = () => newArchitectureToolSystem.clearStats();

// Legacy compatibility notice
logger.info('🔄 Tool system now using NEW ARCHITECTURE ONLY - Legacy system eliminated!');