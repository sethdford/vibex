/**
 * MCP Tool Confirmation Component
 * 
 * Provides a specialized confirmation UI for MCP tool execution,
 * allowing users to approve or deny tool execution requests
 * with granular trust levels.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import SelectInput from 'ink-select-input';
import {
  ToolConfirmationDetails,
  ToolConfirmationOutcome
} from '../../../core/domain/tool/tool-interfaces';
import { MCPToolDefinition } from '../../../tools/mcp-client';

// Simple radio button select item type
interface RadioButtonSelectItem<T> {
  label: string;
  value: T;
}

/**
 * Props for the MCPToolConfirmation component
 */
export interface MCPToolConfirmationProps {
  /**
   * Details of the confirmation request
   */
  confirmationDetails: ToolConfirmationDetails;
  
  /**
   * MCP tool definition
   */
  toolDefinition?: MCPToolDefinition;
  
  /**
   * Server name
   */
  serverName: string;
  
  /**
   * Whether the component has input focus
   */
  isFocused?: boolean;
  
  /**
   * Callback when the user makes a decision
   */
  onConfirm: (outcome: ToolConfirmationOutcome) => void;
  
  /**
   * Terminal width in columns
   */
  terminalWidth?: number;
}

/**
 * MCP Tool Confirmation Component
 */
export const MCPToolConfirmation: React.FC<MCPToolConfirmationProps> = ({
  confirmationDetails,
  toolDefinition,
  serverName,
  isFocused = true,
  onConfirm,
  terminalWidth = 80
}) => {
  const { title, description, type } = confirmationDetails;
  const childWidth = terminalWidth - 4; // 4 for padding
  
  // Options for the radio button select
  const options: RadioButtonSelectItem<ToolConfirmationOutcome>[] = [
    {
      label: 'Yes, allow once',
      value: ToolConfirmationOutcome.ProceedOnce
    },
    {
      label: `Yes, always allow this tool from "${serverName}"`,
      value: ToolConfirmationOutcome.ProceedAlways
    },
    {
      label: `Yes, always allow all tools from "${serverName}"`,
      value: ToolConfirmationOutcome.ProceedAlwaysServer
    },
    { 
      label: 'No, cancel (esc)',
      value: ToolConfirmationOutcome.Cancelled
    }
  ];
  
  // Handle select
  const handleSelect = ({ value }: { value: ToolConfirmationOutcome }) => {
    onConfirm(value);
  };
  
  return (
    <Box 
      flexDirection="column" 
      padding={1} 
      width={childWidth}
      borderStyle="round"
      borderColor={type === 'warning' ? Colors.Warning : Colors.TextDim}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={type === 'warning' ? Colors.Warning : Colors.Info}>
          {title || 'MCP Tool Execution Request'}
        </Text>
      </Box>
      
      {/* Description */}
      <Box marginBottom={1}>
        <Text>
          {description || `Do you want to allow execution of this MCP tool?`}
        </Text>
      </Box>
      
      {/* Tool Information */}
      <Box flexDirection="column" marginBottom={1} paddingX={1}>
        <Text color={Colors.Info}>Server: <Text bold>{serverName}</Text></Text>
        <Text color={Colors.Info}>Tool: <Text bold>{toolDefinition?.name || 'Unknown'}</Text></Text>
        
        {/* Tool Description if available */}
        {toolDefinition?.description && (
          <Text dimColor wrap="wrap" marginTop={1}>
            {toolDefinition.description}
          </Text>
        )}
      </Box>
      
      {/* Parameters Preview if available */}
      {confirmationDetails.params && Object.keys(confirmationDetails.params).length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Parameters:</Text>
          <Box marginLeft={2} flexDirection="column">
            {Object.entries(confirmationDetails.params).map(([key, value]) => (
              <Text key={key} wrap="truncate">
                <Text color={Colors.Success}>{key}:</Text> 
                <Text> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</Text>
              </Text>
            ))}
          </Box>
        </Box>
      )}
      
      {/* Security Notice */}
      <Box marginBottom={1} paddingX={1}>
        <Text italic color={Colors.TextDim}>
          MCP tools execute code on remote servers. Only approve tools from trusted sources.
        </Text>
      </Box>
      
      {/* Options */}
      <Box>
        <SelectInput
          items={options}
          onSelect={handleSelect}
          isFocused={isFocused}
        />
      </Box>
    </Box>
  );
};

export default MCPToolConfirmation;