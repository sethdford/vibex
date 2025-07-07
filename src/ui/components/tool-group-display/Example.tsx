/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

import { ToolGroupDisplay } from './ToolGroupDisplay.js';
import { Tool, ToolCallRequest, ToolMetadata } from '../../../core/domain/tool/tool-interfaces.js';
import { BaseTool } from '../../../core/domain/tool/tool-interfaces.js';

/**
 * Example implementation of a tool
 */
class ExampleTool extends BaseTool {
  async execute(params: unknown): Promise<any> {
    return { success: true, result: 'Example tool executed' };
  }
  
  getMetadata(): ToolMetadata {
    return {
      ...super.getMetadata(),
      version: '1.0.0',
      tags: ['example', 'demo'],
      examples: [
        {
          name: 'Basic Example',
          params: { text: 'Hello World' },
          result: { message: 'Hello World processed' },
          description: 'A simple example of using this tool'
        }
      ]
    };
  }
}

/**
 * Create example tools for demonstration
 */
const createExampleTools = () => {
  const tools: Tool[] = [];
  
  // File tools
  tools.push(new ExampleTool(
    'readFile',
    'Read a file from the filesystem',
    {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file' }
      },
      required: ['filePath']
    },
    {
      namespace: 'files',
      tags: ['io', 'file'],
      dangerous: false,
      requiresConfirmation: false
    }
  ));
  
  tools.push(new ExampleTool(
    'writeFile',
    'Write content to a file',
    {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to the file' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['filePath', 'content']
    },
    {
      namespace: 'files',
      tags: ['io', 'file'],
      dangerous: true,
      requiresConfirmation: true
    }
  ));
  
  // Network tools
  tools.push(new ExampleTool(
    'fetch',
    'Fetch data from a URL',
    {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
        method: { type: 'string', description: 'HTTP method', default: 'GET' }
      },
      required: ['url']
    },
    {
      namespace: 'network',
      tags: ['http', 'api'],
      dangerous: false,
      requiresConfirmation: false
    }
  ));
  
  tools.push(new ExampleTool(
    'webSocket',
    'Create a WebSocket connection',
    {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'WebSocket URL' }
      },
      required: ['url']
    },
    {
      namespace: 'network',
      tags: ['websocket', 'realtime'],
      dangerous: false,
      requiresConfirmation: true
    }
  ));
  
  // System tools
  tools.push(new ExampleTool(
    'shell',
    'Execute a shell command',
    {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' }
      },
      required: ['command']
    },
    {
      namespace: 'system',
      tags: ['shell', 'exec'],
      dangerous: true,
      requiresConfirmation: true
    }
  ));
  
  tools.push(new ExampleTool(
    'processInfo',
    'Get information about the current process',
    {
      type: 'object',
      properties: {},
      required: []
    },
    {
      namespace: 'system',
      tags: ['process', 'info'],
      dangerous: false,
      requiresConfirmation: false
    }
  ));
  
  return tools;
};

/**
 * Tool Group Display Example Component
 * 
 * Demonstrates the usage of the ToolGroupDisplay component with example tools.
 */
export const ToolGroupDisplayExample: React.FC = () => {
  // State for tools and execution status
  const [tools, setTools] = useState<Tool[]>([]);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  
  // Load example tools
  useEffect(() => {
    setTools(createExampleTools());
  }, []);
  
  // Handle tool execution
  const handleToolExecute = (request: ToolCallRequest) => {
    setExecutionResult(
      `Executing ${request.namespace ? `${request.namespace}:` : ''}${request.name} with params: ${JSON.stringify(request.params)}`
    );
    
    // Clear result after 3 seconds
    setTimeout(() => {
      setExecutionResult(null);
    }, 3000);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color={Colors.Primary}>Tool Group Display Example</Text>
      
      <Box marginY={1}>
        <Text color={Colors.TextDim}>
          This example demonstrates the Tool Group Display component with example tools.
          Browse, search, and interact with the tool groups below.
        </Text>
      </Box>
      
      {/* Display execution result if any */}
      {executionResult && (
        <Box 
          marginY={1}
          borderStyle="round" 
          borderColor={Colors.Success} 
          paddingX={1}
        >
          <Text color={Colors.Success}>{executionResult}</Text>
        </Box>
      )}
      
      {/* Tool Group Display */}
      <ToolGroupDisplay
        showSearch={true}
        showDocumentation={true}
        showExamples={true}
        allowExecution={true}
        onToolExecute={handleToolExecute}
        terminalWidth={80}
        // Group tools by their namespace
        groupingFunction={(allTools) => {
          const toolsByNamespace = new Map<string, Tool[]>();
          
          allTools.forEach(tool => {
            const metadata = tool.getMetadata();
            const namespace = metadata.namespace || 'default';
            
            if (!toolsByNamespace.has(namespace)) {
              toolsByNamespace.set(namespace, []);
            }
            
            toolsByNamespace.get(namespace)!.push(tool);
          });
          
          return Array.from(toolsByNamespace.entries()).map(([namespace, tools]) => ({
            name: namespace,
            description: `Tools in the ${namespace} namespace`,
            tools,
            isExpanded: false
          }));
        }}
        // Use our example tools
        groups={[
          {
            name: 'files',
            description: 'File system operations',
            tools: tools.filter(tool => tool.getMetadata().namespace === 'files'),
            isExpanded: true
          },
          {
            name: 'network',
            description: 'Network operations',
            tools: tools.filter(tool => tool.getMetadata().namespace === 'network'),
            isExpanded: false
          },
          {
            name: 'system',
            description: 'System operations',
            tools: tools.filter(tool => tool.getMetadata().namespace === 'system'),
            isExpanded: false
          }
        ]}
      />
    </Box>
  );
};

export default ToolGroupDisplayExample;