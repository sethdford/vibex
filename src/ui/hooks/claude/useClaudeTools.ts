/**
 * Claude Tools Hook - Clean Architecture like Gemini CLI
 * 
 * Focused hook for handling Claude tool execution
 */

import { useCallback } from 'react';
import { MessageType } from '../../types.js';
import { toolMigrationBridge } from '../../../services/tool-migration-bridge.js';
import { logger } from '../../../utils/logger.js';
import type { HistoryItem } from '../../types.js';
import type { MessageContentBlock, ToolUseBlock, ToolResult } from './types.js';

/**
 * Hook for managing Claude tool execution
 */
export function useClaudeTools(
  addItem: (item: Partial<HistoryItem>, timestamp?: number) => void,
  enableRealToolExecution: boolean = true,
  enableDebugLogging: boolean = false
) {
  // Extract tool use blocks from Claude message
  const extractToolUseBlocks = useCallback((content: MessageContentBlock[]): ToolUseBlock[] => {
    return content
      .filter((block): block is ToolUseBlock => block.type === 'tool_use')
      .map(block => ({
        type: 'tool_use' as const,
        id: String(block.id),
        name: String(block.name),
        input: block.input as Record<string, any>
      }));
  }, []);

  // Execute a single tool
  const executeTool = useCallback(async (toolUse: ToolUseBlock): Promise<ToolResult> => {
    // Add tool use to history
    const timestamp = Date.now();
    addItem(
      {
        type: MessageType.TOOL_USE,
        text: `Tool: ${toolUse.name}`,
        toolUse: {
          name: toolUse.name,
          input: toolUse.input,
          id: toolUse.id
        }
      },
      timestamp
    );

    try {
      if (enableDebugLogging) {
        logger.debug(`Executing tool: ${toolUse.name}`, toolUse.input);
      }
      
      let result: ToolResult;
      
      if (enableRealToolExecution) {
        // Real tool execution using tool registry
        const toolUseForRegistry = {
          type: 'tool_use' as const,
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input
        };
        
        const toolResult = await toolMigrationBridge.executeTool(toolUseForRegistry);
        result = toolResult;
      } else {
        // Mock tool execution for testing/development
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = {
          tool_use_id: toolUse.id,
          content: JSON.stringify({ 
            success: true, 
            message: `Executed ${toolUse.name} successfully`,
            timestamp: Date.now()
          }),
          is_error: false
        };
      }

      // Add tool result to history
      addItem(
        {
          type: MessageType.TOOL_OUTPUT,
          text: result.content,
          toolResult: {
            content: result.content,
            isError: !!result.is_error,
            toolUseId: result.tool_use_id
          }
        },
        timestamp + 1
      );

      return result;
    } catch (error) {
      // Handle error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResult: ToolResult = {
        tool_use_id: toolUse.id,
        content: errorMessage,
        is_error: true
      };

      // Add error result to history
      addItem(
        {
          type: MessageType.TOOL_OUTPUT,
          text: errorMessage,
          toolResult: {
            content: errorMessage,
            isError: true,
            toolUseId: toolUse.id
          }
        },
        timestamp + 1
      );

      if (enableDebugLogging) {
        logger.error(`Tool execution failed: ${toolUse.name}`, error);
      }

      return errorResult;
    }
  }, [addItem, enableRealToolExecution, enableDebugLogging]);

  // Handle multiple tool use requests from Claude
  const handleToolUses = useCallback(async (toolUses: ToolUseBlock[]): Promise<ToolResult[]> => {
    const results: ToolResult[] = [];
    
    // Execute tools sequentially to avoid conflicts
    for (const toolUse of toolUses) {
      const result = await executeTool(toolUse);
      results.push(result);
    }
    
    return results;
  }, [executeTool]);

  // Get available tools for Claude
  const getAvailableTools = useCallback(() => {
    if (!enableRealToolExecution) return [];
    
    const availableTools = toolMigrationBridge.getAllTools();
    return availableTools.map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema
    }));
  }, [enableRealToolExecution]);

  return {
    extractToolUseBlocks,
    executeTool,
    handleToolUses,
    getAvailableTools,
  };
} 