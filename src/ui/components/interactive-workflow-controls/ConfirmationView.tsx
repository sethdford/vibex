/**
 * Confirmation View - Clean Architecture like Gemini CLI
 * 
 * Display component for confirmation dialogs
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ConfirmationAction } from './types.js';

/**
 * Confirmation view props
 */
interface ConfirmationViewProps {
  action: ConfirmationAction;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation view component
 */
export const ConfirmationView: React.FC<ConfirmationViewProps> = ({
  action,
  onConfirm,
  onCancel,
}) => {
  const getConfirmationMessage = (action: ConfirmationAction): string => {
    switch (action) {
      case 'cancel':
        return 'Cancel the current workflow? This will stop execution and cleanup resources.';
      case 'abort':
        return 'Abort the workflow immediately? This will force stop without cleanup.';
      case 'reset':
        return 'Reset all workflow state? This will clear breakpoints and retry history.';
      default:
        return 'Are you sure you want to continue?';
    }
  };

  const getConfirmationIcon = (action: ConfirmationAction): string => {
    switch (action) {
      case 'cancel':
        return '⏹️';
      case 'abort':
        return '🛑';
      case 'reset':
        return '🔄';
      default:
        return '❓';
    }
  };

  const getConfirmationColor = (action: ConfirmationAction): string => {
    switch (action) {
      case 'cancel':
        return Colors.Warning;
      case 'abort':
        return Colors.Error;
      case 'reset':
        return Colors.Info;
      default:
        return Colors.Text;
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1} borderStyle="double" borderColor={getConfirmationColor(action)}>
      <Box paddingX={1}>
        <Text color={getConfirmationColor(action)} bold>
          {getConfirmationIcon(action)} Confirm Action
        </Text>
      </Box>
      
      <Box marginTop={1} paddingX={1}>
        <Text color={Colors.Text}>
          {getConfirmationMessage(action)}
        </Text>
      </Box>
      
      <Box marginTop={1} paddingX={1}>
        <Text color={Colors.Success} bold>Y</Text>
        <Text color={Colors.TextDim}> to confirm, </Text>
        <Text color={Colors.Error} bold>N</Text>
        <Text color={Colors.TextDim}> to cancel</Text>
      </Box>
    </Box>
  );
};

export default ConfirmationView; 