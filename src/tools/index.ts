/**
 * Tool Registry and Built-in Tools
 * 
 * This module manages the registration and execution of tools available to the AI,
 * providing a centralized system for tool management with live feedback capabilities.
 * 
 * UPDATED: Now uses the Tool Migration Bridge for new architecture integration
 */

import { logger } from '../utils/logger.js';
import type { ToolOperation, LiveFeedbackData } from '../ui/components/LiveToolFeedback.js';
import { GitService } from '../services/git-service.js';
import { gitCheckpointing } from '../services/git-checkpointing-service.js';
import { ToolMigrationBridge } from '../services/tool-migration-bridge.js';

/**
 * Tool input parameters interface
 */
export interface ToolInputParameters {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Tool schema property definition
 */
export interface ToolSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolSchemaProperty;
  properties?: Record<string, ToolSchemaProperty>;
  required?: string[];
  default?: string | number | boolean | null;
}

/**
 * Tool use block interface (from Claude API)
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: ToolInputParameters;
}

/**
 * Tool result interface
 */
export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/**
 * Tool definition interface
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, ToolSchemaProperty>;
    required?: string[];
  };
}

/**
 * Internal tool result interface
 */
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

/**
 * Tool handler function with feedback support
 */
export type ToolHandler = (
  input: ToolInputParameters,
  feedback?: {
    onStart?: (operation: string, target?: string, message?: string) => string;
    onProgress?: (id: string, progress: Partial<LiveFeedbackData>) => void;
    onComplete?: (id: string, result: InternalToolResult) => void;
  }
) => Promise<InternalToolResult>;

/**
 * Tool registry for managing available tools
 * UPDATED: Now delegates to the migration bridge for enhanced functionality
 */
class ToolRegistry {
  private readonly tools = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();
  private readonly executionStats = new Map<string, { count: number; successCount: number; totalTime: number }>();
  private migrationBridge: ToolMigrationBridge;
  private initialized = false;

  constructor() {
    // Initialize migration bridge with legacy fallback enabled
    this.migrationBridge = new ToolMigrationBridge({
      useNewArchitecture: true,
      enableLegacyFallback: true,
      enableEnhancedFeatures: true
    });
  }

  /**
   * Initialize the registry and migration bridge
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.migrationBridge.initialize();
      this.initialized = true;
      logger.info('✅ Legacy tool registry updated with migration bridge');
    } catch (error) {
      logger.error('❌ Failed to initialize migration bridge in legacy registry:', error);
      // Continue with legacy-only mode
    }
  }

  /**
   * Register a tool (legacy compatibility)
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
    
    // Initialize stats
    if (!this.executionStats.has(definition.name)) {
      this.executionStats.set(definition.name, {
        count: 0,
        successCount: 0,
        totalTime: 0
      });
    }
    
    logger.info(`Registered legacy tool: ${definition.name}`);
  }

  /**
   * Get all registered tools (enhanced with migration bridge)
   */
  getAll(): ToolDefinition[] {
    if (!this.initialized) {
      // Return only legacy tools if not initialized
      return Array.from(this.tools.values()).map(tool => tool.definition);
    }

    try {
      // Get tools from migration bridge (includes new architecture + legacy)
      return this.migrationBridge.getAllTools();
    } catch (error) {
      logger.error('Failed to get tools from migration bridge, falling back to legacy:', error);
      return Array.from(this.tools.values()).map(tool => tool.definition);
    }
  }

  /**
   * Get tool by name (enhanced with migration bridge)
   */
  get(name: string): { definition: ToolDefinition; handler: ToolHandler } | undefined {
    if (!this.initialized) {
      // Return only legacy tool if not initialized
      return this.tools.get(name);
    }

    try {
      // Try migration bridge first
      const bridgeTool = this.migrationBridge.getTool(name);
      if (bridgeTool) {
        return bridgeTool;
      }
    } catch (error) {
      logger.error(`Failed to get tool "${name}" from migration bridge:`, error);
    }

    // Fall back to legacy
    return this.tools.get(name);
  }

  /**
   * Execute a tool with live feedback support and automatic checkpointing
   * UPDATED: Now uses migration bridge for enhanced execution
   */
  async execute(
    toolUse: ToolUseBlock,
    feedbackCallbacks?: {
      onStart?: (operation: string, target?: string, message?: string) => string;
      onProgress?: (id: string, progress: Partial<LiveFeedbackData>) => void;
      onComplete?: (id: string, result: InternalToolResult) => void;
    }
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // Ensure migration bridge is initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Try migration bridge execution first
    if (this.initialized) {
      try {
        const result = await this.migrationBridge.executeTool(toolUse);
        
        // Update legacy stats for compatibility
        this.updateExecutionStats(toolUse.name, startTime, !result.is_error);
        
        // Convert result to include internal metadata if needed
        const internalResult: InternalToolResult = {
          success: !result.is_error,
          result: result.content,
          error: result.is_error ? result.content : undefined,
          metadata: {
            executionTime: Date.now() - startTime
          }
        };

        // Call completion callback
        if (feedbackCallbacks?.onComplete) {
          const feedbackId = feedbackCallbacks.onStart?.(toolUse.name as ToolOperation, '', 'Executing...');
          if (feedbackId) {
            feedbackCallbacks.onComplete(feedbackId, internalResult);
          }
        }

        return result;
      } catch (error) {
        logger.error(`Migration bridge execution failed for "${toolUse.name}":`, error);
        // Fall through to legacy execution
      }
    }

    // Legacy execution path
    const tool = this.tools.get(toolUse.name);
    
    if (!tool) {
      const error = `Tool ${toolUse.name} not found`;
      logger.error(error);
      return {
        tool_use_id: toolUse.id,
        content: error,
        is_error: true,
      };
    }

    // Update execution stats
    const stats = this.executionStats.get(toolUse.name)!;
    stats.count++;

    try {
      // ENHANCED CHECKPOINTING: Create comprehensive checkpoint before dangerous operations
      const requiresCheckpoint = this.isDestructiveOperation(toolUse.name, toolUse.input);
      let checkpointMetadata: any = undefined;
      
      if (requiresCheckpoint) {
        try {
          // Extract file paths that will be modified
          const filePaths = this.extractFilePaths(toolUse.name, toolUse.input);
          
          if (filePaths.length > 0) {
            // Initialize checkpointing service if needed
            await gitCheckpointing.initialize();
            
            // Check if automatic checkpointing should be performed
            const shouldCheckpoint = gitCheckpointing.shouldCreateCheckpoint(toolUse.name, filePaths);
            
            if (shouldCheckpoint) {
              // Update progress with checkpoint info
              if (feedbackCallbacks?.onProgress) {
                const feedbackId = feedbackCallbacks.onStart?.(toolUse.name as ToolOperation, '', 'Creating safety checkpoint...');
                if (feedbackId) {
                  feedbackCallbacks.onProgress(feedbackId, {
                    status: 'processing',
                    message: `Creating checkpoint for ${filePaths.length} file(s)...`
                  });
                }
              }
              
              // Create comprehensive checkpoint with conversation state
              checkpointMetadata = await gitCheckpointing.createCheckpoint({
                name: `Before ${toolUse.name} operation`,
                description: `Auto-checkpoint before ${toolUse.name} modifying: ${filePaths.join(', ')}`,
                filePaths,
                triggerOperation: toolUse.name,
                saveConversation: true,
                custom: {
                  toolInput: JSON.stringify(toolUse.input),
                  timestamp: Date.now(),
                  automaticCheckpoint: true,
                },
              });
              
              if (checkpointMetadata) {
                logger.info(`Created comprehensive checkpoint before ${toolUse.name}`, {
                  checkpointId: checkpointMetadata.id,
                  filesCount: filePaths.length,
                  hasGitCommit: !!checkpointMetadata.gitCommitHash,
                  hasConversation: !!checkpointMetadata.conversationId,
                });
                
                // Update progress with success
                if (feedbackCallbacks?.onProgress) {
                  const feedbackId = feedbackCallbacks.onStart?.(toolUse.name as ToolOperation, '', 'Checkpoint created successfully');
                  if (feedbackId) {
                    feedbackCallbacks.onProgress(feedbackId, {
                      status: 'processing',
                      message: `Checkpoint ${checkpointMetadata.id} created with ${filePaths.length} file(s)`
                    });
                  }
                }
              }
            } else {
              logger.debug('Checkpointing not required or disabled for this operation');
            }
          }
        } catch (error) {
          logger.warn(`Enhanced checkpointing failed for ${toolUse.name}: ${error}`);
          // Continue with execution even if checkpointing fails
        }
      }

      // Execute tool with feedback support
      const result = await tool.handler(toolUse.input, feedbackCallbacks);
      const executionTime = Date.now() - startTime;
      
      // Update stats
      if (result.success) {
        stats.successCount++;
      }
      stats.totalTime += executionTime;
      
      // Add execution time and checkpoint info to metadata
      if (result.metadata) {
        result.metadata.executionTime = executionTime;
        if (checkpointMetadata) {
          result.metadata.checkpointId = checkpointMetadata.id;
          result.metadata.checkpointCreated = true;
        }
      } else {
        result.metadata = { 
          executionTime,
          ...(checkpointMetadata ? { 
            checkpointId: checkpointMetadata.id, 
            checkpointCreated: true
          } : {})
        };
      }

      if (result.success) {
        return {
          tool_use_id: toolUse.id,
          content: JSON.stringify(result.result || ''),
        };
      } else {
        return {
          tool_use_id: toolUse.id,
          content: result.error || 'Tool execution failed',
          is_error: true,
        };
      }
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      stats.totalTime += executionTime;
      
      logger.error(`Error executing tool ${toolUse.name}:`, error);
      return {
        tool_use_id: toolUse.id,
        content: error instanceof Error ? error.message : String(error),
        is_error: true,
      };
    }
  }

  /**
   * Determine if an operation requires checkpointing
   */
  private isDestructiveOperation(toolName: string, input: ToolInputParameters): boolean {
    const destructiveTools = new Set([
      'write_file',
      'edit',
      'execute_command', // Could modify files
      'create_file',
      'delete_file',
      'move_file',
      'copy_file'
    ]);
    
    // Always checkpoint file modification tools
    if (destructiveTools.has(toolName)) {
      return true;
    }
    
    // Check for potentially destructive commands
    if (toolName === 'execute_command' && input.command) {
      const command = String(input.command).toLowerCase();
      const destructiveCommands = ['rm ', 'mv ', 'cp ', 'git ', 'npm install', 'yarn install'];
      return destructiveCommands.some(cmd => command.includes(cmd));
    }
    
    return false;
  }

  /**
   * Extract file paths that will be modified by the operation
   */
  private extractFilePaths(toolName: string, input: ToolInputParameters): string[] {
    const paths: string[] = [];
    
    switch (toolName) {
      case 'write_file':
      case 'edit':
      case 'create_file':
      case 'delete_file':
        if (input.path && typeof input.path === 'string') {
          paths.push(input.path);
        }
        break;
        
      case 'move_file':
      case 'copy_file':
        if (input.source && typeof input.source === 'string') {
          paths.push(input.source);
        }
        if (input.destination && typeof input.destination === 'string') {
          paths.push(input.destination);
        }
        break;
        
      case 'execute_command':
        // For commands, we can't easily predict file changes
        // Could add heuristics here based on command analysis
        break;
    }
    
    return paths;
  }

  /**
   * Get execution statistics
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
   * Update execution stats for legacy compatibility
   */
  private updateExecutionStats(toolName: string, startTime: number, success: boolean): void {
    const stats = this.executionStats.get(toolName);
    if (stats) {
      stats.count++;
      stats.successCount += success ? 1 : 0;
      stats.totalTime += Date.now() - startTime;
    }
  }
}

// Global tool registry instance
const toolRegistry = new ToolRegistry();

/**
 * Register all built-in tools
 */
export async function registerBuiltInTools(): Promise<void> {
  // Register file reading tool with feedback
  toolRegistry.register({
    name: 'read_file',
    description: 'Read the contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read'
        }
      },
      required: ['path']
    }
  }, async (input, feedback): Promise<InternalToolResult> => {
    const feedbackId = feedback?.onStart?.('read_file', input.path as string, 'Reading file...');
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Update progress
      if (feedbackId && feedback?.onProgress) {
        feedback.onProgress(feedbackId, {
          status: 'processing',
          message: 'Checking file existence...'
        });
      }
      
      const resolvedPath = path.resolve(input.path as string);
      const stats = await fs.stat(resolvedPath);
      
      if (!stats.isFile()) {
        const error = `Path ${input.path} is not a file`;
        if (feedbackId && feedback?.onComplete) {
          feedback.onComplete(feedbackId, { success: false, error });
        }
        return { success: false, error };
      }
      
      // Update progress
      if (feedbackId && feedback?.onProgress) {
        feedback.onProgress(feedbackId, {
          status: 'processing',
          message: 'Reading file contents...',
          progress: { current: 50, total: 100, unit: '%' }
        });
      }
      
      const content = await fs.readFile(resolvedPath, 'utf-8');
      const result = {
        success: true,
        result: {
          path: input.path,
          content,
          size: content.length,
          lines: content.split('\n').length
        },
        metadata: {
          outputSize: content.length,
          filesAffected: 1
        }
      };
      
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, result);
      }
      
      return result;
    } catch (error: unknown) {
      const errorResult = {
        success: false,
        error: `Failed to read file ${input.path}: ${error instanceof Error ? error.message : String(error)}`
      };
      
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, errorResult);
      }
      
      return errorResult;
    }
  });

  // Register file writing tool with feedback
  toolRegistry.register({
    name: 'write_file',
    description: 'Write content to a file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  }, async (input, feedback): Promise<InternalToolResult> => {
    const feedbackId = feedback?.onStart?.('write_file', input.path as string, 'Writing file...');
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Update progress
      if (feedbackId && feedback?.onProgress) {
        feedback.onProgress(feedbackId, {
          status: 'processing',
          message: 'Preparing to write file...'
        });
      }
      
      const resolvedPath = path.resolve(input.path as string);
      const dir = path.dirname(resolvedPath);
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });
      
      // Update progress
      if (feedbackId && feedback?.onProgress) {
        feedback.onProgress(feedbackId, {
          status: 'processing',
          message: 'Writing content...',
          progress: { current: 75, total: 100, unit: '%' }
        });
      }
      
      await fs.writeFile(resolvedPath, input.content as string, 'utf-8');
      
      const lines = (input.content as string).split('\n').length;
      const result = {
        success: true,
        result: {
          path: input.path as string,
          size: (input.content as string).length,
          lines
        },
        metadata: {
          linesAdded: lines,
          filesAffected: 1,
          outputSize: (input.content as string).length
        }
      };
      
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, result);
      }
      
      return result;
    } catch (error: unknown) {
      const errorResult = {
        success: false,
        error: `Failed to write file ${input.path}: ${error instanceof Error ? error.message : String(error)}`
      };
      
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, errorResult);
      }
      
      return errorResult;
    }
  });

  // Register command execution tool with feedback
  toolRegistry.register({
    name: 'execute_command',
    description: 'Execute a shell command in a specified directory (useful for npm install, git init, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to execute'
        },
        cwd: {
          type: 'string',
          description: 'Working directory to execute the command in (default: current directory)'
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 30000)',
          default: 30000
        }
      },
      required: ['command']
    }
  }, async (input, feedback): Promise<InternalToolResult> => {
    const feedbackId = feedback?.onStart?.('execute_command', String(input.command || ''), 'Executing command...');
    
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Update progress
      if (feedbackId && feedback?.onProgress) {
        feedback.onProgress(feedbackId, {
          status: 'processing',
          message: `Running: ${input.command}`
        });
      }
      
      const options: { timeout: number; maxBuffer: number; cwd?: string } = {
        timeout: typeof input.timeout === 'number' ? input.timeout : 30000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      };
      
      if (input.cwd && typeof input.cwd === 'string') {
        const path = await import('path');
        options.cwd = path.resolve(input.cwd);
      }
      
      const { stdout, stderr } = await execAsync(String(input.command || ''), options);
      
      const result = {
        success: true,
        result: {
          command: input.command,
          stdout: String(stdout).trim(),
          stderr: String(stderr).trim(),
          cwd: options.cwd || process.cwd()
        },
        metadata: {
          outputSize: String(stdout).length + String(stderr).length
        }
      };
      
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, result);
      }
      
      return result;
    } catch (error: unknown) {
      // Create a proper error interface for exec errors
      interface ExecError extends Error {
        stdout?: string;
        stderr?: string;
      }
      
      const execError = error as ExecError;
      const errorResult = {
        success: false,
        error: `Command failed: ${execError.message || String(error)}${execError.stdout ? `\nStdout: ${execError.stdout}` : ''}${execError.stderr ? `\nStderr: ${execError.stderr}` : ''}`
      };
      
      if (feedbackId && feedback?.onComplete) {
        feedback.onComplete(feedbackId, errorResult);
      }
      
      return errorResult;
    }
  });

  // Register web fetch tool
  const { createWebFetchTool, executeWebFetch } = await import('./web-fetch.js');
  toolRegistry.register(createWebFetchTool(), executeWebFetch);

  // Register code analyzer tool
  const { createCodeAnalyzerTool, executeCodeAnalysis } = await import('./code-analyzer.js');
  toolRegistry.register(createCodeAnalyzerTool(), async (input, feedback): Promise<InternalToolResult> => {
    // Convert ToolInputParameters to CodeAnalysisInput
    const codeInput = {
      file_path: String(input.file_path || ''),
      analysis_type: typeof input.analysis_type === 'string' ? input.analysis_type : undefined,
      include_suggestions: typeof input.include_suggestions === 'boolean' ? input.include_suggestions : undefined
    };
    
    return executeCodeAnalysis(codeInput);
  });

  // Register advanced file system tools
  const { advancedFileTools } = await import('./advanced-file-tools.js');
  
  // Register list_directory tool
  toolRegistry.register(
    advancedFileTools.list_directory.definition,
    advancedFileTools.list_directory.handler
  );
  
  // Register read_many_files tool
  toolRegistry.register(
    advancedFileTools.read_many_files.definition,
    advancedFileTools.read_many_files.handler
  );
  
  // Register edit tool
  toolRegistry.register(
    advancedFileTools.edit.definition,
    advancedFileTools.edit.handler
  );
  
  // Register glob tool
  toolRegistry.register(
    advancedFileTools.glob.definition,
    advancedFileTools.glob.handler
  );

  logger.info(`Registered ${toolRegistry.getAll().length} built-in tools`);
}

// Export the registry and key functions
export { toolRegistry };
export const getToolRegistry = () => toolRegistry;
export const getAllTools = async () => {
  await toolRegistry.initialize();
  return toolRegistry.getAll();
};
export const executeTool = async (toolUse: ToolUseBlock, feedbackCallbacks?: Parameters<typeof toolRegistry.execute>[1]) => {
  await toolRegistry.initialize();
  return toolRegistry.execute(toolUse, feedbackCallbacks);
};
export const getToolStats = () => toolRegistry.getStats();
export const clearToolStats = () => toolRegistry.clearStats();