/**
 * Task Orchestrator Core - Clean Architecture
 * 
 * Main orchestrator component that combines all focused services and components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import type {
  WorkflowDefinition,
  TaskDefinition,
  TaskOrchestratorConfig,
  TaskOrchestratorCallbacks,
  TaskDisplayState
} from './types.js';
import { TaskDisplayService } from './TaskDisplayService.js';
import { TaskInputHandler } from './TaskInputHandler.js';
import { WorkflowHeader } from './WorkflowHeader.js';
import { TaskRenderer } from './TaskRenderer.js';

/**
 * Task orchestrator props
 */
export interface TaskOrchestratorProps extends TaskOrchestratorConfig, TaskOrchestratorCallbacks {
  workflow?: WorkflowDefinition | null;
  isFocused?: boolean;
}

/**
 * Task orchestrator core component
 */
export const TaskOrchestratorCore: React.FC<TaskOrchestratorProps> = ({
  workflow,
  isFocused = false,
  maxWidth = 120,
  showDetails = true,
  showCompleted = true,
  autoScroll = true,
  compact = false,
  onTaskUpdate,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onWorkflowComplete,
  onError,
}) => {
  // Display state
  const [displayState, setDisplayState] = useState<TaskDisplayState>({
    selectedTaskIndex: 0,
    expandedTasks: new Set(),
    showSubTasks: new Set(),
  });

  // Configuration object
  const config: TaskOrchestratorConfig = {
    maxWidth,
    showDetails,
    showCompleted,
    autoScroll,
    compact,
  };

  // Callbacks object
  const callbacks: TaskOrchestratorCallbacks = {
    onTaskUpdate,
    onPause,
    onResume,
    onCancel,
    onRetry,
    onWorkflowComplete,
    onError,
  };

  // Get display tasks
  const displayTasks = TaskDisplayService.getDisplayTasks(workflow, config);

  // Update display state helper
  const updateDisplayState = useCallback((updates: Partial<TaskDisplayState>) => {
    setDisplayState(prev => ({ ...prev, ...updates }));
  }, []);

  // Auto-scroll to active tasks
  useEffect(() => {
    if (autoScroll && displayTasks.length > 0) {
      const activeTaskIndex = TaskDisplayService.findActiveTaskIndex(displayTasks);
      updateDisplayState({ selectedTaskIndex: activeTaskIndex });
    }
  }, [displayTasks, autoScroll, updateDisplayState]);

  // Auto-expand failed tasks
  useEffect(() => {
    if (showDetails) {
      const autoExpandTasks = displayTasks
        .filter(task => TaskDisplayService.shouldAutoExpand(task))
        .map(task => task.id);
      
      if (autoExpandTasks.length > 0) {
        const newExpandedTasks = new Set([...displayState.expandedTasks, ...autoExpandTasks]);
        updateDisplayState({ expandedTasks: newExpandedTasks });
      }
    }
  }, [displayTasks, showDetails, displayState.expandedTasks, updateDisplayState]);

  // Handle keyboard input
  useInput(
    useCallback(
      (input, key) => {
        TaskInputHandler.handleInput(
          input,
          key,
          {
            isFocused,
            displayTasks,
            displayState,
            callbacks,
          },
          updateDisplayState
        );
      },
      [isFocused, displayTasks, displayState, callbacks, updateDisplayState]
    )
  );

  // Empty state
  if (!workflow) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            No workflow loaded
          </Text>
        </Box>
      </Box>
    );
  }

  // No tasks to display
  if (displayTasks.length === 0) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        <WorkflowHeader
          workflow={workflow}
          config={config}
          isFocused={isFocused}
        />
        
        <Box marginBottom={1}>
          <Text color={Colors.TextDim}>
            {'─'.repeat(Math.min(maxWidth, 80))}
          </Text>
        </Box>
        
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            No tasks to display
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Workflow header */}
      <WorkflowHeader
        workflow={workflow}
        config={config}
        isFocused={isFocused}
      />
      
      {/* Separator */}
      <Box marginBottom={1}>
        <Text color={Colors.TextDim}>
          {'─'.repeat(Math.min(maxWidth, 80))}
        </Text>
      </Box>
      
      {/* Task list */}
      <Box flexDirection="column">
        {displayTasks.map((task, index) => (
          <TaskRenderer
            key={task.id}
            task={task}
            workflow={workflow}
            index={index}
            displayState={displayState}
            isFocused={isFocused}
            maxWidth={maxWidth}
            compact={compact}
            showDetails={showDetails}
          />
        ))}
      </Box>
    </Box>
  );
};