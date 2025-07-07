/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { v4 as uuidv4 } from 'uuid';

import { ToolItemProps } from './types.js';
import { ToolDocumentation } from './ToolDocumentation.js';

/**
 * Tool Item Component
 * 
 * Displays information about a single tool with expandable documentation
 * and optional execution capabilities.
 */
export const ToolItem: React.FC<ToolItemProps> = ({
  tool,
  showDocumentation = true,
  showExamples = true,
  allowExecution = true,
  terminalWidth = 80,
  isSelected = false,
  onSelect,
  onExecute,
}) => {
  // State
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showExecuteForm, setShowExecuteForm] = useState<boolean>(false);
  const [params, setParams] = useState<Record<string, string>>({});
  
  // Get metadata
  const metadata = tool.getMetadata();
  
  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
    if (onSelect) {
      onSelect(tool);
    }
  }, [tool, onSelect]);
  
  // Toggle execute form
  const toggleExecuteForm = useCallback(() => {
    setShowExecuteForm(prev => !prev);
    if (!showExecuteForm) {
      // Reset params when opening form
      setParams({});
    }
  }, [showExecuteForm]);
  
  // Update parameter value
  const updateParamValue = useCallback((paramName: string, value: string) => {
    setParams(prev => ({
      ...prev,
      [paramName]: value
    }));
  }, []);
  
  // Execute the tool
  const executeTool = useCallback(() => {
    if (onExecute) {
      // Convert string params to appropriate types based on parameter schema
      const typedParams = Object.entries(params).reduce((acc, [key, value]) => {
        // This is a simplified version - in a real implementation, we would convert
        // string values to the appropriate types based on the parameter schema
        try {
          // Try to parse as JSON first
          acc[key] = JSON.parse(value);
        } catch (e) {
          // If parsing fails, use the string value
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, unknown>);
      
      onExecute({
        callId: uuidv4(),
        name: tool.name,
        namespace: metadata.namespace,
        params: typedParams
      });
      
      // Close the form after execution
      setShowExecuteForm(false);
    }
  }, [tool, metadata.namespace, params, onExecute]);

  return (
    <Box flexDirection="column" marginY={1} 
         borderStyle={isSelected ? "round" : undefined} 
         borderColor={isSelected ? Colors.Info : undefined}
         paddingX={isSelected ? 1 : 0}>
      {/* Tool header */}
      <Box>
        {/* Expand/collapse control */}
        <Box marginRight={1}>
          <Text color={Colors.Info} bold>
            {isExpanded ? '▼' : '►'}
          </Text>
        </Box>
        
        {/* Tool name */}
        <Box marginRight={1}>
          <Text color={Colors.Primary} bold>
            {metadata.namespace && metadata.namespace !== 'default' ? `${metadata.namespace}:` : ''}
            {metadata.name}
          </Text>
        </Box>
        
        {/* Tags (if any) */}
        {metadata.tags && metadata.tags.length > 0 && (
          <Box marginLeft={1}>
            {metadata.tags.map((tag, i) => (
              <Text key={`tag-${i}`} color={Colors.TextDim} dimColor>
                {i > 0 ? ' ' : ''}#{tag}
              </Text>
            ))}
          </Box>
        )}
        
        {/* Danger indicator */}
        {metadata.dangerous && (
          <Box marginLeft={1}>
            <Text color={Colors.Error}>⚠️</Text>
          </Box>
        )}
        
        {/* Execute button */}
        {allowExecution && onExecute && (
          <Box marginLeft="auto">
            <Text color={Colors.AccentBlue} underline>
              [Execute]
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Tool description */}
      <Box marginLeft={4}>
        <Text color={Colors.TextDim}>{metadata.description}</Text>
      </Box>
      
      {/* Expanded documentation */}
      {isExpanded && showDocumentation && (
        <Box flexDirection="column" marginLeft={4} marginTop={1}>
          <ToolDocumentation
            metadata={metadata}
            showExamples={showExamples}
            terminalWidth={terminalWidth - 4}
          />
        </Box>
      )}
      
      {/* Execute form */}
      {showExecuteForm && allowExecution && onExecute && (
        <Box flexDirection="column" marginLeft={4} marginTop={1} 
             borderStyle="round" borderColor={Colors.AccentBlue} paddingX={1}>
          <Text bold color={Colors.AccentBlue}>Execute {metadata.name}</Text>
          
          {/* Parameter inputs */}
          {Object.entries(metadata.parameters).map(([paramName, schema]) => (
            <Box key={`param-${paramName}`} flexDirection="column" marginY={1}>
              <Text bold>{paramName}</Text>
              <Text color={Colors.TextDim}>{(schema as any).description || ''}</Text>
              <Box 
                borderStyle="round" 
                borderColor={Colors.TextDim} 
                marginTop={1}
                paddingX={1}
              >
                <Text color={Colors.Text}>
                  {params[paramName] || ''}
                </Text>
              </Box>
            </Box>
          ))}
          
          {/* Execute and cancel buttons */}
          <Box marginTop={1} justifyContent="flex-end">
            <Box marginRight={2}>
              <Text color={Colors.Error} underline>
                [Cancel]
              </Text>
            </Box>
            <Box>
              <Text color={Colors.Success} underline>
                [Execute]
              </Text>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ToolItem;