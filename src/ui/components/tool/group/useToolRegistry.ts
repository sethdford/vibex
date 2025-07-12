/**
 * Tool Registry Hook - New Architecture Integration
 * 
 * Provides integration with the new architecture tool system via migration bridge.
 * NO MORE MOCKS - Real tool data from new architecture!
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tool, ToolGroup } from './types.js';
import { toolMigrationBridge } from '../../../../services/tool-migration-bridge.js';
import { logger } from '../../../../utils/logger.js';

/**
 * Group tools by a specific property
 */
const groupToolsByProperty = (tools: Tool[], property: keyof Tool = 'namespace'): ToolGroup[] => {
  // Create a map of groups
  const groupMap = new Map<string, Tool[]>();
  
  // Group tools by property
  for (const tool of tools) {
    const key = String(tool[property] || 'default');
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(tool);
  }
  
  // Convert map to array of groups
  return Array.from(groupMap.entries()).map(([name, tools]) => ({
    id: name,
    name,
    tools,
    expanded: false
  }));
};

/**
 * Group tools by tags
 */
const groupToolsByTags = (tools: Tool[]): ToolGroup[] => {
  const tagMap = new Map<string, Tool[]>();
  
  // Collect all unique tags and group tools
  for (const tool of tools) {
    const tags = tool.tags || ['untagged'];
    for (const tag of tags) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }
      tagMap.get(tag)!.push(tool);
    }
  }
  
  // Convert to groups
  return Array.from(tagMap.entries()).map(([tag, tools]) => ({
    id: tag,
    name: tag,
    tools,
    expanded: false
  }));
};

/**
 * Convert new architecture tool definition to UI Tool format
 */
const convertToUITool = (toolDef: any): Tool => {
  // Extract parameters from input_schema
  const parameters = Object.entries(toolDef.input_schema?.properties || {}).map(([name, prop]: [string, any]) => ({
    name,
    description: prop.description || '',
    type: prop.type || 'string',
    required: toolDef.input_schema?.required?.includes(name) || false,
    defaultValue: prop.default
  }));

  return {
    id: toolDef.name,
    name: toolDef.name,
    namespace: extractNamespace(toolDef.name),
    description: toolDef.description,
    parameters,
    tags: extractTags(toolDef.name, toolDef.description),
    examples: generateExamples(toolDef.name, parameters)
  };
};

/**
 * Extract namespace from tool name
 */
const extractNamespace = (toolName: string): string => {
  // Common tool name patterns to namespace mapping
  if (toolName.includes('file') || toolName.includes('read') || toolName.includes('write') || toolName.includes('glob') || toolName.includes('edit')) {
    return 'filesystem';
  }
  if (toolName.includes('web') || toolName.includes('fetch') || toolName.includes('http')) {
    return 'web';
  }
  if (toolName.includes('command') || toolName.includes('exec') || toolName.includes('shell')) {
    return 'system';
  }
  if (toolName.includes('git')) {
    return 'git';
  }
  if (toolName.includes('mcp')) {
    return 'mcp';
  }
  
  return 'core';
};

/**
 * Extract tags from tool name and description
 */
const extractTags = (toolName: string, description: string): string[] => {
  const tags: string[] = [];
  const text = `${toolName} ${description}`.toLowerCase();
  
  if (text.includes('file') || text.includes('read') || text.includes('write')) tags.push('file');
  if (text.includes('web') || text.includes('http') || text.includes('fetch')) tags.push('web');
  if (text.includes('command') || text.includes('exec') || text.includes('shell')) tags.push('command');
  if (text.includes('search') || text.includes('find') || text.includes('glob')) tags.push('search');
  if (text.includes('git')) tags.push('git');
  if (text.includes('analyze') || text.includes('analysis')) tags.push('analysis');
  if (text.includes('screenshot') || text.includes('image')) tags.push('image');
  
  return tags.length > 0 ? tags : ['utility'];
};

/**
 * Generate example usage for tools
 */
const generateExamples = (toolName: string, parameters: any[]): any[] => {
  const examples: any[] = [];
  
  switch (toolName) {
    case 'read_file':
      examples.push({
        title: 'Read package.json',
        parameters: { path: './package.json' }
      });
      break;
    case 'write_file':
      examples.push({
        title: 'Create README file',
        parameters: { path: './README.md', content: '# My Project\n\nDescription here.' }
      });
      break;
    case 'execute_command':
      examples.push({
        title: 'List files',
        parameters: { command: 'ls -la' }
      });
      break;
    case 'web_fetch':
      examples.push({
        title: 'Fetch API data',
        parameters: { url: 'https://api.example.com/data' }
      });
      break;
  }
  
  return examples;
};

/**
 * Hook options
 */
interface UseToolRegistryOptions {
  groupBy?: 'namespace' | 'tags' | 'custom';
  customGrouping?: (tools: Tool[]) => ToolGroup[];
}

/**
 * Tool registry hook result
 */
interface UseToolRegistryResult {
  tools: Tool[];
  groups: ToolGroup[];
  loading: boolean;
  error: Error | null;
  executeTool: (tool: Tool, parameters: Record<string, any>) => Promise<any>;
}

/**
 * NEW ARCHITECTURE Tool Registry Hook
 * 
 * No more mocks! Real integration with new architecture via migration bridge.
 */
export const useToolRegistry = (
  options: UseToolRegistryOptions = {}
): UseToolRegistryResult => {
  // Options with defaults
  const { 
    groupBy = 'namespace',
    customGrouping
  } = options;
  
  // State for tools
  const [tools, setTools] = useState<Tool[]>([]);
  // State for loading
  const [loading, setLoading] = useState(true);
  // State for error
  const [error, setError] = useState<Error | null>(null);
  
  // REAL tool registry integration - NO MORE MOCKS!
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize migration bridge if needed
        await toolMigrationBridge.initialize();
        
        // Get real tools from new architecture
        const toolDefinitions = toolMigrationBridge.getAllTools();
        
        // Convert to UI format
        const uiTools = toolDefinitions.map(convertToUITool);
        
        setTools(uiTools);
        logger.info(`🚀 Loaded ${uiTools.length} tools from new architecture`);
        
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error('❌ Failed to load tools from new architecture:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTools();
  }, []);
  
  // Group tools
  const groups = useMemo(() => {
    if (customGrouping) {
      return customGrouping(tools);
    }
    
    if (groupBy === 'tags') {
      return groupToolsByTags(tools);
    }
    
    return groupToolsByProperty(tools, 'namespace');
  }, [tools, groupBy, customGrouping]);
  
  // REAL tool execution - NO MORE SIMULATION!
  const executeTool = useCallback(async (
    tool: Tool, 
    parameters: Record<string, any>
  ): Promise<any> => {
    try {
      logger.info(`🔧 Executing tool "${tool.name}" with new architecture`);
      
      // Create tool use block for execution
      const toolUse = {
        type: 'tool_use' as const,
        id: `ui-exec-${Date.now()}`,
        name: tool.name,
        input: parameters
      };
      
      // Execute via migration bridge (new architecture)
      const result = await toolMigrationBridge.executeTool(toolUse);
      
      if (result.is_error) {
        throw new Error(result.content);
      }
      
      logger.info(`✅ Tool "${tool.name}" executed successfully`);
      return {
        success: true,
        toolId: tool.id,
        result: result.content
      };
      
    } catch (error) {
      logger.error(`❌ Tool execution failed for "${tool.name}":`, error);
      throw error;
    }
  }, []);
  
  return {
    tools,
    groups,
    loading,
    error,
    executeTool
  };
};

export default useToolRegistry;