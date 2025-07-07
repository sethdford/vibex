/**
 * Tool Confirmation Dialog Component
 * 
 * A specialized dialog for confirming tool executions with different
 * confirmation types, trust levels, and parameter modification.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { ToolInputParameters } from './EnhancedToolMessage.js';

/**
 * Confirmation type enum
 */
export enum ConfirmationType {
  EDIT = 'edit',       // File editing operations
  EXEC = 'exec',       // Command execution
  SENSITIVE = 'sensitive', // Operations with security implications
  INFO = 'info',       // Information access operations
  MCP = 'mcp',         // MCP tool operations
}

/**
 * Trust level enum
 */
export enum TrustLevel {
  ONCE = 'once',           // Allow this specific execution
  ALWAYS = 'always',       // Always allow this tool
  PATTERN = 'pattern',     // Allow tools matching a pattern
  NEVER = 'never',         // Never allow this tool
}

/**
 * Confirmation option interface
 */
export interface ConfirmationOption {
  /**
   * Option key (for keyboard selection)
   */
  key: string;
  
  /**
   * Option label
   */
  label: string;
  
  /**
   * Option description
   */
  description?: string;
  
  /**
   * Trust level this option represents
   */
  trustLevel: TrustLevel;
  
  /**
   * Whether this option modifies parameters
   */
  modifiesParameters?: boolean;
}

/**
 * Tool confirmation dialog props
 */
export interface ToolConfirmationDialogProps {
  /**
   * Tool name
   */
  toolName: string;
  
  /**
   * Tool namespace
   */
  toolNamespace?: string;
  
  /**
   * Tool description
   */
  toolDescription?: string;
  
  /**
   * Tool input parameters
   */
  parameters: ToolInputParameters;
  
  /**
   * Confirmation type
   */
  confirmationType: ConfirmationType;
  
  /**
   * Preview content (e.g., diff for file edits, command details for exec)
   */
  previewContent?: string;
  
  /**
   * Terminal width for responsive layout
   */
  terminalWidth?: number;
  
  /**
   * Callback when user confirms execution
   */
  onConfirm: (trustLevel: TrustLevel, modifiedParams?: ToolInputParameters) => void;
  
  /**
   * Callback when user cancels execution
   */
  onCancel: () => void;
}

/**
 * Standard confirmation options
 */
const standardConfirmationOptions: ConfirmationOption[] = [
  {
    key: 'y',
    label: 'Yes',
    description: 'Allow this execution only',
    trustLevel: TrustLevel.ONCE,
  },
  {
    key: 'a',
    label: 'Always',
    description: 'Always allow this tool',
    trustLevel: TrustLevel.ALWAYS,
  },
  {
    key: 'e',
    label: 'Edit',
    description: 'Modify parameters before execution',
    trustLevel: TrustLevel.ONCE,
    modifiesParameters: true,
  },
  {
    key: 'n',
    label: 'No',
    description: 'Cancel this execution',
    trustLevel: TrustLevel.NEVER,
  },
];

/**
 * Get options based on confirmation type
 */
const getConfirmationOptions = (confirmationType: ConfirmationType): ConfirmationOption[] => {
  switch (confirmationType) {
    case ConfirmationType.EDIT:
      return [
        ...standardConfirmationOptions,
        {
          key: 'p',
          label: 'Pattern',
          description: 'Allow similar file operations',
          trustLevel: TrustLevel.PATTERN,
        },
      ];
    
    case ConfirmationType.EXEC:
      return [
        ...standardConfirmationOptions,
        {
          key: 'p',
          label: 'Pattern',
          description: 'Allow commands matching this pattern',
          trustLevel: TrustLevel.PATTERN,
        },
      ];
    
    case ConfirmationType.SENSITIVE:
      // Remove "Always" option for sensitive operations
      return standardConfirmationOptions.filter(
        option => option.trustLevel !== TrustLevel.ALWAYS
      );
    
    case ConfirmationType.MCP:
      return [
        ...standardConfirmationOptions,
        {
          key: 't',
          label: 'Trust',
          description: 'Trust this MCP server for all tools',
          trustLevel: TrustLevel.PATTERN,
        },
      ];
    
    case ConfirmationType.INFO:
    default:
      return standardConfirmationOptions;
  }
};

/**
 * Get color based on confirmation type
 */
const getConfirmationColor = (confirmationType: ConfirmationType): string => {
  switch (confirmationType) {
    case ConfirmationType.EDIT:
      return Colors.AccentBlue;
    case ConfirmationType.EXEC:
      return Colors.Warning;
    case ConfirmationType.SENSITIVE:
      return Colors.Error;
    case ConfirmationType.MCP:
      return Colors.AccentPurple;
    case ConfirmationType.INFO:
    default:
      return Colors.Info;
  }
};

/**
 * Get title based on confirmation type
 */
const getConfirmationTitle = (confirmationType: ConfirmationType): string => {
  switch (confirmationType) {
    case ConfirmationType.EDIT:
      return 'Confirm File Edit';
    case ConfirmationType.EXEC:
      return 'Confirm Command Execution';
    case ConfirmationType.SENSITIVE:
      return 'Security Warning';
    case ConfirmationType.MCP:
      return 'Confirm MCP Tool Execution';
    case ConfirmationType.INFO:
    default:
      return 'Confirm Tool Execution';
  }
};

/**
 * Format parameters for display
 */
const formatParameters = (params: ToolInputParameters): string => {
  try {
    return JSON.stringify(params, null, 2);
  } catch (error) {
    return String(params);
  }
};

/**
 * Tool confirmation dialog component
 */
export const ToolConfirmationDialog: React.FC<ToolConfirmationDialogProps> = ({
  toolName,
  toolNamespace,
  toolDescription,
  parameters,
  confirmationType,
  previewContent,
  terminalWidth = 80,
  onConfirm,
  onCancel,
}) => {
  // Get options based on confirmation type
  const options = getConfirmationOptions(confirmationType);
  const confirmationColor = getConfirmationColor(confirmationType);
  const title = getConfirmationTitle(confirmationType);
  
  // State for parameter editing mode
  const [isEditingParams, setIsEditingParams] = useState(false);
  const [modifiedParams, setModifiedParams] = useState<string>(formatParameters(parameters));
  const [editError, setEditError] = useState<string | null>(null);
  
  // Save edited parameters
  const saveModifiedParams = useCallback(() => {
    try {
      const parsedParams = JSON.parse(modifiedParams);
      setIsEditingParams(false);
      setEditError(null);
      onConfirm(TrustLevel.ONCE, parsedParams);
    } catch (error) {
      setEditError('Invalid JSON format');
    }
  }, [modifiedParams, onConfirm]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (isEditingParams) {
      if (key.escape) {
        setIsEditingParams(false);
        setEditError(null);
      } else if (key.return && key.ctrl) {
        saveModifiedParams();
      }
    } else {
      const option = options.find(opt => opt.key.toLowerCase() === input.toLowerCase());
      
      if (option) {
        if (option.modifiesParameters) {
          setIsEditingParams(true);
        } else {
          onConfirm(option.trustLevel);
        }
      } else if (key.escape) {
        onCancel();
      }
    }
  });
  
  // Dialog content width
  const contentWidth = Math.min(terminalWidth - 4, 100);
  
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={confirmationColor}
      padding={1}
      width={contentWidth + 4}
    >
      {/* Dialog title */}
      <Box justifyContent="center" marginBottom={1}>
        <Text color={confirmationColor} bold>
          {title}
        </Text>
      </Box>
      
      {/* Tool information */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color={Colors.TextDim}>Tool: </Text>
          <Text bold>
            {toolNamespace ? `${toolNamespace}:${toolName}` : toolName}
          </Text>
        </Text>
        
        {toolDescription && (
          <Text color={Colors.TextDim}>
            {toolDescription}
          </Text>
        )}
      </Box>
      
      {/* Parameters section */}
      {isEditingParams ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Edit Parameters:</Text>
          <Box
            borderStyle="single"
            borderColor={editError ? Colors.Error : Colors.TextDim}
            paddingX={1}
            paddingY={1}
            marginTop={1}
            flexDirection="column"
          >
            <Text>{modifiedParams}</Text>
          </Box>
          
          {editError && (
            <Text color={Colors.Error}>{editError}</Text>
          )}
          
          <Box marginTop={1}>
            <Text color={Colors.TextDim}>
              Ctrl+Enter to save, Esc to cancel
            </Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Parameters:</Text>
          <Box
            borderStyle="single"
            borderColor={Colors.TextDim}
            paddingX={1}
            paddingY={1}
            marginTop={1}
            flexDirection="column"
          >
            <Text>{formatParameters(parameters)}</Text>
          </Box>
        </Box>
      )}
      
      {/* Preview content */}
      {previewContent && !isEditingParams && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Preview:</Text>
          <Box
            borderStyle="single"
            borderColor={Colors.TextDim}
            paddingX={1}
            paddingY={1}
            marginTop={1}
            flexDirection="column"
          >
            <Text>{previewContent}</Text>
          </Box>
        </Box>
      )}
      
      {/* Options */}
      {!isEditingParams && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Options:</Text>
          
          {options.map((option) => (
            <Box key={option.key} marginTop={1}>
              <Text>
                <Text color={confirmationColor} bold>[{option.key}]</Text>
                <Text bold> {option.label}</Text>
                {option.description && (
                  <Text color={Colors.TextDim}> - {option.description}</Text>
                )}
              </Text>
            </Box>
          ))}
          
          <Box marginTop={1}>
            <Text color={Colors.TextDim}>
              Press <Text color={confirmationColor}>Esc</Text> to cancel
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ToolConfirmationDialog;