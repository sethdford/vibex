/**
 * Tool Example Item Component
 * 
 * Displays a tool usage example with parameters and execution button.
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../../colors.js';
import { ToolExampleItemProps } from './types.js';

/**
 * Tool Example Item component
 */
export const ToolExampleItem: React.FC<ToolExampleItemProps> = ({
  example,
  tool,
  width,
  executionEnabled,
  onExecute
}) => {
  // State for execution status
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');
  
  // Handle example execution
  const handleExecute = async () => {
    if (!onExecute) return;
    
    try {
      setExecutionStatus('executing');
      await onExecute(example.parameters);
      setExecutionStatus('success');
    } catch (error) {
      setExecutionStatus('error');
    }
  };
  
  return (
    <Box 
      flexDirection="column" 
      width={width}
      borderStyle="single"
      borderColor={Colors.Border}
    >
      {/* Example title */}
      <Box 
        paddingX={1} 
        backgroundColor={Colors.BackgroundAlt}
        justifyContent="space-between"
      >
        <Text bold>{example.title}</Text>
        
        {executionEnabled && onExecute && (
          <Box>
            <Text 
              backgroundColor={
                executionStatus === 'executing' ? Colors.Info :
                executionStatus === 'success' ? Colors.Success :
                executionStatus === 'error' ? Colors.Error :
                Colors.Primary
              } 
              color={Colors.Background}
              paddingX={1}
              onClick={handleExecute}
            >
              {executionStatus === 'executing' ? 'Running...' :
               executionStatus === 'success' ? 'Success' :
               executionStatus === 'error' ? 'Failed' :
               'Run'}
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Example description */}
      {example.description && (
        <Box paddingX={1}>
          <Text dimColor wrap="wrap">
            {example.description}
          </Text>
        </Box>
      )}
      
      {/* Example parameters */}
      <Box flexDirection="column" padding={1}>
        <Text color={Colors.TextDim} wrap="wrap">Parameters:</Text>
        
        <Box 
          marginTop={1} 
          paddingX={1} 
          borderStyle="single" 
          borderColor={Colors.Border}
        >
          <Text>
            {JSON.stringify(example.parameters, null, 2)}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default ToolExampleItem;