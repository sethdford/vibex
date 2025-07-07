/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

import { Tool, ToolCallRequest } from '../../../core/domain/tool/tool-interfaces.js';
import { ToolGroup } from './types.js';
import { ToolItem } from './ToolItem.js';

/**
 * Props for the tool group item component
 */
export interface ToolGroupItemProps {
  /**
   * Group data
   */
  group: ToolGroup;
  
  /**
   * Whether the group is expanded
   */
  isExpanded: boolean;
  
  /**
   * Whether to show documentation
   */
  showDocumentation?: boolean;
  
  /**
   * Whether to show examples
   */
  showExamples?: boolean;
  
  /**
   * Whether to allow execution
   */
  allowExecution?: boolean;
  
  /**
   * Terminal width
   */
  terminalWidth?: number;
  
  /**
   * Callback when group is toggled
   */
  onToggle: () => void;
  
  /**
   * Callback when a tool is selected
   */
  onToolSelect?: (tool: Tool) => void;
  
  /**
   * Callback when a tool is executed
   */
  onToolExecute?: (tool: Tool, params: Record<string, unknown>) => void;
}

/**
 * Tool Group Item Component
 * 
 * Displays a collapsible group of tools with a header and list of tools.
 */
export const ToolGroupItem: React.FC<ToolGroupItemProps> = ({
  group,
  isExpanded,
  showDocumentation = true,
  showExamples = true,
  allowExecution = true,
  terminalWidth = 80,
  onToggle,
  onToolSelect,
  onToolExecute,
}) => {
  // Handle tool execution
  const handleToolExecute = (request: ToolCallRequest) => {
    const tool = group.tools.find(t => t.name === request.name);
    if (tool && onToolExecute) {
      onToolExecute(tool, request.params as Record<string, unknown>);
    }
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Group header */}
      <Box 
        paddingX={1}
        paddingY={0}
        borderStyle="round" 
        borderColor={Colors.Primary}
      >
        <Box flexGrow={1}>
          {/* Toggle indicator */}
          <Text color={Colors.Info} bold>
            {isExpanded ? '▼ ' : '► '}
          </Text>
          
          {/* Group name */}
          <Text bold color={Colors.Text}>
            {group.name}
          </Text>
          
          {/* Tool count */}
          <Text color={Colors.TextDim}>
            {' '}({group.tools.length} tools)
          </Text>
        </Box>
        
        {/* Toggle hint */}
        <Text color={Colors.TextDim}>
          [Click to {isExpanded ? 'collapse' : 'expand'}]
        </Text>
      </Box>
      
      {/* Group description */}
      <Box marginLeft={2}>
        <Text color={Colors.TextDim}>{group.description}</Text>
      </Box>
      
      {/* Tool list (only shown if expanded) */}
      {isExpanded && (
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          {group.tools.map((tool, index) => (
            <ToolItem
              key={`tool-${tool.name}-${index}`}
              tool={tool}
              showDocumentation={showDocumentation}
              showExamples={showExamples}
              allowExecution={allowExecution}
              terminalWidth={terminalWidth}
              onSelect={onToolSelect ? () => onToolSelect(tool) : undefined}
              onExecute={handleToolExecute}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ToolGroupItem;