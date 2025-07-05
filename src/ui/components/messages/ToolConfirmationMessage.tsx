/**
 * Tool Confirmation Message Component
 * 
 * Displays a confirmation dialog for tool operations that require user approval.
 * Supports various confirmation types:
 * - File edits with diff display
 * - Command execution
 * - MCP tool execution
 * - General information/URL confirmation
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { DiffRenderer } from '../DiffRenderer.js';
import { 
  ToolCallConfirmationDetails,
  ToolConfirmationOutcome,
  ToolEditConfirmationDetails,
  ToolExecuteConfirmationDetails,
  ToolMcpConfirmationDetails,
  ToolInfoConfirmationDetails
} from '../../../tools/types.js';
import SelectInput from 'ink-select-input';

// Simple radio button select item type
export interface RadioButtonSelectItem<T> {
  label: string;
  value: T;
}

/**
 * Props for the ToolConfirmationMessage component
 */
export interface ToolConfirmationMessageProps {
  /**
   * Details of the confirmation request
   */
  confirmationDetails: ToolCallConfirmationDetails;
  
  /**
   * Whether the component has input focus
   */
  isFocused?: boolean;
  
  /**
   * Available terminal height in lines
   */
  availableTerminalHeight?: number;
  
  /**
   * Terminal width in columns
   */
  terminalWidth: number;
}

/**
 * Component for displaying tool confirmation requests
 */
export const ToolConfirmationMessage: React.FC<ToolConfirmationMessageProps> = ({
  confirmationDetails,
  isFocused = true,
  availableTerminalHeight,
  terminalWidth
}) => {
  const { onConfirm } = confirmationDetails;
  const childWidth = terminalWidth - 2; // 2 for padding
  
  // Handle ESC key press to cancel
  useInput((_, key) => {
    if (!isFocused) return;
    if (key.escape) {
      onConfirm(ToolConfirmationOutcome.Cancel);
    }
  });
  
  const handleSelect = ({ value }: { value: ToolConfirmationOutcome }) => onConfirm(value);
  
  // Content to display in the body area
  let bodyContent: React.ReactNode | null = null;
  
  // Question to display above the options
  let question: string;
  
  // Options for the radio button select
  const options: RadioButtonSelectItem<ToolConfirmationOutcome>[] = [];
  
  /**
   * Calculate the available height for the body content
   */
  function calculateBodyContentHeight(): number | undefined {
    if (options.length === 0) {
      return undefined;
    }
    
    if (availableTerminalHeight === undefined) {
      return undefined;
    }
    
    // Calculate the space taken by surrounding elements
    const paddingOuterY = 2;  // Main container padding (top & bottom)
    const marginBodyBottom = 1; // Bottom margin for body content
    const heightQuestion = 1; // Height of question text
    const marginQuestionBottom = 1; // Bottom margin for question
    const heightOptions = options.length; // Each option is one line
    
    const surroundingHeight =
      paddingOuterY +
      marginBodyBottom +
      heightQuestion +
      marginQuestionBottom +
      heightOptions;
      
    return Math.max(availableTerminalHeight - surroundingHeight, 1);
  }
  
  // Handle different confirmation types
  if (confirmationDetails.type === 'edit') {
    const editDetails = confirmationDetails as ToolEditConfirmationDetails;
    
    // Show special message when file is being edited externally
    if (editDetails.isModifying) {
      return (
        <Box
          minWidth="90%"
          borderStyle="round"
          borderColor={Colors.TextDim}
          justifyContent="space-around"
          padding={1}
          overflow="hidden"
        >
          <Text>Modify in progress: </Text>
          <Text color={Colors.Success}>
            Save and close external editor to continue
          </Text>
        </Box>
      );
    }
    
    question = `Apply this change?`;
    options.push(
      {
        label: 'Yes, allow once',
        value: ToolConfirmationOutcome.ProceedOnce
      },
      {
        label: 'Yes, allow always',
        value: ToolConfirmationOutcome.ProceedAlways
      },
      {
        label: 'Modify with external editor',
        value: ToolConfirmationOutcome.ModifyWithEditor
      },
      { 
        label: 'No (esc)', 
        value: ToolConfirmationOutcome.Cancel 
      }
    );
    
    bodyContent = (
      <Box flexDirection="column" paddingX={1} marginLeft={1}>
        <Text color={Colors.TextDim}>File: {editDetails.fileName}</Text>
        <Box marginTop={1}>
          <Text color={Colors.Info}>{editDetails.fileDiff}</Text>
        </Box>
      </Box>
    );
  } 
  else if (confirmationDetails.type === 'exec') {
    const execDetails = confirmationDetails as ToolExecuteConfirmationDetails;
    
    question = `Allow execution?`;
    options.push(
      {
        label: 'Yes, allow once',
        value: ToolConfirmationOutcome.ProceedOnce
      },
      {
        label: `Yes, always allow "${execDetails.rootCommand} ..."`,
        value: ToolConfirmationOutcome.ProceedAlways
      },
      { 
        label: 'No (esc)', 
        value: ToolConfirmationOutcome.Cancel 
      }
    );
    
    let bodyContentHeight = calculateBodyContentHeight();
    if (bodyContentHeight !== undefined) {
      bodyContentHeight -= 2; // Account for padding
    }
    
    bodyContent = (
      <Box flexDirection="column">
        <Box paddingX={1} marginLeft={1}>
          <Box>
            <Text color={Colors.Info}>{execDetails.command}</Text>
          </Box>
        </Box>
      </Box>
    );
  }
  else if (confirmationDetails.type === 'info') {
    const infoDetails = confirmationDetails as ToolInfoConfirmationDetails;
    
    // Check if we need to display URLs separately
    const displayUrls = 
      infoDetails.urls && 
      !(infoDetails.urls.length === 1 && infoDetails.urls[0] === infoDetails.prompt);
    
    question = `Do you want to proceed?`;
    options.push(
      {
        label: 'Yes, allow once',
        value: ToolConfirmationOutcome.ProceedOnce
      },
      {
        label: 'Yes, allow always',
        value: ToolConfirmationOutcome.ProceedAlways
      },
      { 
        label: 'No (esc)', 
        value: ToolConfirmationOutcome.Cancel 
      }
    );
    
    bodyContent = (
      <Box flexDirection="column" paddingX={1} marginLeft={1}>
        <Text color={Colors.Info}>{infoDetails.prompt}</Text>
        {displayUrls && infoDetails.urls && infoDetails.urls.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text>URLs to fetch:</Text>
            {infoDetails.urls.map((url) => (
              <Text key={url}> - {url}</Text>
            ))}
          </Box>
        )}
      </Box>
    );
  }
  else {
    // MCP tool confirmation
    const mcpDetails = confirmationDetails as ToolMcpConfirmationDetails;
    
    question = `Allow execution of MCP tool "${mcpDetails.toolName}" from server "${mcpDetails.serverName}"?`;
    options.push(
      {
        label: 'Yes, allow once',
        value: ToolConfirmationOutcome.ProceedOnce
      },
      {
        label: `Yes, always allow tool "${mcpDetails.toolName}" from server "${mcpDetails.serverName}"`,
        value: ToolConfirmationOutcome.ProceedAlwaysTool
      },
      {
        label: `Yes, always allow all tools from server "${mcpDetails.serverName}"`,
        value: ToolConfirmationOutcome.ProceedAlwaysServer
      },
      { 
        label: 'No (esc)', 
        value: ToolConfirmationOutcome.Cancel 
      }
    );
    
    bodyContent = (
      <Box flexDirection="column" paddingX={1} marginLeft={1}>
        <Text color={Colors.Info}>MCP Server: {mcpDetails.serverName}</Text>
        <Text color={Colors.Info}>Tool: {mcpDetails.toolName}</Text>
      </Box>
    );
  }
  
  return (
    <Box 
      flexDirection="column" 
      padding={1} 
      width={childWidth}
      borderStyle="round"
      borderColor={Colors.TextDim}
    >
      {/* Body Content (Diff Renderer or Command Info) */}
      <Box flexGrow={1} flexShrink={1} overflow="hidden" marginBottom={1}>
        {bodyContent}
      </Box>
      
      {/* Confirmation Question */}
      <Box marginBottom={1} flexShrink={0}>
        <Text wrap="truncate">{question}</Text>
      </Box>
      
      {/* Options */}
      <Box flexShrink={0}>
        <SelectInput
          items={options}
          onSelect={handleSelect}
          isFocused={isFocused}
        />
      </Box>
    </Box>
  );
};

export default ToolConfirmationMessage;