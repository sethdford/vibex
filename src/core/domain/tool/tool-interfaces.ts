/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { MCPServerConfig } from '../../../tools/mcp-client';

/**
 * Core domain interfaces for the tool system.
 * 
 * These interfaces define the primary abstractions for tools,
 * following clean architecture principles. They form the 
 * foundation of the tool service layer.
 */

/**
 * Represents a tool that can be executed.
 */
export interface Tool {
  /**
   * Unique name of the tool
   */
  name: string;

  /**
   * Human-readable description of the tool
   */
  description: string;

  /**
   * JSON Schema for validating parameters
   */
  parameters: Record<string, unknown>;

  /**
   * Execute the tool with the given parameters
   */
  execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult>;

  /**
   * Validate parameters against the schema
   * @returns null if valid, error message if invalid
   */
  validateParams(params: unknown): string | null;

  /**
   * Check if this tool execution requires confirmation
   * @returns null if no confirmation needed, or confirmation details
   */
  shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null>;
  
  /**
   * Get metadata about this tool
   */
  getMetadata(): ToolMetadata;
}

/**
 * Options for tool execution
 */
export interface ToolExecutionOptions {
  /**
   * Signal for cancelling the execution
   */
  signal?: AbortSignal;

  /**
   * Callback for progress updates
   */
  onProgress?: (progress: ToolProgress) => void;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to skip confirmation if normally required
   */
  skipConfirmation?: boolean;

  /**
   * Extra context for the execution
   */
  context?: Record<string, unknown>;

  /**
   * Call ID for tracking
   */
  callId?: string;
}

/**
 * Result of a tool execution
 */
export interface ToolResult {
  /**
   * Call ID for tracking
   */
  callId: string;

  /**
   * Result data
   */
  data?: unknown;

  /**
   * Error if execution failed
   */
  error?: Error;

  /**
   * Whether the execution was successful
   */
  success: boolean;

  /**
   * Execution time in milliseconds
   */
  executionTime?: number;

  /**
   * Additional metadata about the execution
   */
  metadata?: Record<string, unknown>;
}

/**
 * Progress update during tool execution
 */
export interface ToolProgress {
  /**
   * Percentage complete (0-100)
   */
  percentage?: number;

  /**
   * Current status message
   */
  message?: string;

  /**
   * Current step number
   */
  step?: number;

  /**
   * Total number of steps
   */
  totalSteps?: number;
}

/**
 * Metadata about a tool
 */
export interface ToolMetadata {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Tool namespace/category
   */
  namespace?: string;

  /**
   * Parameter schema
   */
  parameters: Record<string, unknown>;

  /**
   * Tool version
   */
  version?: string;

  /**
   * Whether the tool is considered "dangerous" (makes system changes)
   */
  dangerous?: boolean;

  /**
   * Whether the tool requires confirmation before execution
   */
  requiresConfirmation?: boolean;

  /**
   * Tags for categorization
   */
  tags?: string[];

  /**
   * Example usages
   */
  examples?: ToolExample[];

  /**
   * Additional metadata
   */
  [key: string]: unknown;
}

/**
 * Example usage of a tool
 */
export interface ToolExample {
  /**
   * Example name/description
   */
  name: string;

  /**
   * Example parameters
   */
  params: Record<string, unknown>;

  /**
   * Example result
   */
  result?: unknown;

  /**
   * Example description
   */
  description?: string;
}

/**
 * Details for tool execution confirmation
 */
export interface ToolConfirmationDetails {
  /**
   * Title for confirmation prompt
   */
  title: string;

  /**
   * Detailed description of what the tool will do
   */
  description: string;

  /**
   * Type of confirmation needed
   */
  type: 'info' | 'warning' | 'danger' | 'edit' | 'exec';

  /**
   * Parameters that will be used
   */
  params: Record<string, unknown>;

  /**
   * Display options for confirmation UI
   */
  displayOptions?: {
    /**
     * Syntax highlighting language for code
     */
    language?: string;

    /**
     * Whether to show detailed diff
     */
    showDiff?: boolean;

    /**
     * Whether to allow parameter editing
     */
    allowEdit?: boolean;
  };
  
  /**
   * Callback when confirmation is received
   */
  onConfirm?: (outcome: ToolConfirmationOutcome) => void;
}

/**
 * Outcome of a tool confirmation prompt
 */
export enum ToolConfirmationOutcome {
  /**
   * User approved the execution once
   */
  ProceedOnce = 'proceed_once',

  /**
   * User approved and wants to trust this tool always
   */
  ProceedAlways = 'proceed_always',

  /**
   * User approved and wants to trust all tools from this server always
   */
  ProceedAlwaysServer = 'proceed_always_server',

  /**
   * User modified parameters and approved
   */
  ModifiedAndApproved = 'modified_and_approved',

  /**
   * User cancelled the execution
   */
  Cancelled = 'cancelled'
}

/**
 * Configuration for the overall tool system.
 */
export interface ToolSystemConfig {
  git?: {
    enableCheckpoints?: boolean;
    checkpointBranch?: string;
  };
  confirmation?: {
    requireForDangerous?: boolean;
    trustedTools?: string[];
  };
  execution?: {
    defaultTimeout?: number;
    maxParallelExecutions?: number;
  };
  mcp?: {
    servers?: MCPServerConfig[];
    autoTrust?: boolean;
    connectionTimeout?: number;
    tokens?: Record<string, string>;
  };
  [key: string]: unknown; // Add index signature
}

/**
 * Represents a request to execute a tool
 */
export interface ToolCallRequest {
  /**
   * Unique call ID
   */
  callId: string;

  /**
   * Tool name to execute
   */
  name: string;

  /**
   * Optional tool namespace
   */
  namespace?: string;

  /**
   * Parameters to pass to the tool
   */
  params: unknown;
  
  /**
   * Execution options
   */
  options?: ToolExecutionOptions;
}

/**
 * Represents a tool call in progress
 */
export interface ToolCall {
  /**
   * The original request
   */
  request: ToolCallRequest;
  
  /**
   * The current status of the call
   */
  status: 'scheduled' | 'validating' | 'awaiting_approval' | 'executing' | 'completed' | 'error';
  
  /**
   * The tool being called (if found)
   */
  tool?: Tool;
  
  /**
   * The response (if completed or error)
   */
  response?: ToolResult;
  
  /**
   * Confirmation details (if awaiting approval)
   */
  confirmationDetails?: ToolConfirmationDetails;
  
  /**
   * When the tool call was started
   */
  startTime: number;
  
  /**
   * When the tool call completed (if done)
   */
  endTime?: number;
}

/**
 * Base class for implementing tools
 */
export abstract class BaseTool implements Tool {
  /**
   * Tool name
   */
  readonly name: string;

  /**
   * Tool description
   */
  readonly description: string;

  /**
   * Parameter schema
   */
  readonly parameters: Record<string, unknown>;

  /**
   * Additional metadata
   */
  protected metadata: Partial<ToolMetadata>;

  /**
   * Constructor
   */
  constructor(
    name: string, 
    description: string, 
    parameters: Record<string, unknown>,
    metadata: Partial<ToolMetadata> = {}
  ) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.metadata = {
      ...metadata,
      name,
      description,
      parameters
    };
  }

  /**
   * Execute the tool with the given parameters
   */
  abstract execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult>;

  /**
   * Validate parameters against the schema
   * Default implementation uses JSON Schema validation
   * Override for custom validation
   */
  validateParams(params: unknown): string | null {
    // Default implementation
    // Should be overridden with actual validation logic
    return null;
  }

  /**
   * Check if this tool execution requires confirmation
   * Default implementation returns null (no confirmation needed)
   * Override for tools that need confirmation
   */
  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    // Default implementation
    if (this.metadata.requiresConfirmation || this.metadata.dangerous) {
      return {
        title: `Confirm execution of ${this.name}`,
        description: this.description,
        type: this.metadata.dangerous ? 'danger' : 'info',
        params: params as Record<string, unknown>
      };
    }
    return null;
  }

  /**
   * Get metadata about this tool
   */
  getMetadata(): ToolMetadata {
    return this.metadata as ToolMetadata;
  }
}

/**
 * A factory for creating tool instances
 */
export interface ToolFactory {
  /**
   * Create a tool from a configuration
   */
  createTool(config: ToolConfig): Tool;
  
  /**
   * Create built-in tools
   */
  createBuiltInTools(): Record<string, Tool[]>;
}

/**
 * Configuration for creating a tool
 */
export interface ToolConfig {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool description
   */
  description: string;
  
  /**
   * Parameter schema
   */
  parameters: Record<string, unknown>;
  
  /**
   * Handler function
   */
  handler: (params: unknown, options?: ToolExecutionOptions) => Promise<unknown>;
  
  /**
   * Additional metadata
   */
  metadata?: Partial<ToolMetadata>;
}