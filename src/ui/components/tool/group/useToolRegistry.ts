/**
 * Tool Registry Hook
 * 
 * Provides integration with the tool registry for the Tool Group Display.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tool, ToolGroup } from './types.js';

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
  // Create a map of groups
  const groupMap = new Map<string, Tool[]>();
  
  // Collect all tags
  const allTags = new Set<string>();
  for (const tool of tools) {
    if (tool.tags) {
      for (const tag of tool.tags) {
        allTags.add(tag);
      }
    }
  }
  
  // Create a group for each tag
  for (const tag of allTags) {
    groupMap.set(tag, tools.filter(tool => 
      tool.tags?.includes(tag)
    ));
  }
  
  // Convert map to array of groups
  return Array.from(groupMap.entries()).map(([name, tools]) => ({
    id: `tag-${name}`,
    name,
    tools,
    expanded: false,
    tags: [name]
  }));
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
 * Tool registry hook
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
  
  // Mock tool registry - in a real implementation, this would
  // fetch tools from an actual registry
  useEffect(() => {
    // Simulate API call
    const fetchTools = async () => {
      try {
        // Mock data - replace with actual API call
        const mockTools: Tool[] = [
          {
            id: 'read',
            name: 'Read',
            namespace: 'fs',
            description: 'Read file from filesystem',
            parameters: [
              {
                name: 'file_path',
                description: 'Path to the file',
                type: 'string',
                required: true
              },
              {
                name: 'encoding',
                description: 'File encoding',
                type: 'string',
                required: false,
                defaultValue: 'utf8'
              }
            ],
            tags: ['file', 'read', 'filesystem'],
            examples: [
              {
                title: 'Read package.json',
                parameters: {
                  file_path: './package.json'
                }
              }
            ]
          },
          {
            id: 'write',
            name: 'Write',
            namespace: 'fs',
            description: 'Write content to a file',
            parameters: [
              {
                name: 'file_path',
                description: 'Path to the file',
                type: 'string',
                required: true
              },
              {
                name: 'content',
                description: 'Content to write',
                type: 'string',
                required: true
              },
              {
                name: 'encoding',
                description: 'File encoding',
                type: 'string',
                required: false,
                defaultValue: 'utf8'
              }
            ],
            tags: ['file', 'write', 'filesystem']
          },
          {
            id: 'glob',
            name: 'Glob',
            namespace: 'fs',
            description: 'Find files using glob patterns',
            parameters: [
              {
                name: 'pattern',
                description: 'Glob pattern',
                type: 'string',
                required: true
              },
              {
                name: 'cwd',
                description: 'Current working directory',
                type: 'string',
                required: false
              }
            ],
            tags: ['file', 'search', 'filesystem']
          },
          {
            id: 'fetch',
            name: 'Fetch',
            namespace: 'http',
            description: 'Fetch data from a URL',
            parameters: [
              {
                name: 'url',
                description: 'URL to fetch',
                type: 'string',
                required: true
              },
              {
                name: 'method',
                description: 'HTTP method',
                type: 'string',
                required: false,
                defaultValue: 'GET'
              },
              {
                name: 'headers',
                description: 'HTTP headers',
                type: 'object',
                required: false
              },
              {
                name: 'body',
                description: 'Request body',
                type: 'string',
                required: false
              }
            ],
            tags: ['http', 'network']
          },
          {
            id: 'exec',
            name: 'Exec',
            namespace: 'shell',
            description: 'Execute shell command',
            parameters: [
              {
                name: 'command',
                description: 'Command to execute',
                type: 'string',
                required: true
              },
              {
                name: 'cwd',
                description: 'Current working directory',
                type: 'string',
                required: false
              },
              {
                name: 'env',
                description: 'Environment variables',
                type: 'object',
                required: false
              }
            ],
            tags: ['shell', 'exec', 'command']
          }
        ];
        
        setTools(mockTools);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
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
  
  // Execute tool function
  const executeTool = useCallback(async (
    tool: Tool, 
    parameters: Record<string, any>
  ): Promise<any> => {
    // This would actually call the tool execution service
    console.log(`Executing ${tool.name} with parameters:`, parameters);
    
    // Simulate execution
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          toolId: tool.id,
          result: `Mock result for ${tool.name}`
        });
      }, 1000);
    });
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