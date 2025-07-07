/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import {
  Tool,
  ToolCall,
  ToolCallRequest,
  ToolConfirmationDetails,
  ToolConfirmationOutcome,
  ToolMetadata,
  ToolResult,
  ToolExecutionOptions,
  ToolProgress,
  ToolSystemConfig
} from './tool-interfaces';
import { MCPServerConfig } from '../../../tools/mcp-client';

/**
 * Interface for validating tool parameters
 */
export interface ValidationService {
  /**
   * Validate a value against a JSON Schema
   */
  validateAgainstSchema(value: unknown, schema: Record<string, unknown>): ValidationResult;
  
  /**
   * Add a custom validator function
   */
  addCustomValidator(name: string, validatorFn: (value: unknown) => string | null): void;
  
  /**
   * Clear the validation cache
   */
  clearCache(): void;
}

/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /**
   * Whether the validation succeeded
   */
  valid: boolean;
  
  /**
   * Error messages if validation failed
   */
  errors?: string[];
}

/**
 * Service for registering and discovering tools
 */
export interface ToolRegistryService {
  /**
   * Register a tool with an optional namespace
   */
  registerTool(tool: Tool, namespace?: string): void;
  
  /**
   * Get a tool by name and optional namespace
   */
  getTool(name: string, namespace?: string): Tool | undefined;
  
  /**
   * Get all registered tools
   */
  getAllTools(): Tool[];
  
  /**
   * Get tools by namespace
   */
  getToolsByNamespace(namespace: string): Tool[];
  
  /**
   * Get all namespaces
   */
  getNamespaces(): string[];
}

/**
 * Service for discovering tools from various sources
 */
export interface ToolDiscoveryService {
  /**
   * Discover MCP tools from configured servers
   */
  discoverMcpTools(): Promise<Tool[]>;
  
  /**
   * Discover project-specific tools
   */
  discoverProjectTools(): Promise<Tool[]>;
  
  /**
   * Validate a discovered tool definition
   */
  validateDiscoveredTool(toolDef: unknown): boolean;
  
  /**
   * Refresh all tool discoveries
   */
  refreshAllTools(): Promise<void>;
}

/**
 * Service for handling tool execution scheduling
 */
export interface ToolSchedulerService {
  /**
   * Schedule tool calls for execution
   */
  schedule(request: ToolCallRequest | ToolCallRequest[], signal: AbortSignal): Promise<void>;
  
  /**
   * Handle confirmation response for a tool call
   */
  handleConfirmation(callId: string, outcome: ToolConfirmationOutcome): Promise<void>;
  
  /**
   * Cancel a tool call by ID
   */
  cancelToolCall(callId: string): void;
  
  /**
   * Get all active tool calls
   */
  getActiveToolCalls(): ToolCall[];
}

/**
 * Callbacks for the tool scheduler service
 */
export interface ToolSchedulerCallbacks {
  /**
   * Called when tool calls are updated
   */
  onToolCallsUpdate?: (calls: ToolCall[]) => void;
  
  /**
   * Called when all tool calls are complete
   */
  onAllToolCallsComplete?: (calls: ToolCall[]) => void;
}

/**
 * Service for orchestrating the entire tool system
 */
export interface ToolOrchestrationService {
  /**
   * Execute one or more tools
   */
  executeTools(requests: ToolCallRequest | ToolCallRequest[], signal: AbortSignal): Promise<void>;
  
  /**
   * Register available tools
   */
  registerTools(): void;
  
  /**
   * Get a tool by name and namespace
   */
  getTool(name: string, namespace?: string): Tool | undefined;
  
  /**
   * Get all registered tools
   */
  getAllTools(): Tool[];
  
  /**
   * Configure the tool system
   */
  configure(config: ToolSystemConfig): void;
}



/**
 * Service for handling tool execution confirmations
 */
export interface ConfirmationService {
  /**
   * Request confirmation from the user
   */
  requestConfirmation(details: ToolConfirmationDetails): Promise<ToolConfirmationOutcome>;
  
  /**
   * Check if a tool is trusted
   */
  isTrusted(toolName: string, namespace?: string): boolean;
  
  /**
   * Mark a tool as trusted
   */
  markAsTrusted(toolName: string, namespace?: string): void;
}

/**
 * Service for executing individual tools
 */
export interface ToolExecutionService {
  /**
   * Execute a tool with parameters
   */
  execute(
    tool: Tool, 
    params: unknown, 
    signal: AbortSignal, 
    feedbackCallback?: FeedbackCallback
  ): Promise<ToolResult>;
  
  /**
   * Get execution statistics
   */
  getExecutionStats(): ToolExecutionStats;
  
  /**
   * Clear execution statistics
   */
  clearStats(): void;
}

/**
 * Callback for execution progress feedback
 */
export type FeedbackCallback = (progress: ToolProgress) => void;

/**
 * Statistics about tool executions
 */
export interface ToolExecutionStats {
  /**
   * Total executions
   */
  totalExecutions: number;
  
  /**
   * Successful executions
   */
  successfulExecutions: number;
  
  /**
   * Failed executions
   */
  failedExecutions: number;
  
  /**
   * Average execution time in milliseconds
   */
  averageExecutionTime: number;
  
  /**
   * Statistics by tool name
   */
  byTool: Record<string, {
    /**
     * Executions of this tool
     */
    executions: number;
    
    /**
     * Successful executions of this tool
     */
    successful: number;
    
    /**
     * Failed executions of this tool
     */
    failed: number;
    
    /**
     * Average execution time for this tool
     */
    averageTime: number;
  }>;
}

/**
 * Service for creating safety checkpoints before destructive operations
 */
export interface CheckpointService {
  /**
   * Create a checkpoint before risky operations
   */
  createCheckpoint(options: CheckpointOptions): Promise<CheckpointMetadata>;
  
  /**
   * Restore from a checkpoint
   */
  restoreCheckpoint(id: string): Promise<boolean>;
  
  /**
   * Check if a checkpoint should be created
   */
  shouldCreateCheckpoint(toolName: string, filePaths: string[]): boolean;
  
  /**
   * Get all checkpoints
   */
  getCheckpoints(): CheckpointInfo[];
}

/**
 * Options for creating a checkpoint
 */
export interface CheckpointOptions {
  /**
   * Description of the checkpoint
   */
  description: string;
  
  /**
   * Files to include in the checkpoint
   */
  files?: string[];
  
  /**
   * Whether to include all modified files
   */
  includeAllModified?: boolean;
  
  /**
   * Expiration time in milliseconds
   */
  expiresIn?: number;
}

/**
 * Metadata about a created checkpoint
 */
export interface CheckpointMetadata {
  /**
   * Unique ID of the checkpoint
   */
  id: string;
  
  /**
   * Description of the checkpoint
   */
  description: string;
  
  /**
   * When the checkpoint was created
   */
  createdAt: Date;
  
  /**
   * When the checkpoint expires
   */
  expiresAt?: Date;
  
  /**
   * Files included in the checkpoint
   */
  files: string[];

  /**
   * Git branch name for the checkpoint
   */
  branch: string;
  
  /**
   * Original branch name when checkpoint was created
   */
  originalBranch: string;
}

/**
 * Information about an available checkpoint
 */
export interface CheckpointInfo {
  /**
   * Unique ID of the checkpoint
   */
  id: string;
  
  /**
   * Description of the checkpoint
   */
  description: string;
  
  /**
   * When the checkpoint was created
   */
  createdAt: Date;
  
  /**
   * When the checkpoint expires
   */
  expiresAt?: Date;
  
  /**
   * Whether the checkpoint has expired
   */
  expired: boolean;
}