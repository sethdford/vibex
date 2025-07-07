/**
 * Debug Controls View - Clean Architecture like Gemini CLI
 * 
 * Display component for debugging controls
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { WorkflowDefinition } from '../task-orchestrator/index.js';
import { WorkflowControlState } from './types.js';

/**
 * Debug controls view props
 */
interface DebugControlsViewProps {
  controlState: WorkflowControlState;
  workflow?: WorkflowDefinition;
  selectedTaskIndex: number;
  enableStepping: boolean;
  compact?: boolean;
}

/**
 * Debug controls view component
 */
export const DebugControlsView: React.FC<DebugControlsViewProps> = ({
  controlState,
  workflow,
  selectedTaskIndex,
  enableStepping,
  compact = false,
}) => {
  const canDebug = controlState === 'paused' || controlState === 'debugging';
  
  if (!enableStepping || compact) {
    return null;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box borderStyle="round" borderColor={canDebug ? Colors.Info : Colors.TextDim} paddingX={1}>
        <Text color={canDebug ? Colors.Info : Colors.TextDim} bold>
          🐛 Debug Controls
        </Text>
        
        {canDebug ? (
          <Box marginLeft={2}>
            <Text color={Colors.Success}>
              Active
            </Text>
          </Box>
        ) : (
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              Paused Required
            </Text>
          </Box>
        )}
      </Box>

      {canDebug && (
        <Box marginTop={1} paddingX={1}>
          <Text color={Colors.TextDim}>
            Step Commands: S: Step • I: Into • O: Over • U: Out
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default DebugControlsView; 