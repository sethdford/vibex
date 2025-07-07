/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import { BaseTool } from '../../domain/tool';
import { 
  Tool,
  ToolResult,
  ToolExecutionOptions,
  ToolConfirmationDetails,
  ToolConfirmationOutcome
} from '../../domain/tool/tool-interfaces';
import { 
  MCPClient, 
  MCPServerConfig, 
  MCPToolParameters,
  MCPToolDefinition
} from '../../../tools/mcp-client';

/**
 * Adapter for MCP tools
 * 
 * This adapter wraps MCP tools from external servers into the
 * Clean Architecture tool interface.
 */
export class MCPToolAdapter extends BaseTool {
  private mcpClient: MCPClient;
  private fullToolName: string;
  private toolDefinition: MCPToolDefinition;
  
  /**
   * Constructor
   */
  constructor(
    mcpClient: MCPClient,
    serverName: string,
    toolDefinition: MCPToolDefinition
  ) {
    const fullToolName = `${serverName}__${toolDefinition.name}`;
    
    super(
      fullToolName,
      toolDefinition.description,
      convertMCPSchemaToToolParameters(toolDefinition.input_schema)
    );
    
    this.mcpClient = mcpClient;
    this.fullToolName = fullToolName;
    this.toolDefinition = toolDefinition;
  }
  
  /**
   * Execute the MCP tool
   */
  async execute(params: unknown, options?: ToolExecutionOptions): Promise<ToolResult> {
    try {
      const mcpParams = params as MCPToolParameters;
      const result = await this.mcpClient.executeTool(this.fullToolName, mcpParams);
      
      if (options?.onProgress) {
        options.onProgress({
          message: 'MCP tool execution completed'
        });
      }
      
      return {
        success: result.success,
        data: result.result,
        error: result.error ? new Error(result.error) : undefined,
        callId: (options?.context?.callId as string) || 'unknown',
        executionTime: 0 // Not provided by MCP client
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        callId: (options?.context?.callId as string) || 'unknown',
        executionTime: 0
      };
    }
  }
  
  /**
   * Validate the parameters against the MCP tool schema
   */
  validateParams(params: unknown): string | null {
    if (!params || typeof params !== 'object') {
      return 'Parameters must be an object';
    }
    
    // Check required fields
    const requiredFields = this.toolDefinition.input_schema.required || [];
    const inputParams = params as Record<string, unknown>;
    
    for (const field of requiredFields) {
      if (inputParams[field] === undefined) {
        return `Missing required parameter: ${field}`;
      }
    }
    
    // Type validation would be more complex
    // For simplicity, we'll delegate to the MCP client for now
    return null;
  }
  
  /**
   * Check if the MCP tool execution needs confirmation
   */
  async shouldConfirmExecute(params: unknown): Promise<ToolConfirmationDetails | null> {
    const isTrusted = true; // This would come from configuration
    
    if (!isTrusted) {
      return {
        type: 'warning',
        title: 'External MCP Tool Execution',
        description: `Are you sure you want to execute the MCP tool "${this.toolDefinition.name}" from server?`,
        params: params as Record<string, unknown>
      };
    }
    
    return null;
  }
}

/**
 * MCP Tool Factory 
 * 
 * Creates MCP tool adapters from MCP client and server configurations
 */
export class MCPToolFactory {
  private mcpClient: MCPClient;
  
  /**
   * Constructor
   */
  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }
  
  /**
   * Connect to an MCP server and create adapters for all its tools
   */
  async connectServerAndCreateTools(config: MCPServerConfig): Promise<Tool[]> {
    // Connect to the server
    await this.mcpClient.connectServer(config);
    
    // Get all tools from this server
    const tools: Tool[] = [];
    const allTools = this.mcpClient.getAllTools();
    
    for (const [toolName, toolDefinition] of allTools.entries()) {
      if (toolName.startsWith(`${config.name}__`)) {
        const tool = new MCPToolAdapter(
          this.mcpClient,
          config.name,
          toolDefinition
        );
        tools.push(tool);
      }
    }
    
    return tools;
  }
  
  /**
   * Disconnect from all MCP servers
   */
  async disconnectAllServers(): Promise<void> {
    await this.mcpClient.disconnectAll();
  }
}

/**
 * Helper function to convert MCP schema to tool parameters
 */
function convertMCPSchemaToToolParameters(schema: MCPToolDefinition['input_schema']): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type: 'object',
    properties: {},
    required: schema.required || []
  };
  
  for (const [name, prop] of Object.entries(schema.properties)) {
    const converted: Record<string, unknown> = {
      type: prop.type
    };
    
    if (prop.description) {
      converted.description = prop.description;
    }
    
    if (prop.enum) {
      converted.enum = prop.enum;
    }
    
    if (prop.default !== undefined) {
      converted.default = prop.default;
    }
    
    if (prop.type === 'array' && prop.items) {
      converted.items = prop.items;
    }
    
    if (prop.type === 'object' && prop.properties) {
      converted.properties = prop.properties;
      if (prop.required) {
        converted.required = prop.required;
      }
    }
    
    (result.properties as Record<string, unknown>)[name] = converted;
  }
  
  return result;
}
