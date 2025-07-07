/**
 * Main Controls View - Clean Architecture like Gemini CLI
 * 
 * Display component for main workflow controls
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { WorkflowDefinition } from '../task-orchestrator/index.js';
import { WorkflowControlState } from './types.js';
import { ControlStateService } from './ControlStateService.js';

/**
 * Main controls view props
 */
interface MainControlsViewProps {
  controlState: WorkflowControlState;
  workflow?: WorkflowDefinition;
  selectedTaskIndex: number;
  controlStateService: ControlStateService;
  compact?: boolean;
  maxWidth?: number;
}

/**
 * Main controls view component
 */
export const MainControlsView: React.FC<MainControlsViewProps> = ({
  controlState,
  workflow,
  selectedTaskIndex,
  controlStateService,
  compact = false,
  maxWidth = 100,
}) => {
  const stateIcon = controlStateService.getControlStateIcon();
  const stateLabel = controlStateService.getControlStateLabel();
  const validActions = controlStateService.getValidActions();

  const getCurrentTask = () => {
    if (!workflow || !workflow.tasks || selectedTaskIndex >= workflow.tasks.length) {
      return null;
    }
    return workflow.tasks[selectedTaskIndex];
  };

  const currentTask = getCurrentTask();

  if (compact) {
    return (
      <Box marginBottom={1}>
        <Text color={Colors.Info}>
          {stateIcon} {stateLabel}
        </Text>
        {currentTask && (
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              {currentTask.name}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1} width={maxWidth}>
      {/* Control state header */}
      <Box borderStyle="round" borderColor={getStateColor(controlState)} paddingX={1}>
        <Box>
          <Text color={getStateColor(controlState)} bold>
            {stateIcon} Workflow Controls
          </Text>
        </Box>
        
        <Box marginLeft={2}>
          <Text color={Colors.Text}>
            Status: 
          </Text>
          <Box marginLeft={1}>
            <Text color={getStateColor(controlState)} bold>
              {stateLabel}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Current task info */}
      {currentTask && (
        <Box marginTop={1} paddingX={1}>
          <Text color={Colors.Text}>
            Current Task: 
          </Text>
          <Box marginLeft={1}>
            <Text color={Colors.Info}>
              {currentTask.name}
            </Text>
          </Box>
          
          {currentTask.description && (
            <Box marginLeft={1}>
              <Text color={Colors.TextDim}>
                {currentTask.description.length > 50 
                  ? `${currentTask.description.substring(0, 50)}...`
                  : currentTask.description
                }
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Available actions */}
      {validActions.length > 0 && (
        <Box marginTop={1} paddingX={1}>
          <Text color={Colors.TextDim}>
            Available: {getActionLabels(validActions).join(', ')}
          </Text>
        </Box>
      )}

      {/* Workflow progress */}
      {workflow && workflow.tasks && (
        <Box marginTop={1} paddingX={1}>
          <Text color={Colors.TextDim}>
            Progress: {selectedTaskIndex + 1} / {workflow.tasks.length}
          </Text>
          
          {/* Simple progress bar */}
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              {renderProgressBar(selectedTaskIndex + 1, workflow.tasks.length, 20)}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

/**
 * Get color for control state
 */
function getStateColor(state: WorkflowControlState): string {
  switch (state) {
    case 'idle':
      return Colors.TextDim;
    case 'running':
      return Colors.Success;
    case 'paused':
      return Colors.Warning;
    case 'debugging':
      return Colors.Info;
    case 'cancelling':
      return Colors.Warning;
    case 'completed':
      return Colors.Success;
    case 'failed':
      return Colors.Error;
    default:
      return Colors.Text;
  }
}

/**
 * Get action labels for display
 */
function getActionLabels(actions: string[]): string[] {
  const labelMap: Record<string, string> = {
    'play': 'Play',
    'pause': 'Pause',
    'resume': 'Resume',
    'cancel': 'Cancel',
    'abort': 'Abort',
    'step': 'Step',
    'step_into': 'Step Into',
    'step_over': 'Step Over',
    'step_out': 'Step Out',
    'reset': 'Reset'
  };

  return actions.map(action => labelMap[action] || action);
}

/**
 * Render simple progress bar
 */
function renderProgressBar(current: number, total: number, width: number): string {
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(percentage * width);
  const empty = width - filled;
  
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default MainControlsView; 