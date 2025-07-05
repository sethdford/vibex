/**
 * Context Summary Display Component
 * 
 * Displays information about the current context files and tools.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * MCP Server interface
 */
export interface MCPServerInfo {
  name?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Context summary display props
 */
interface ContextSummaryDisplayProps {
  /**
   * Number of context files loaded
   */
  contextFileCount: number;
  
  /**
   * Names of context files
   */
  contextFileNames: string[];
  
  /**
   * Whether tool descriptions are shown
   */
  showToolDescriptions: boolean;
  
  /**
   * Available MCP servers (optional)
   */
  mcpServers?: Record<string, MCPServerInfo>;
}

/**
 * Context summary display component
 */
export const ContextSummaryDisplay: React.FC<ContextSummaryDisplayProps> = ({
  contextFileCount,
  contextFileNames,
  showToolDescriptions,
  mcpServers = {},
}) => {
  // Determine if any context files are loaded
  const hasContext = contextFileCount > 0;
  
  // Count MCP servers if available
  const mcpServerCount = Object.keys(mcpServers || {}).length;
  
  return (
    <Box>
      {hasContext && (
        <Text color={Colors.Info}>
          {contextFileCount === 1 ? 'Context file loaded' : `${contextFileCount} context files loaded`}
          {contextFileNames.length > 0 && ` (${contextFileNames.join(', ')})`}
        </Text>
      )}
      
      {mcpServerCount > 0 && (
        <Text color={Colors.Success}>
          {' • '}
          {mcpServerCount === 1 ? '1 MCP server connected' : `${mcpServerCount} MCP servers connected`}
        </Text>
      )}
      
      {(hasContext || mcpServerCount > 0) && (
        <Text color={Colors.TextDim}>
          {' • '}
          Tool descriptions: {showToolDescriptions ? 'on' : 'off'} (Ctrl+T)
        </Text>
      )}
    </Box>
  );
};