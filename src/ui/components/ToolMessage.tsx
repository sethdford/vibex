/**
 * Tool Message Component
 * 
 * Displays tool use requests and results.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Tool input parameters interface
 */
export interface ToolInputParameters {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Tool use props
 */
interface ToolUseProps {
  /**
   * Tool name
   */
  name: string;
  
  /**
   * Tool input parameters
   */
  input: ToolInputParameters;
  
  /**
   * Tool ID
   */
  id: string;
  
  /**
   * Whether the tool is pending execution
   */
  pending?: boolean;
}

/**
 * Tool result props
 */
interface ToolResultProps {
  /**
   * Result content
   */
  content: string;
  
  /**
   * Whether the result is an error
   */
  isError: boolean;
  
  /**
   * Related tool use ID
   */
  toolUseId: string;
}

/**
 * Tool message props
 */
interface ToolMessageProps {
  /**
   * Tool use data
   */
  toolUse: ToolUseProps;
  
  /**
   * Tool result data (optional)
   */
  toolResult?: ToolResultProps;
  
  /**
   * Whether the tool message is focused
   */
  isFocused?: boolean;
}

/**
 * Format the tool input as a pretty string
 * 
 * @param input - Tool input object
 * @returns Formatted string representation
 */
const formatToolInput = (input: ToolInputParameters): string => {
  try {
    return JSON.stringify(input, null, 2);
  } catch (error) {
    return String(input);
  }
};

/**
 * Tool message component
 */
export const ToolMessage: React.FC<ToolMessageProps> = ({
  toolUse,
  toolResult,
  isFocused = true,
}) => {
  // Determine the status and colors
  const statusText = toolResult 
    ? (toolResult.isError ? 'Error' : 'Success') 
    : (toolUse.pending ? 'Pending' : 'Running');
  
  let statusColor = Colors.TextDim;
  if (toolResult) {
    statusColor = toolResult.isError ? Colors.Error : Colors.Success;
  } else {
    statusColor = toolUse.pending ? Colors.Warning : Colors.Info;
  }
  
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Tool request */}
      <Box>
        <Box marginRight={1}>
          <Text color={Colors.Info} bold>
            Tool Request:
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Primary} bold>
            {toolUse.name}
          </Text>
        </Box>
        
        <Box marginLeft={1}>
          <Text color={statusColor}>
            [{statusText}]
          </Text>
        </Box>
      </Box>
      
      {/* Tool input */}
      <Box marginLeft={2} marginTop={1} flexDirection="column">
        <Text color={Colors.TextDim}>
          Input:
        </Text>
        
        <Box 
          marginLeft={1} 
          marginTop={1}
          borderStyle="round"
          borderColor={Colors.TextDim}
          paddingX={1}
          flexDirection="column"
        >
          <Text>
            {formatToolInput(toolUse.input)}
          </Text>
        </Box>
      </Box>
      
      {/* Tool result (if available) */}
      {toolResult && (
        <Box marginLeft={2} marginTop={1} flexDirection="column">
          <Text color={toolResult.isError ? Colors.Error : Colors.Success}>
            {toolResult.isError ? 'Error:' : 'Result:'}
          </Text>
          
          <Box 
            marginLeft={1}
            marginTop={1}
            borderStyle="round"
            borderColor={toolResult.isError ? Colors.Error : Colors.Success}
            paddingX={1}
            flexDirection="column"
          >
            <Text>
              {toolResult.content}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};