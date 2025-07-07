/**
 * Workflow Header Component - Clean Architecture like Gemini CLI
 * 
 * Focused component for rendering workflow headers, status, and overall progress
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ProgressSystem } from '../progress-system/index.js';
import type { WorkflowDefinition, TaskOrchestratorConfig } from './types.js';
import { TaskStatusService } from './TaskStatusService.js';
import { TaskDisplayService } from './TaskDisplayService.js';

/**
 * Workflow header props
 */
export interface WorkflowHeaderProps {
  workflow: WorkflowDefinition;
  config: TaskOrchestratorConfig;
  isFocused: boolean;
}

/**
 * Workflow header component
 */
export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  workflow,
  config,
  isFocused,
}) => {
  const statusIcon = TaskStatusService.getTaskStatusIcon(workflow.status as any);
  const stats = TaskDisplayService.getWorkflowStats(workflow);

  /**
   * Render workflow controls hint
   */
  const renderControlsHint = (): React.ReactNode => {
    if (!isFocused) return null;

    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          ↑/↓: Navigate • Enter: Expand • S: Sub-tasks • R: Retry • P: Pause/Resume • C: Cancel
        </Text>
      </Box>
    );
  };

  /**
   * Render workflow statistics
   */
  const renderWorkflowStats = (): React.ReactNode => {
    if (config.compact) return null;

    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Tasks: {stats.completed}/{stats.total} completed
        </Text>
        {stats.failed > 0 && (
          <Text color={Colors.Error}> • {stats.failed} failed</Text>
        )}
        {stats.inProgress > 0 && (
          <Text color={Colors.Info}> • {stats.inProgress} in progress</Text>
        )}
        {stats.pending > 0 && (
          <Text color={Colors.TextDim}> • {stats.pending} pending</Text>
        )}
      </Box>
    );
  };

  /**
   * Render overall progress bar
   */
  const renderProgressBar = (): React.ReactNode => {
    if (workflow.progress <= 0) return null;

    return (
      <Box marginTop={1}>
        <ProgressSystem
          mode="advanced"
          value={workflow.progress}
          width={Math.min(60, config.maxWidth - 10)}
          showPercentage={true}
          showETA={true}
          showVelocity={true}
          label="Overall Progress"
          animated={workflow.status === 'running'}
          animationStyle="gradient"
          startTime={workflow.startTime}
          theme={
            workflow.status === 'completed' 
              ? 'success' 
              : workflow.status === 'failed' 
                ? 'error' 
                : 'default'
          }
          compact={config.compact}
          showMetrics={config.showDetails && !config.compact}
        />
      </Box>
    );
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Workflow title and status */}
      <Box>
        <Text color={statusIcon.color} bold>
          {statusIcon.icon}
        </Text>
        <Box marginLeft={1}>
          <Text color={Colors.Primary} bold>
            {workflow.name}
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            ({stats.completed}/{stats.total} tasks)
          </Text>
        </Box>
        {workflow.status === 'running' && (
          <Box marginLeft={2}>
            <Text color={Colors.Info}>
              [{workflow.status.toUpperCase()}]
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Workflow description */}
      {workflow.description && !config.compact && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            {workflow.description}
          </Text>
        </Box>
      )}
      
      {/* Workflow statistics */}
      {renderWorkflowStats()}
      
      {/* Overall progress */}
      {renderProgressBar()}
      
      {/* Controls hint */}
      {renderControlsHint()}
    </Box>
  );
}; 