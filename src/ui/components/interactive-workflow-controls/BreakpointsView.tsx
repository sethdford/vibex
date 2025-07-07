/**
 * Breakpoints View - Clean Architecture like Gemini CLI
 * 
 * Display component for debugging breakpoints
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { WorkflowDefinition } from '../task-orchestrator/index.js';
import { DebugBreakpoint } from './types.js';

/**
 * Breakpoints view props
 */
interface BreakpointsViewProps {
  breakpoints: DebugBreakpoint[];
  workflow?: WorkflowDefinition;
  onRemove: (breakpointId: string) => void;
  onToggle: (breakpointId: string) => void;
  compact?: boolean;
}

/**
 * Breakpoints view component
 */
export const BreakpointsView: React.FC<BreakpointsViewProps> = ({
  breakpoints,
  workflow,
  onRemove,
  onToggle,
  compact = false,
}) => {
  if (breakpoints.length === 0) {
    return null;
  }

  const getTaskName = (taskId: string): string => {
    if (!workflow || !workflow.tasks) {
      return taskId;
    }
    
    const task = workflow.tasks.find(t => t.id === taskId);
    return task?.name || taskId;
  };

  if (compact) {
    const activeBreakpoints = breakpoints.filter(bp => bp.enabled);
    return (
      <Box marginBottom={1}>
        <Text color={Colors.Info}>
          🔴 {activeBreakpoints.length}/{breakpoints.length} breakpoints
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box borderStyle="round" borderColor={Colors.Info} paddingX={1}>
        <Text color={Colors.Info} bold>
          🔴 Breakpoints ({breakpoints.length})
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1} paddingX={1}>
        {breakpoints.map((breakpoint, index) => (
          <Box key={breakpoint.id} marginBottom={index < breakpoints.length - 1 ? 1 : 0}>
            <Box>
              <Text color={breakpoint.enabled ? Colors.Error : Colors.TextDim}>
                {breakpoint.enabled ? '●' : '○'}
              </Text>
              
              <Box marginLeft={1}>
                <Text color={breakpoint.enabled ? Colors.Text : Colors.TextDim}>
                  {getTaskName(breakpoint.taskId)}
                </Text>
              </Box>
              
              {breakpoint.hitCount > 0 && (
                <Box marginLeft={2}>
                  <Text color={Colors.Warning}>
                    ({breakpoint.hitCount} hits)
                  </Text>
                </Box>
              )}
            </Box>
            
            {breakpoint.condition && (
              <Box marginLeft={2} marginTop={0}>
                <Text color={Colors.TextDim}>
                  Condition: {breakpoint.condition}
                </Text>
              </Box>
            )}
            
            {breakpoint.description && (
              <Box marginLeft={2} marginTop={0}>
                <Text color={Colors.TextDim}>
                  {breakpoint.description}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text color={Colors.TextDim}>
          Breakpoint Commands: B: Toggle • Del: Remove
        </Text>
      </Box>
    </Box>
  );
};

export default BreakpointsView; 