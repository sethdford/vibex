/**
 * Breakpoint View Component - Clean Architecture like Gemini CLI
 * 
 * Focused component for displaying and managing breakpoints
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { WorkflowBreakpoint, AdvancedControlsConfig } from './types.js';
import type { WorkflowDefinition } from '../task-orchestrator/index.js';

interface BreakpointViewProps {
  breakpoints: Map<string, WorkflowBreakpoint>;
  workflow: WorkflowDefinition;
  selectedTaskIndex: number;
  onAddBreakpoint: (taskId: string, condition?: string, description?: string) => void;
  onRemoveBreakpoint: (breakpointId: string) => void;
  onToggleBreakpoint: (breakpointId: string) => void;
  config: AdvancedControlsConfig;
}

export const BreakpointView: React.FC<BreakpointViewProps> = ({
  breakpoints,
  workflow,
  selectedTaskIndex,
  onAddBreakpoint,
  onRemoveBreakpoint,
  onToggleBreakpoint,
  config,
}) => {
  const breakpointsList = Array.from(breakpoints.values());
  
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={Colors.Primary} bold>🔴 Breakpoints ({breakpointsList.length})</Text>
      </Box>
      
      {breakpointsList.length === 0 ? (
        <Text color={Colors.TextDim}>No breakpoints set. Press 'B' to add one.</Text>
      ) : (
        breakpointsList.map(bp => {
          const task = workflow.tasks.find(t => t.id === bp.taskId);
          
          return (
            <Box key={bp.id} marginBottom={1}>
              <Text color={bp.enabled ? Colors.Error : Colors.TextDim}>
                {bp.enabled ? '●' : '○'}
              </Text>
              <Box marginLeft={1}>
                <Text color={Colors.Text}>
                  {task?.name || bp.taskId}
                </Text>
              </Box>
              {bp.condition && (
                <Box marginLeft={2}>
                  <Text color={Colors.Info}>
                    if ({bp.condition})
                  </Text>
                </Box>
              )}
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>
                  (hits: {bp.hitCount})
                </Text>
              </Box>
              {bp.description && (
                <Box marginLeft={2}>
                  <Text color={Colors.TextDim}>
                    {bp.description}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })
      )}
      
      {/* Current task info */}
      <Box marginTop={1} borderStyle="single" borderColor="blue">
        <Box flexDirection="column" padding={1}>
          <Text color={Colors.Info} bold>Selected Task:</Text>
          {workflow.tasks[selectedTaskIndex] && (
            <Box marginTop={1}>
              <Text color={Colors.Text}>
                {workflow.tasks[selectedTaskIndex].name}
              </Text>
              <Box marginTop={1}>
                <Text color={Colors.TextDim}>
                  {workflow.tasks[selectedTaskIndex].description}
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}; 