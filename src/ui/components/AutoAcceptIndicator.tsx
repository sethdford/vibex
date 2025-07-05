/**
 * Auto Accept Indicator Component
 * 
 * Displays the current auto-accept mode for tool executions.
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Enum for approval modes
 */
export enum ApprovalMode {
  DEFAULT = 'default',
  AUTO_ACCEPT = 'auto_accept',
  AUTO_REJECT = 'auto_reject'
}

/**
 * Auto accept indicator props
 */
interface AutoAcceptIndicatorProps {
  /**
   * Current approval mode
   */
  approvalMode: ApprovalMode;
}

/**
 * Auto accept indicator component
 */
export const AutoAcceptIndicator: React.FC<AutoAcceptIndicatorProps> = ({
  approvalMode,
}) => {
  // Don't render for default mode
  if (approvalMode === ApprovalMode.DEFAULT) {
    return null;
  }
  
  // Determine text and color based on mode
  let text = '';
  let color = Colors.TextDim;
  
  switch (approvalMode) {
    case ApprovalMode.AUTO_ACCEPT:
      text = 'AUTO-ACCEPT';
      color = Colors.Success;
      break;
    case ApprovalMode.AUTO_REJECT:
      text = 'AUTO-REJECT';
      color = Colors.Error;
      break;
  }
  
  return (
    <Box marginLeft={1}>
      <Text color={color}>
        [{text}]
      </Text>
    </Box>
  );
};