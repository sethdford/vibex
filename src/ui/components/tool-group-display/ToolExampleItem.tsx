/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { v4 as uuidv4 } from 'uuid';

import { ToolExampleItemProps } from './types.js';

/**
 * Tool Example Item Component
 * 
 * Displays a single usage example for a tool, including parameters and result.
 * Allows executing the example if execution callback is provided.
 */
export const ToolExampleItem: React.FC<ToolExampleItemProps> = ({
  name,
  params,
  result,
  description,
  toolName,
  toolNamespace,
  onExecute,
}) => {
  // Execute the example
  const handleExecute = () => {
    if (onExecute) {
      onExecute({
        callId: uuidv4(),
        name: toolName,
        namespace: toolNamespace,
        params
      });
    }
  };

  return (
    <Box flexDirection="column" marginY={1} 
         borderStyle="round" borderColor={Colors.TextDim} paddingX={1}>
      {/* Example header */}
      <Box>
        <Text bold>{name}</Text>
        
        {/* Execute button */}
        {onExecute && (
          <Box marginLeft="auto">
            <Text color={Colors.AccentBlue} underline onClick={handleExecute}>
              [Try Example]
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Example description */}
      {description && (
        <Box marginLeft={1}>
          <Text color={Colors.TextDim}>{description}</Text>
        </Box>
      )}
      
      {/* Example parameters */}
      <Box flexDirection="column" marginTop={1}>
        <Text color={Colors.AccentBlue}>Parameters:</Text>
        
        <Box marginLeft={1} marginTop={1}>
          <Text>
            {JSON.stringify(params, null, 2)}
          </Text>
        </Box>
      </Box>
      
      {/* Example result (if available) */}
      {result && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={Colors.Success}>Result:</Text>
          
          <Box marginLeft={1} marginTop={1}>
            <Text>
              {typeof result === 'object' 
                ? JSON.stringify(result, null, 2) 
                : String(result)}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ToolExampleItem;