/**
 * Task Orchestrator Component
 * 
 * A sophisticated task orchestration system that matches and exceeds Claude's
 * real-time task management interface with interactive workflows, dependencies,
 * and professional visual hierarchy.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { StatusIcon } from './StatusIcon.js';
import { ProgressSystem } from './progress/ProgressSystem.js';
import { logger } from '../../utils/logger.js';

/**
 * Task status types
 */
export type TaskStatus = 
  | 'pending'
  | 'in_progress' 
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting_dependencies'
  | 'paused';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Task execution context
 */
export interface TaskExecutionContext {
  /**
   * Current working directory
   */
  workingDirectory: string;
  
  /**
   * Environment variables
   */
  environment: Record<string, string>;
  
  /**
   * Shared state between tasks
   */
  sharedState: Record<string, unknown>;
  
  /**
   * Available tools
   */
  availableTools: string[];
  
  /**
   * Execution timeout
   */
  timeout?: number;
  
  /**
   * Workflow identifier
   */
  workflowId?: string;
}

/**
 * Task definition interface
 */
export interface TaskDefinition {
  /**
   * Unique task identifier
   */
  id: string;
  
  /**
   * Human-readable task name
   */
  name: string;
  
  /**
   * Detailed task description
   */
  description: string;
  
  /**
   * Task category/type
   */
  category: 'analysis' | 'file_ops' | 'code_gen' | 'testing' | 'deployment' | 'research' | 'validation';
  
  /**
   * Current status
   */
  status: TaskStatus;
  
  /**
   * Task priority
   */
  priority: TaskPriority;
  
  /**
   * Task dependencies (must complete before this task)
   */
  dependencies: string[];
  
  /**
   * Sub-tasks for complex operations
   */
  subTasks?: TaskDefinition[];
  
  /**
   * Estimated duration in milliseconds
   */
  estimatedDuration?: number;
  
  /**
   * Actual start time
   */
  startTime?: number;
  
  /**
   * Actual end time
   */
  endTime?: number;
  
  /**
   * Progress percentage (0-100)
   */
  progress: number;
  
  /**
   * Current step description
   */
  currentStep?: string;
  
  /**
   * Tool calls involved in this task
   */
  toolCalls: Array<{
    toolName: string;
    parameters: Record<string, unknown>;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    result?: unknown;
    error?: string;
    executionTime?: number;
  }>;
  
  /**
   * Task result/output
   */
  result?: {
    success: boolean;
    output?: string;
    artifacts?: string[];
    metrics?: Record<string, number>;
    error?: string;
  };
  
  /**
   * Can this task be cancelled?
   */
  cancellable: boolean;
  
  /**
   * Can this task be retried?
   */
  retryable: boolean;
  
  /**
   * Number of retry attempts
   */
  retryCount?: number;
  
  /**
   * Maximum retry attempts
   */
  maxRetries?: number;
  
  /**
   * Is this a critical task?
   */
  critical?: boolean;
  
  /**
   * Task execution timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Task execution function
   */
  execute?: (context: TaskExecutionContext) => Promise<void>;
  
  /**
   * Task validation function
   */
  validate?: (context: TaskExecutionContext) => Promise<boolean>;
  
  /**
   * Task cleanup function
   */
  cleanup?: (context: TaskExecutionContext) => Promise<void>;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  /**
   * Workflow identifier
   */
  id: string;
  
  /**
   * Workflow name
   */
  name: string;
  
  /**
   * Workflow description
   */
  description: string;
  
  /**
   * All tasks in this workflow
   */
  tasks: TaskDefinition[];
  
  /**
   * Workflow execution context
   */
  context: TaskExecutionContext;
  
  /**
   * Workflow status
   */
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  
  /**
   * Workflow start time
   */
  startTime?: number;
  
  /**
   * Workflow end time
   */
  endTime?: number;
  
  /**
   * Overall progress (0-100)
   */
  progress: number;
}

/**
 * Unified task orchestrator props (combines static + real-time features)
 */
export interface TaskOrchestratorProps {
  /**
   * Current workflow (required for static mode, optional for real-time)
   */
  workflow?: WorkflowDefinition;
  
  /**
   * Enable real-time mode with WorkflowEngine integration
   */
  realTimeMode?: boolean;
  
  /**
   * Initial workflow for real-time mode
   */
  initialWorkflow?: WorkflowDefinition;
  
  /**
   * Execution context for workflows
   */
  executionContext?: Partial<TaskExecutionContext>;
  
  /**
   * Whether the orchestrator is focused for input
   */
  isFocused?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Show detailed task information
   */
  showDetails?: boolean;
  
  /**
   * Show completed tasks
   */
  showCompleted?: boolean;
  
  /**
   * Auto-scroll to active tasks
   */
  autoScroll?: boolean;
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * Real-time configuration (only used when realTimeMode=true)
   */
  realTimeConfig?: {
    enableMetrics?: boolean;
    updateInterval?: number;
    autoExecute?: boolean;
    showConnectionStatus?: boolean;
    showExecutionHistory?: boolean;
  };
  
  /**
   * Task update callback
   */
  onTaskUpdate?: (taskId: string, updates: Partial<TaskDefinition>) => void;
  
  /**
   * Workflow control callbacks
   */
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: (taskId: string) => void;
  
  /**
   * Workflow completion callback (real-time mode)
   */
  onWorkflowComplete?: (workflow: WorkflowDefinition, success: boolean) => void;
  
  /**
   * Error callback
   */
  onError?: (error: string) => void;
}

/**
 * Task orchestrator component
 */
export const TaskOrchestrator: React.FC<TaskOrchestratorProps> = ({
  workflow,
  realTimeMode = false,
  initialWorkflow,
  executionContext,
  isFocused = false,
  maxWidth = 120,
  showDetails = true,
  showCompleted = true,
  autoScroll = true,
  compact = false,
  realTimeConfig = {},
  onTaskUpdate,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onWorkflowComplete,
  onError,
}) => {
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showSubTasks, setShowSubTasks] = useState<Set<string>>(new Set());
  const scrollRef = useRef<number>(0);
  
  // Real-time state (only used when realTimeMode=true)
  const [realTimeState, setRealTimeState] = useState<{
    engineState: any;
    engineActions: any;
    showMetrics: boolean;
    autoExecute: boolean;
    executionHistory: Array<{
      workflowId: string;
      timestamp: number;
      success: boolean;
      duration: number;
    }>;
  } | null>(null);
  
  // Initialize real-time engine if needed
  useEffect(() => {
    if (realTimeMode && !realTimeState) {
      const initializeRealTime = async () => {
        try {
          const { useWorkflowEngine } = await import('../hooks/useWorkflowEngine.js');
          const [engineState, engineActions] = useWorkflowEngine({
            updateInterval: realTimeConfig.updateInterval || 100,
            maxLatency: 100,
            enableMetrics: realTimeConfig.enableMetrics !== false,
            metricsInterval: 250,
            maxRetries: 3,
            retryDelay: 500,
            persistState: true,
            storageKey: 'vibex-unified-workflow-state',
          });
          
          setRealTimeState({
            engineState,
            engineActions,
            showMetrics: false,
            autoExecute: realTimeConfig.autoExecute || false,
            executionHistory: [],
          });
          
          logger.info('Real-time workflow engine initialized in unified orchestrator');
        } catch (error) {
          logger.error('Failed to initialize real-time engine', { error });
          if (onError) {
            onError(`Failed to initialize real-time mode: ${error}`);
          }
        }
      };
      
      initializeRealTime();
    }
  }, [realTimeMode, realTimeConfig, onError]);
  
  // Create unified workflow from either static or real-time source
  const activeWorkflow = useMemo<WorkflowDefinition | null>(() => {
    if (realTimeMode && realTimeState?.engineState) {
      // Real-time mode: use engine state
      const engineState = realTimeState.engineState;
      
      if (!engineState.activeWorkflow) {
        return initialWorkflow || null;
      }
      
      // Merge engine state with UI state for real-time updates
      const rtWorkflow = { ...engineState.activeWorkflow };
      
      // Update task states with real-time data
      rtWorkflow.tasks = rtWorkflow.tasks.map((task: TaskDefinition) => {
        const realTimeTask = engineState.taskStates.get(task.id);
        const progress = engineState.taskProgress.get(task.id);
        const error = engineState.taskErrors.get(task.id);
        
        if (realTimeTask) {
          return {
            ...task,
            ...realTimeTask,
            progress: progress !== undefined ? progress : task.progress,
            result: error ? { ...task.result, error, success: false } : task.result,
          };
        }
        
        return task;
      });
      
      // Update workflow progress based on task completion
      const completedTasks = rtWorkflow.tasks.filter((t: TaskDefinition) => t.status === 'completed').length;
      const totalTasks = rtWorkflow.tasks.length;
      rtWorkflow.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Update workflow status based on engine state
      if (engineState.isExecuting) {
        rtWorkflow.status = 'running';
      } else if (engineState.isPaused) {
        rtWorkflow.status = 'paused';
      } else if (engineState.isCancelled) {
        rtWorkflow.status = 'failed';
      } else if (rtWorkflow.progress === 100) {
        rtWorkflow.status = 'completed';
      } else {
        rtWorkflow.status = 'idle';
      }
      
      return rtWorkflow;
    } else {
      // Static mode: use provided workflow
      return workflow || null;
    }
  }, [
    realTimeMode,
    realTimeState?.engineState,
    initialWorkflow,
    workflow,
  ]);
  
  // Filter tasks based on display settings
  const getDisplayTasks = (): TaskDefinition[] => {
    if (!activeWorkflow) return [];
    
    let tasks = [...activeWorkflow.tasks];
    
    if (!showCompleted) {
      tasks = tasks.filter(task => task.status !== 'completed');
    }
    
    // Sort by priority and status
    tasks.sort((a, b) => {
      // Priority order: critical > high > normal > low
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Status order: in_progress > pending > waiting_dependencies > others
      const statusOrder = {
        in_progress: 5,
        pending: 4,
        waiting_dependencies: 3,
        paused: 2,
        failed: 1,
        completed: 0,
        cancelled: 0
      };
      
      return statusOrder[b.status] - statusOrder[a.status];
    });
    
    return tasks;
  };
  
  const displayTasks = getDisplayTasks();
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.upArrow) {
      setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
    } else if (key.downArrow) {
      setSelectedTaskIndex(Math.min(displayTasks.length - 1, selectedTaskIndex + 1));
    } else if (key.return) {
      // Toggle task expansion
      const selectedTask = displayTasks[selectedTaskIndex];
      if (selectedTask) {
        setExpandedTasks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(selectedTask.id)) {
            newSet.delete(selectedTask.id);
          } else {
            newSet.add(selectedTask.id);
          }
          return newSet;
        });
      }
    } else if (input === 's') {
      // Toggle sub-tasks
      const selectedTask = displayTasks[selectedTaskIndex];
      if (selectedTask && selectedTask.subTasks) {
        setShowSubTasks(prev => {
          const newSet = new Set(prev);
          if (newSet.has(selectedTask.id)) {
            newSet.delete(selectedTask.id);
          } else {
            newSet.add(selectedTask.id);
          }
          return newSet;
        });
      }
    } else if (input === 'r') {
      // Retry failed task
      const selectedTask = displayTasks[selectedTaskIndex];
      if (selectedTask && selectedTask.status === 'failed' && selectedTask.retryable && onRetry) {
        onRetry(selectedTask.id);
      }
    } else if (input === 'p') {
      // Pause/resume workflow
      if (activeWorkflow?.status === 'running' && onPause) {
        onPause();
      } else if (activeWorkflow?.status === 'paused' && onResume) {
        onResume();
      }
    } else if (input === 'c') {
      // Cancel workflow
      if (onCancel) {
        onCancel();
      }
    }
  });
  
  // Auto-scroll to active tasks
  useEffect(() => {
    if (autoScroll) {
      const activeTaskIndex = displayTasks.findIndex(task => 
        task.status === 'in_progress' || task.status === 'pending'
      );
      
      if (activeTaskIndex >= 0) {
        setSelectedTaskIndex(activeTaskIndex);
      }
    }
  }, [displayTasks, autoScroll]);
  
  // Get task status icon and color
  const getTaskStatusIcon = (status: TaskStatus): { icon: string; color: string } => {
    switch (status) {
      case 'pending':
        return { icon: '○', color: Colors.TextDim };
      case 'in_progress':
        return { icon: '⟳', color: Colors.Info };
      case 'completed':
        return { icon: '✓', color: Colors.Success };
      case 'failed':
        return { icon: '✗', color: Colors.Error };
      case 'cancelled':
        return { icon: '⊘', color: Colors.TextDim };
      case 'waiting_dependencies':
        return { icon: '⏳', color: Colors.Warning };
      case 'paused':
        return { icon: '⏸', color: Colors.Warning };
      default:
        return { icon: '○', color: Colors.TextDim };
    }
  };
  
  // Get priority indicator
  const getPriorityIndicator = (priority: TaskPriority): { icon: string; color: string } => {
    switch (priority) {
      case 'critical':
        return { icon: '🔴', color: Colors.Error };
      case 'high':
        return { icon: '🟠', color: Colors.Warning };
      case 'normal':
        return { icon: '🟡', color: Colors.Info };
      case 'low':
        return { icon: '🟢', color: Colors.Success };
      default:
        return { icon: '⚪', color: Colors.TextDim };
    }
  };
  
  // Format duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Calculate elapsed time
  const getElapsedTime = (task: TaskDefinition): string => {
    if (!task.startTime) return '';
    
    const endTime = task.endTime || Date.now();
    const elapsed = endTime - task.startTime;
    return formatDuration(elapsed);
  };
  
  // Render task progress
  const renderTaskProgress = (task: TaskDefinition): React.ReactNode => {
    if (task.status === 'completed') {
      return (
        <Box marginLeft={1}>
          <Text color={Colors.Success}>✓ Done</Text>
          {task.result?.metrics && (
            <Text color={Colors.TextDim}> ({getElapsedTime(task)})</Text>
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
  
  // Render task dependencies
  const renderTaskDependencies = (task: TaskDefinition): React.ReactNode => {
    if (!task.dependencies.length || !activeWorkflow) return null;
    
    const dependencyStatuses = task.dependencies.map(depId => {
      const depTask = activeWorkflow.tasks.find(t => t.id === depId);
      return depTask ? depTask.status : 'unknown';
    });
    
    const completedDeps = dependencyStatuses.filter(status => status === 'completed').length;
    const totalDeps = task.dependencies.length;
    
    return (
      <Box marginLeft={3} marginTop={1}>
        <Text color={Colors.TextDim}>
          Dependencies: {completedDeps}/{totalDeps} completed
        </Text>
        {completedDeps < totalDeps && (
          <Text color={Colors.Warning}> (waiting)</Text>
        )}
      </Box>
    );
  };
  
  // Render tool calls
  const renderToolCalls = (task: TaskDefinition): React.ReactNode => {
    if (!task.toolCalls.length || !expandedTasks.has(task.id)) return null;
    
    return (
      <Box flexDirection="column" marginLeft={3} marginTop={1}>
        <Text color={Colors.TextDim}>Tool Calls:</Text>
        {task.toolCalls.map((toolCall, index) => {
          const statusIcon = getTaskStatusIcon(toolCall.status as TaskStatus);
          
          return (
            <Box key={index} marginLeft={2}>
              <Text color={statusIcon.color}>{statusIcon.icon}</Text>
              <Box marginLeft={1}>
                <Text color={Colors.Info}>
                  {toolCall.toolName}
                </Text>
              </Box>
              {toolCall.executionTime && (
                <Box marginLeft={1}>
                  <Text color={Colors.TextDim}>
                    ({formatDuration(toolCall.executionTime)})
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
  
  // Render sub-tasks
  const renderSubTasks = (task: TaskDefinition): React.ReactNode => {
    if (!task.subTasks?.length || !showSubTasks.has(task.id)) return null;
    
    return (
      <Box flexDirection="column" marginLeft={3} marginTop={1}>
        <Text color={Colors.TextDim}>Sub-tasks:</Text>
        {task.subTasks.map((subTask) => {
          const statusIcon = getTaskStatusIcon(subTask.status);
          const isSelected = false; // Sub-tasks aren't selectable for now
          
          return (
            <Box key={subTask.id} marginLeft={2}>
              <Text color={statusIcon.color}>{statusIcon.icon}</Text>
              <Box marginLeft={1}>
                <Text color={isSelected ? Colors.Primary : Colors.Text}>
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
  
  // Render workflow header
  const renderWorkflowHeader = (): React.ReactNode => {
    if (!activeWorkflow) return null;
    
    const statusIcon = getTaskStatusIcon(activeWorkflow.status as TaskStatus);
    const completedTasks = activeWorkflow.tasks.filter(t => t.status === 'completed').length;
    const totalTasks = activeWorkflow.tasks.length;
    
    return (
      <Box flexDirection="column" marginBottom={1}>
        {/* Workflow title and status */}
        <Box>
          <Text color={statusIcon.color} bold>
            {statusIcon.icon}
          </Text>
          <Box marginLeft={1}>
            <Text color={Colors.Primary} bold>
              {activeWorkflow.name}
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              ({completedTasks}/{totalTasks} tasks)
            </Text>
          </Box>
          {activeWorkflow.status === 'running' && (
            <Box marginLeft={2}>
              <Text color={Colors.Info}>
                [{activeWorkflow.status.toUpperCase()}]
              </Text>
            </Box>
          )}
        </Box>
        
        {/* Workflow description */}
        {activeWorkflow.description && (
          <Box marginTop={1}>
            <Text color={Colors.TextDim}>
              {activeWorkflow.description}
            </Text>
          </Box>
        )}
        
        {/* Overall progress */}
        {activeWorkflow.progress > 0 && (
          <Box marginTop={1}>
            <ProgressSystem
              mode="advanced"
              value={activeWorkflow.progress}
              width={Math.min(60, maxWidth - 10)}
              showPercentage={true}
              showETA={true}
              showVelocity={true}
              label="Overall Progress"
              animated={activeWorkflow.status === 'running'}
              animationStyle="gradient"
              startTime={activeWorkflow.startTime}
              theme={activeWorkflow.status === 'completed' ? 'success' : activeWorkflow.status === 'failed' ? 'error' : 'default'}
              compact={compact}
              showMetrics={showDetails && !compact}
            />
          </Box>
        )}
        
        {/* Controls hint */}
        {isFocused && (
          <Box marginTop={1}>
            <Text color={Colors.TextDim}>
              ↑/↓: Navigate • Enter: Expand • S: Sub-tasks • R: Retry • P: Pause/Resume • C: Cancel
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render individual task
  const renderTask = (task: TaskDefinition, index: number): React.ReactNode => {
    const isSelected = isFocused && index === selectedTaskIndex;
    const isExpanded = expandedTasks.has(task.id);
    const statusIcon = getTaskStatusIcon(task.status);
    const priorityIcon = getPriorityIndicator(task.priority);
    
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
                {getElapsedTime(task)}
              </Text>
            </Box>
          )}
        </Box>
        
        {/* Task progress */}
        {renderTaskProgress(task)}
        
        {/* Current step */}
        {task.currentStep && task.status === 'in_progress' && (
          <Box marginLeft={3} marginTop={1}>
            <Text color={Colors.Info}>
              → {task.currentStep}
            </Text>
          </Box>
        )}
        
        {/* Expanded details */}
        {isExpanded && (
          <Box flexDirection="column" marginLeft={3} marginTop={1}>
            {/* Description */}
            <Text color={Colors.TextDim}>
              {task.description}
            </Text>
            
            {/* Dependencies */}
            {renderTaskDependencies(task)}
            
            {/* Tool calls */}
            {renderToolCalls(task)}
            
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
        )}
        
        {/* Sub-tasks */}
        {renderSubTasks(task)}
      </Box>
    );
  };
  
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Workflow header */}
      {renderWorkflowHeader()}
      
      {/* Separator */}
      <Box marginBottom={1}>
        <Text color={Colors.TextDim}>
          {'─'.repeat(Math.min(maxWidth, 80))}
        </Text>
      </Box>
      
      {/* Task list */}
      <Box flexDirection="column">
        {displayTasks.map((task, index) => renderTask(task, index))}
      </Box>
      
      {/* Empty state */}
      {displayTasks.length === 0 && (
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            No tasks to display
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for managing task orchestration
 */
export function useTaskOrchestrator() {
  const [workflows, setWorkflows] = useState<Map<string, WorkflowDefinition>>(new Map());
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  
  const createWorkflow = (
    id: string,
    name: string,
    description: string,
    tasks: TaskDefinition[],
    context: TaskExecutionContext
  ): WorkflowDefinition => {
    const workflow: WorkflowDefinition = {
      id,
      name,
      description,
      tasks,
      context,
      status: 'idle',
      progress: 0,
    };
    
    setWorkflows(prev => new Map(prev.set(id, workflow)));
    return workflow;
  };
  
  const updateWorkflow = (id: string, updates: Partial<WorkflowDefinition>) => {
    setWorkflows(prev => {
      const current = prev.get(id);
      if (!current) return prev;
      
      const updated = { ...current, ...updates };
      return new Map(prev.set(id, updated));
    });
  };
  
  const updateTask = (workflowId: string, taskId: string, updates: Partial<TaskDefinition>) => {
    setWorkflows(prev => {
      const workflow = prev.get(workflowId);
      if (!workflow) return prev;
      
      const updatedTasks = workflow.tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      const updatedWorkflow = { ...workflow, tasks: updatedTasks };
      return new Map(prev.set(workflowId, updatedWorkflow));
    });
  };
  
  const startWorkflow = (id: string) => {
    updateWorkflow(id, {
      status: 'running',
      startTime: Date.now(),
    });
    setActiveWorkflowId(id);
  };
  
  const pauseWorkflow = (id: string) => {
    updateWorkflow(id, { status: 'paused' });
  };
  
  const resumeWorkflow = (id: string) => {
    updateWorkflow(id, { status: 'running' });
  };
  
  const cancelWorkflow = (id: string) => {
    updateWorkflow(id, {
      status: 'failed',
      endTime: Date.now(),
    });
    
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null);
    }
  };
  
  const completeWorkflow = (id: string) => {
    updateWorkflow(id, {
      status: 'completed',
      endTime: Date.now(),
      progress: 100,
    });
    
    if (activeWorkflowId === id) {
      setActiveWorkflowId(null);
    }
  };
  
  const getWorkflow = (id: string) => workflows.get(id);
  
  const getActiveWorkflow = () => activeWorkflowId ? workflows.get(activeWorkflowId) : undefined;
  
  const getAllWorkflows = () => Array.from(workflows.values());
  
  return {
    workflows: Array.from(workflows.values()),
    activeWorkflow: getActiveWorkflow(),
    createWorkflow,
    updateWorkflow,
    updateTask,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    completeWorkflow,
    getWorkflow,
    getAllWorkflows,
  };
}