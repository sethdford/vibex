/**
 * Task Renderer Component - Clean Architecture like Gemini CLI
 * 
 * Focused component for rendering individual tasks with all their details
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { ProgressSystem } from '../progress-system/index.js';
import type { TaskDefinition, WorkflowDefinition, TaskDisplayState } from './types.js';
import { TaskStatusService } from './TaskStatusService.js';
import { TaskTimeService } from './TaskTimeService.js';
import { TaskDisplayService } from './TaskDisplayService.js';

/**
 * Task renderer props
 */
export interface TaskRendererProps {
  task: TaskDefinition;
  workflow: WorkflowDefinition;
  index: number;
  displayState: TaskDisplayState;
  isFocused: boolean;
  maxWidth: number;
  compact: boolean;
  showDetails: boolean;
}

/**
 * Task renderer component
 */
export const TaskRenderer: React.FC<TaskRendererProps> = ({
  task,
  workflow,
  index,
  displayState,
  isFocused,
  maxWidth,
  compact,
  showDetails,
}) => {
  const isSelected = isFocused && index === displayState.selectedTaskIndex;
  const isExpanded = displayState.expandedTasks.has(task.id);
  const showSubTasks = displayState.showSubTasks.has(task.id);
  
  const statusIcon = TaskStatusService.getTaskStatusIcon(task.status);
  const priorityIcon = TaskStatusService.getPriorityIndicator(task.priority);

  /**
   * Render task progress
   */
  const renderTaskProgress = (): React.ReactNode => {
    if (task.status === 'completed') {
      return (
        <Box marginLeft={1}>
          <Text color={Colors.Success}>✓ Done</Text>
          {task.result?.metrics && (
            <Text color={Colors.TextDim}> ({TaskTimeService.getElapsedTime(task)})</Text>
          )}
        </Box>
      );
    }
    
    if (task.status === 'failed') {
      return (
        <Box marginLeft={1}>
          <Text color={Colors.Error}>✗ Failed</Text>
          {task.retryable && (
            <Text color={Colors.TextDim}> (Press 'r' to retry)</Text>
          )}
        </Box>
      );
    }
    
    if (task.status === 'in_progress') {
      if (task.progress > 0) {
        return (
          <Box marginLeft={1}>
            <ProgressSystem
              mode="standard"
              value={task.progress}
              width={Math.min(30, maxWidth - 40)}
              showPercentage={true}
              label=""
              animated={true}
              showETA={task.estimatedDuration !== undefined}
              startTime={task.startTime}
              estimatedDuration={task.estimatedDuration}
            />
          </Box>
        );
      } else {
        return (
          <Box marginLeft={1}>
            <ProgressSystem
              mode="indeterminate"
              active={true}
              width={Math.min(20, maxWidth - 40)}
              label=""
              message={task.currentStep || 'Processing...'}
              animationStyle="bounce"
            />
          </Box>
        );
      }
    }
    
    return null;
  };

  /**
   * Render task dependencies
   */
  const renderTaskDependencies = (): React.ReactNode => {
    if (!task.dependencies.length || !showDetails) return null;
    
    const depStatus = TaskDisplayService.getTaskDependenciesStatus(task, workflow);
    
    return (
      <Box marginLeft={3} marginTop={1}>
        <Text color={Colors.TextDim}>
          Dependencies: {depStatus.completed}/{depStatus.total} completed
        </Text>
        {!depStatus.allCompleted && (
          <Text color={Colors.Warning}> (waiting)</Text>
        )}
      </Box>
    );
  };

  /**
   * Render tool calls
   */
  const renderToolCalls = (): React.ReactNode => {
    if (!task.toolCalls.length || !isExpanded || !showDetails) return null;
    
    return (
      <Box flexDirection="column" marginLeft={3} marginTop={1}>
        <Text color={Colors.TextDim}>Tool Calls:</Text>
        {task.toolCalls.map((toolCall, index) => {
          const toolStatusIcon = TaskStatusService.getTaskStatusIcon(toolCall.status as any);
          
          return (
            <Box key={index} marginLeft={2}>
              <Text color={toolStatusIcon.color}>{toolStatusIcon.icon}</Text>
              <Box marginLeft={1}>
                <Text color={Colors.Info}>
                  {toolCall.toolName}
                </Text>
              </Box>
              {toolCall.executionTime && (
                <Box marginLeft={1}>
                  <Text color={Colors.TextDim}>
                    ({TaskTimeService.formatDuration(toolCall.executionTime)})
                  </Text>
                </Box>
              )}
              {toolCall.error && (
                <Box marginLeft={1}>
                  <Text color={Colors.Error}>
                    - {toolCall.error}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  /**
   * Render sub-tasks
   */
  const renderSubTasks = (): React.ReactNode => {
    if (!task.subTasks?.length || !showSubTasks || !showDetails) return null;
    
    return (
      <Box flexDirection="column" marginLeft={3} marginTop={1}>
        <Text color={Colors.TextDim}>Sub-tasks:</Text>
        {task.subTasks.map((subTask) => {
          const subStatusIcon = TaskStatusService.getTaskStatusIcon(subTask.status);
          
          return (
            <Box key={subTask.id} marginLeft={2}>
              <Text color={subStatusIcon.color}>{subStatusIcon.icon}</Text>
              <Box marginLeft={1}>
                <Text color={Colors.Text}>
                  {subTask.name}
                </Text>
              </Box>
              {subTask.progress > 0 && subTask.status === 'in_progress' && (
                <Box marginLeft={1}>
                  <Text color={Colors.TextDim}>
                    ({subTask.progress}%)
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  /**
   * Render expanded details
   */
  const renderExpandedDetails = (): React.ReactNode => {
    if (!isExpanded || !showDetails) return null;

    return (
      <Box flexDirection="column" marginLeft={3} marginTop={1}>
        {/* Description */}
        <Text color={Colors.TextDim}>
          {task.description}
        </Text>
        
        {/* Dependencies */}
        {renderTaskDependencies()}
        
        {/* Tool calls */}
        {renderToolCalls()}
        
        {/* Result/Error */}
        {task.result && (
          <Box marginTop={1}>
            {task.result.success ? (
              <Text color={Colors.Success}>
                ✓ Result: {task.result.output || 'Success'}
              </Text>
            ) : (
              <Text color={Colors.Error}>
                ✗ Error: {task.result.error || 'Failed'}
              </Text>
            )}
            
            {task.result.artifacts && task.result.artifacts.length > 0 && (
              <Box marginTop={1}>
                <Text color={Colors.TextDim}>
                  Artifacts: {task.result.artifacts.join(', ')}
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box key={task.id} flexDirection="column" marginBottom={compact ? 0 : 1}>
      {/* Main task line */}
      <Box>
        {/* Selection indicator */}
        {isSelected && (
          <Text color={Colors.Primary}>▶ </Text>
        )}
        {!isSelected && (
          <Text>  </Text>
        )}
        
        {/* Status icon */}
        <Text color={statusIcon.color}>
          {statusIcon.icon}
        </Text>
        
        {/* Priority indicator */}
        <Box marginLeft={1}>
          <Text>
            {priorityIcon.icon}
          </Text>
        </Box>
        
        {/* Task name */}
        <Box marginLeft={1}>
          <Text 
            color={isSelected ? Colors.Primary : Colors.Text}
            bold={isSelected}
          >
            {task.name}
          </Text>
        </Box>
        
        {/* Task category */}
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>
            [{task.category}]
          </Text>
        </Box>
        
        {/* Elapsed time */}
        {task.startTime && (
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              {TaskTimeService.getElapsedTime(task)}
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Task progress */}
      {renderTaskProgress()}
      
      {/* Current step */}
      {task.currentStep && task.status === 'in_progress' && (
        <Box marginLeft={3} marginTop={1}>
          <Text color={Colors.Info}>
            → {task.currentStep}
          </Text>
        </Box>
      )}
      
      {/* Expanded details */}
      {renderExpandedDetails()}
      
      {/* Sub-tasks */}
      {renderSubTasks()}
    </Box>
  );
}; 