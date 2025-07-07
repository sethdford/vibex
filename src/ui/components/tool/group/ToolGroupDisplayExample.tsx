/**
 * Tool Group Display Example
 * 
 * Example implementation of the Tool Group Display component.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../colors.js';
import { ToolGroupDisplay } from './index.js';
import { useToolRegistry } from './useToolRegistry.js';
import { Tool } from './types.js';

/**
 * Tool Group Display Example component
 */
export const ToolGroupDisplayExample: React.FC<{
  width?: number;
  height?: number;
}> = ({
  width = 100,
  height = 30
}) => {
  // State for selected tool
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  // State for last execution result
  const [lastResult, setLastResult] = useState<any>(null);
  
  // Get tools from registry
  const { 
    groups, 
    loading, 
    error, 
    executeTool 
  } = useToolRegistry({
    groupBy: 'namespace'
  });
  
  // Handle tool selection
  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
  };
  
  // Handle tool execution
  const handleToolExecute = async (tool: Tool, parameters: Record<string, any>) => {
    const result = await executeTool(tool, parameters);
    setLastResult(result);
    return result;
  };
  
  if (loading) {
    return (
      <Box 
        width={width} 
        height={height} 
        alignItems="center" 
        justifyContent="center"
        borderStyle="single"
        borderColor={Colors.Border}
      >
        <Text color={Colors.Primary}>Loading tools...</Text>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box 
        width={width} 
        height={height} 
        alignItems="center" 
        justifyContent="center"
        borderStyle="single"
        borderColor={Colors.Error}
        padding={2}
        flexDirection="column"
      >
        <Text bold color={Colors.Error}>Error loading tools</Text>
        <Text color={Colors.TextDim} marginTop={1}>{error.message}</Text>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" width={width}>
      <Box 
        paddingX={1}
        paddingY={0}
        borderStyle="single"
        borderColor={Colors.Border}
        backgroundColor={Colors.BackgroundAlt}
        marginBottom={1}
      >
        <Text bold color={Colors.Primary}>Tool Browser</Text>
        <Box flexGrow={1} justifyContent="flex-end">
          <Text color={Colors.TextDim}>
            {groups.reduce((sum, group) => sum + group.tools.length, 0)} tools in {groups.length} groups
          </Text>
        </Box>
      </Box>
      
      <Box height={height - 2}>
        <ToolGroupDisplay
          groups={groups}
          width={width}
          height={height - 4}
          searchEnabled={true}
          executionEnabled={true}
          onToolSelect={handleToolSelect}
          onToolExecute={handleToolExecute}
        />
      </Box>
      
      {lastResult && (
        <Box 
          marginTop={1}
          borderStyle="single"
          borderColor={Colors.Border}
          paddingX={1}
          paddingY={0}
        >
          <Text bold color={Colors.Primary}>Last Result:</Text>
          <Box marginLeft={2}>
            <Text>
              {typeof lastResult === 'object' 
                ? JSON.stringify(lastResult, null, 2)
                : String(lastResult)
              }
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ToolGroupDisplayExample;