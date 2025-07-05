/**
 * Enhanced Tool Registry with Namespaces and Validation
 * 
 * Provides a more robust tool management system with:
 * - Tool namespace support
 * - Schema validation
 * - Trust levels
 * - Tool conflict resolution
 */

import { logger } from '../utils/logger.js';
import type { ToolDefinition, ToolHandler, ToolResult, InternalToolResult, ToolInputParameters } from './index.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import Ajv from 'ajv';

/**
 * Trust level for tools
 */
export enum ToolTrustLevel {
  /**
   * Fully trusted tools that don't require confirmation
   */
  TRUSTED = 'trusted',
  
  /**
   * Tools that require confirmation on first use only
   */
  CONFIRM_ONCE = 'confirm_once',
  
  /**
   * Tools that require confirmation on every use
   */
  CONFIRM_ALWAYS = 'confirm_always'
}

/**
 * Enhanced tool registry configuration
 */
export interface EnhancedToolRegistryConfig {
  /**
   * Enable schema validation
   */
  enableSchemaValidation?: boolean;
  
  /**
   * Default trust level for tools
   */
  defaultTrustLevel?: ToolTrustLevel;
  
  /**
   * Whether to allow tool overrides
   */
  allowToolOverrides?: boolean;
}

/**
 * Tool registration options
 */
export interface ToolRegistrationOptions {
  /**
   * Tool namespace
   */
  namespace?: string;
  
  /**
   * Trust level for the tool
   */
  trustLevel?: ToolTrustLevel;
  
  /**
   * Whether to override existing tool with same name
   */
  override?: boolean;
}

/**
 * Tool with additional metadata
 */
export interface ToolWithMetadata {
  definition: ToolDefinition;
  handler: ToolHandler;
  namespace: string;
  trustLevel: ToolTrustLevel;
  fullName: string;
}

/**
 * Tool parameters interface
 */
export interface ToolParameters {
  [key: string]: unknown;
}

/**
 * Tool execution progress interface
 */
export interface ToolProgress {
  [key: string]: unknown;
}

/**
 * Enhanced tool registry with namespace support and validation
 */
export class EnhancedToolRegistry {
  private readonly tools = new Map<string, ToolWithMetadata>();
  private readonly executionStats = new Map<string, { count: number; successCount: number; totalTime: number }>();
  private readonly trustedTools = new Set<string>();
  private readonly validator: InstanceType<typeof Ajv>;
  
  constructor(private readonly config: EnhancedToolRegistryConfig = {}) {
    // Set default config values
    this.config = {
      enableSchemaValidation: true,
      defaultTrustLevel: ToolTrustLevel.CONFIRM_ONCE,
      allowToolOverrides: false,
      ...config
    };
    
    // Initialize JSON schema validator
    this.validator = new Ajv({
      allErrors: true,
      verbose: true
    });
  }
  
  /**
   * Register a tool
   */
  register(
    definition: ToolDefinition,
    handler: ToolHandler,
    options: ToolRegistrationOptions = {}
  ): void {
    const namespace = options.namespace || 'default';
    const fullName = this.getFullToolName(namespace, definition.name);
    
    // Check for existing tool with same name
    if (this.tools.has(fullName) && !options.override && !this.config.allowToolOverrides) {
      const error = `Tool with name "${fullName}" is already registered. Use override option to replace it.`;
      logger.warn(error);
      throw createUserError(error, { category: ErrorCategory.INVALID_OPERATION });
    }
    
    // Validate tool definition schema if enabled
    if (this.config.enableSchemaValidation) {
      this.validateToolDefinition(definition);
    }
    
    // Create tool metadata
    const tool: ToolWithMetadata = {
      definition,
      handler,
      namespace,
      trustLevel: options.trustLevel || this.config.defaultTrustLevel!,
      fullName
    };
    
    // Register the tool
    this.tools.set(fullName, tool);
    
    // Initialize stats
    if (!this.executionStats.has(fullName)) {
      this.executionStats.set(fullName, {
        count: 0,
        successCount: 0,
        totalTime: 0
      });
    }
    
    logger.info(`Registered tool: ${fullName}`);
  }
  
  /**
   * Get full tool name with namespace
   */
  private getFullToolName(namespace: string, name: string): string {
    return namespace === 'default' ? name : `${namespace}__${name}`;
  }
  
  /**
   * Validate tool definition schema
   */
  private validateToolDefinition(definition: ToolDefinition): void {
    // Check required fields
    if (!definition.name) {
      throw createUserError('Tool definition is missing required "name" field', {
        category: ErrorCategory.VALIDATION
      });
    }
    
    if (!definition.description) {
      throw createUserError('Tool definition is missing required "description" field', {
        category: ErrorCategory.VALIDATION
      });
    }
    
    if (!definition.input_schema) {
      throw createUserError('Tool definition is missing required "input_schema" field', {
        category: ErrorCategory.VALIDATION
      });
    }
    
    // Ensure input_schema is properly formatted
    if (
      typeof definition.input_schema !== 'object' ||
      definition.input_schema.type !== 'object' ||
      !definition.input_schema.properties
    ) {
      throw createUserError('Tool input_schema must be a valid JSON Schema object', {
        category: ErrorCategory.VALIDATION
      });
    }
  }
  
  /**
   * Get all registered tools
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }
  
  /**
   * Get all registered tools with metadata
   */
  getAllWithMetadata(): ToolWithMetadata[] {
    return Array.from(this.tools.values());
  }
  
  /**
   * Get all tools in a specific namespace
   */
  getByNamespace(namespace: string): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.namespace === namespace)
      .map(tool => tool.definition);
  }
  
  /**
   * Get tool by name
   */
  get(name: string): { definition: ToolDefinition; handler: ToolHandler } | undefined {
    const tool = this.tools.get(name);
    if (!tool) {return undefined;}
    
    return {
      definition: tool.definition,
      handler: tool.handler
    };
  }
  
  /**
   * Get tool by name with metadata
   */
  getWithMetadata(name: string): ToolWithMetadata | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Check if a tool requires confirmation based on trust level
   */
  requiresConfirmation(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) {return true;} // Unknown tools require confirmation
    
    if (tool.trustLevel === ToolTrustLevel.TRUSTED) {
      return false;
    }
    
    if (tool.trustLevel === ToolTrustLevel.CONFIRM_ONCE && this.trustedTools.has(name)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Mark a tool as trusted (for CONFIRM_ONCE tools)
   */
  markAsTrusted(name: string): void {
    this.trustedTools.add(name);
  }
  
  /**
   * Validate tool parameters against schema
   */
  validateParameters(toolName: string, parameters: ToolParameters): { valid: boolean; errors?: string[] } {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { valid: false, errors: [`Tool ${toolName} not found`] };
    }
    
    try {
      // Create JSON Schema validator for the tool's input schema
      const validate = this.validator.compile(tool.definition.input_schema);
      
      // Validate parameters against schema
      const valid = validate(parameters);
      
      if (!valid) {
        const errors = (validate.errors || []).map((err: { instancePath?: string; message?: string }) => 
          `${err.instancePath || ''} ${err.message || 'validation error'}`);
        
        return { valid: false, errors };
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message || 'Unknown validation error']
      };
    }
  }
  
  /**
   * Execute a tool
   */
  async execute(
    toolName: string,
    parameters: ToolParameters,
    toolId: string,
    feedbackCallbacks?: {
      onStart?: (operation: string, target?: string, message?: string) => string;
      onProgress?: (id: string, progress: ToolProgress) => void;
      onComplete?: (id: string, result: InternalToolResult) => void;
    }
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      const error = `Tool ${toolName} not found`;
      logger.error(error);
      return {
        tool_use_id: toolId,
        content: error,
        is_error: true,
      };
    }
    
    // Update execution stats
    const stats = this.executionStats.get(toolName)!;
    stats.count++;
    
    try {
      // Validate parameters if schema validation is enabled
      if (this.config.enableSchemaValidation) {
        const validationResult = this.validateParameters(toolName, parameters);
        if (!validationResult.valid) {
          const errorMessage = `Invalid parameters for ${toolName}: ${validationResult.errors?.join(', ')}`;
          return {
            tool_use_id: toolId,
            content: errorMessage,
            is_error: true,
          };
        }
      }
      
      // Execute tool with feedback support
      const convertedParameters = Object.fromEntries(
        Object.entries(parameters).map(([key, value]) => [
          key,
          value === null || value === undefined ? value :
          typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value :
          String(value)
        ])
      ) as ToolInputParameters;
      
      const result = await tool.handler(convertedParameters, feedbackCallbacks);
      const executionTime = Date.now() - startTime;
      
      // Update stats
      if (result.success) {
        stats.successCount++;
      }
      stats.totalTime += executionTime;
      
      // Add execution time to metadata
      if (result.metadata) {
        result.metadata.executionTime = executionTime;
      } else {
        result.metadata = { executionTime };
      }
      
      if (result.success) {
        return {
          tool_use_id: toolId,
          content: JSON.stringify(result.result || ''),
        };
      } else {
        return {
          tool_use_id: toolId,
          content: result.error || 'Tool execution failed',
          is_error: true,
        };
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;
      stats.totalTime += executionTime;
      
      logger.error(`Error executing tool ${toolName}:`, error);
      return {
        tool_use_id: toolId,
        content: error instanceof Error ? error.message : String(error),
        is_error: true,
      };
    }
  }
  
  /**
   * Get execution statistics for all tools
   */
  getStats(): Record<string, { count: number; successRate: number; avgTime: number }> {
    const stats: Record<string, { count: number; successRate: number; avgTime: number }> = {};
    
    for (const [name, data] of this.executionStats.entries()) {
      stats[name] = {
        count: data.count,
        successRate: data.count > 0 ? (data.successCount / data.count) * 100 : 0,
        avgTime: data.count > 0 ? data.totalTime / data.count : 0
      };
    }
    
    return stats;
  }
  
  /**
   * Get execution statistics for tools in a specific namespace
   */
  getStatsByNamespace(namespace: string): Record<string, { count: number; successRate: number; avgTime: number }> {
    const stats: Record<string, { count: number; successRate: number; avgTime: number }> = {};
    
    for (const [name, data] of this.executionStats.entries()) {
      const tool = this.tools.get(name);
      if (tool && tool.namespace === namespace) {
        stats[name] = {
          count: data.count,
          successRate: data.count > 0 ? (data.successCount / data.count) * 100 : 0,
          avgTime: data.count > 0 ? data.totalTime / data.count : 0
        };
      }
    }
    
    return stats;
  }
  
  /**
   * Clear execution statistics
   */
  clearStats(): void {
    for (const stats of this.executionStats.values()) {
      stats.count = 0;
      stats.successCount = 0;
      stats.totalTime = 0;
    }
  }
  
  /**
   * Get unique namespaces
   */
  getNamespaces(): string[] {
    const namespaces = new Set<string>();
    for (const tool of this.tools.values()) {
      namespaces.add(tool.namespace);
    }
    return Array.from(namespaces);
  }
}

// Create the enhanced tool registry instance
export const enhancedToolRegistry = new EnhancedToolRegistry();

/**
 * Register a tool with the enhanced registry
 */
export function registerTool(
  definition: ToolDefinition,
  handler: ToolHandler,
  options?: ToolRegistrationOptions
): void {
  enhancedToolRegistry.register(definition, handler, options);
}

/**
 * Get all tools from the enhanced registry
 */
export function getAllEnhancedTools(): ToolDefinition[] {
  return enhancedToolRegistry.getAll();
}

/**
 * Execute a tool from the enhanced registry
 */
export async function executeEnhancedTool(
  toolName: string,
  parameters: ToolParameters,
  toolId: string,
  feedbackCallbacks?: Parameters<typeof enhancedToolRegistry.execute>[3]
): Promise<ToolResult> {
  return enhancedToolRegistry.execute(toolName, parameters, toolId, feedbackCallbacks);
}

/**
 * Get statistics for all tools in the enhanced registry
 */
export function getEnhancedToolStats(): Record<string, { count: number; successRate: number; avgTime: number }> {
  return enhancedToolRegistry.getStats();
}

/**
 * Clear statistics for all tools in the enhanced registry
 */
export function clearEnhancedToolStats(): void {
  enhancedToolRegistry.clearStats();
}