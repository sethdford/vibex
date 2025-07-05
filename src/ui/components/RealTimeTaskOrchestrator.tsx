/**
 * Real-Time Task Orchestrator Component
 * 
 * Integrates TaskOrchestrator with IntelligentWorkflowEngine for real-time
 * bidirectional communication, live updates, and interactive workflow control.
 * 
 * SUCCESS CRITERIA:
 * - State changes propagate <100ms
 * - UI reflects engine state 100% accurately
 * - No state drift between UI and engine
 * - Live progress updates every 250ms
 * - Interactive controls respond immediately
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { TaskOrchestrator, type WorkflowDefinition, type TaskDefinition, type TaskExecutionContext } from './TaskOrchestrator';
import { useWorkflowEngine, type WorkflowEngineState, type WorkflowEngineActions } from '../hooks/useWorkflowEngine.js';
import { Colors } from '../colors.js';
import { logger } from '../../utils/logger.js';

/**
 * Real-time task orchestrator props
 */
export interface RealTimeTaskOrchestratorProps {
  /**
   * Initial workflow to load
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
   * Enable real-time performance monitoring
   */
  enableMetrics?: boolean;
  
  /**
   * Update interval in milliseconds (default: 100ms)
   */
  updateInterval?: number;
  
  /**
   * Workflow completion callback
   */
  onWorkflowComplete?: (workflow: WorkflowDefinition, success: boolean) => void;
  
  /**
   * Error callback
   */
  onError?: (error: string) => void;
}

/**
 * Real-time task orchestrator component
 */
export const RealTimeTaskOrchestrator: React.FC<RealTimeTaskOrchestratorProps> = ({
  initialWorkflow,
  executionContext,
  isFocused = false,
  maxWidth = 120,
  showDetails = true,
  showCompleted = true,
  autoScroll = true,
  compact = false,
  enableMetrics = true,
  updateInterval = 100,
  onWorkflowComplete,
  onError,
}) => {
  // Initialize workflow engine with real-time configuration
  const [engineState, engineActions] = useWorkflowEngine({
    updateInterval,
    maxLatency: 100,
    enableMetrics,
    metricsInterval: 250,
    maxRetries: 3,
    retryDelay: 500,
    persistState: true,
    storageKey: 'vibex-realtime-workflow-state',
  });
  
  // Local state for UI-specific features
  const [showMetrics, setShowMetrics] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<Array<{
    workflowId: string;
    timestamp: number;
    success: boolean;
    duration: number;
  }>>([]);
  
  // Create real-time workflow from engine state
  const realTimeWorkflow = useMemo<WorkflowDefinition | null>(() => {
    if (!engineState.activeWorkflow) return initialWorkflow || null;
    
    // Merge engine state with UI state for real-time updates
    const workflow = { ...engineState.activeWorkflow };
    
    // Update task states with real-time data
    workflow.tasks = workflow.tasks.map(task => {
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
    const completedTasks = workflow.tasks.filter(t => t.status === 'completed').length;
    const totalTasks = workflow.tasks.length;
    workflow.progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Update workflow status based on engine state
    if (engineState.isExecuting) {
      workflow.status = 'running';
    } else if (engineState.isPaused) {
      workflow.status = 'paused';
    } else if (engineState.isCancelled) {
      workflow.status = 'failed';
    } else if (workflow.progress === 100) {
      workflow.status = 'completed';
    } else {
      workflow.status = 'idle';
    }
    
    return workflow;
  }, [
    engineState.activeWorkflow,
    engineState.taskStates,
    engineState.taskProgress,
    engineState.taskErrors,
    engineState.isExecuting,
    engineState.isPaused,
    engineState.isCancelled,
    initialWorkflow,
  ]);
  
  // Load initial workflow
  useEffect(() => {
    if (initialWorkflow && !engineState.activeWorkflow) {
      logger.info('Loading initial workflow into real-time orchestrator', { 
        workflowId: initialWorkflow.id,
        taskCount: initialWorkflow.tasks.length 
      });
      
      // Auto-execute if enabled
      if (autoExecute) {
        handleExecuteWorkflow(initialWorkflow);
      }
    }
  }, [initialWorkflow, engineState.activeWorkflow, autoExecute]);
  
  // Handle workflow execution
  const handleExecuteWorkflow = useCallback(async (workflow: WorkflowDefinition) => {
    try {
      logger.info('Executing workflow via real-time orchestrator', { workflowId: workflow.id });
      
      await engineActions.executeWorkflow(workflow, executionContext);
      
      // Add to execution history
      setExecutionHistory(prev => [...prev, {
        workflowId: workflow.id,
        timestamp: Date.now(),
        success: true,
        duration: engineState.executionReport?.duration || 0,
      }].slice(-10)); // Keep last 10 executions
      
      if (onWorkflowComplete) {
        onWorkflowComplete(workflow, true);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Workflow execution failed in real-time orchestrator', { 
        workflowId: workflow.id, 
        error: errorMessage 
      });
      
      // Add to execution history
      setExecutionHistory(prev => [...prev, {
        workflowId: workflow.id,
        timestamp: Date.now(),
        success: false,
        duration: engineState.executionReport?.duration || 0,
      }].slice(-10));
      
      if (onError) {
        onError(errorMessage);
      }
      
      if (onWorkflowComplete) {
        onWorkflowComplete(workflow, false);
      }
    }
  }, [engineActions, executionContext, engineState.executionReport, onWorkflowComplete, onError]);
  
  // Handle task updates with real-time synchronization
  const handleTaskUpdate = useCallback((taskId: string, updates: Partial<TaskDefinition>) => {
    logger.debug('Task update requested via real-time orchestrator', { taskId, updates });
    
    // Update task priority if changed
    if (updates.priority && ['low', 'normal', 'high', 'critical'].includes(updates.priority)) {
      engineActions.updateTaskPriority(taskId, updates.priority as any);
    }
    
    // Force refresh to ensure UI reflects changes
    engineActions.forceRefresh();
  }, [engineActions]);
  
  // Handle workflow controls
  const handlePause = useCallback(() => {
    logger.info('Pausing workflow via real-time orchestrator');
    engineActions.pauseWorkflow();
  }, [engineActions]);
  
  const handleResume = useCallback(() => {
    logger.info('Resuming workflow via real-time orchestrator');
    engineActions.resumeWorkflow();
  }, [engineActions]);
  
  const handleCancel = useCallback(() => {
    logger.info('Cancelling workflow via real-time orchestrator');
    engineActions.cancelWorkflow();
  }, [engineActions]);
  
  const handleRetry = useCallback(async (taskId: string) => {
    logger.info('Retrying task via real-time orchestrator', { taskId });
    
    try {
      await engineActions.retryTask(taskId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Task retry failed in real-time orchestrator', { taskId, error: errorMessage });
      
      if (onError) {
        onError(`Failed to retry task: ${errorMessage}`);
      }
    }
  }, [engineActions, onError]);
  
  // Handle keyboard shortcuts for real-time features
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (input === 'm') {
      // Toggle metrics display
      setShowMetrics(prev => !prev);
    } else if (input === 'a') {
      // Toggle auto-execute
      setAutoExecute(prev => !prev);
    } else if (input === 'x') {
      // Execute current workflow
      if (realTimeWorkflow && !engineState.isExecuting) {
        handleExecuteWorkflow(realTimeWorkflow);
      }
    } else if (input === 'h') {
      // Show execution history
      logger.info('Execution history', { history: executionHistory });
    } else if (key.ctrl && input === 'r') {
      // Force refresh
      engineActions.forceRefresh();
    }
  });
  
  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = engineActions.subscribeToUpdates((state: WorkflowEngineState) => {
      // Log state changes for debugging
      logger.debug('Real-time state update received', {
        connectionStatus: state.connectionStatus,
        updateLatency: state.updateLatency,
        isExecuting: state.isExecuting,
        taskCount: state.taskStates.size,
      });
    });
    
    return unsubscribe;
  }, [engineActions]);
  
  // Render performance metrics
  const renderMetrics = (): React.ReactNode => {
    if (!showMetrics || !enableMetrics) return null;
    
    const metrics = engineState.performanceMetrics;
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="gray">
        <Box>
          <Text color={Colors.Info} bold>📊 Real-Time Metrics</Text>
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>(Press 'M' to toggle)</Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>Connection: </Text>
          <Text color={engineState.connectionStatus === 'connected' ? Colors.Success : Colors.Error}>
            {engineState.connectionStatus.toUpperCase()}
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Latency: </Text>
          <Text color={engineState.updateLatency < 100 ? Colors.Success : Colors.Warning}>
            {engineState.updateLatency.toFixed(1)}ms
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Memory: </Text>
          <Text color={Colors.Info}>
            {metrics.memoryUsage.toFixed(1)}MB
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Throughput: </Text>
          <Text color={Colors.Info}>
            {metrics.throughput.toFixed(1)} updates/sec
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Last Update: </Text>
          <Text color={Colors.TextDim}>
            {new Date(engineState.lastUpdate).toLocaleTimeString()}
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Render connection status
  const renderConnectionStatus = (): React.ReactNode => {
    const statusColor = engineState.connectionStatus === 'connected' 
      ? Colors.Success 
      : engineState.connectionStatus === 'reconnecting' 
        ? Colors.Warning 
        : Colors.Error;
    
    const statusIcon = engineState.connectionStatus === 'connected' 
      ? '🟢' 
      : engineState.connectionStatus === 'reconnecting' 
        ? '🟡' 
        : '🔴';
    
    return (
      <Box marginBottom={1}>
        <Text color={statusColor}>
          {statusIcon} {engineState.connectionStatus.toUpperCase()}
        </Text>
        
        {engineState.updateLatency > 0 && (
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              ({engineState.updateLatency.toFixed(1)}ms latency)
            </Text>
          </Box>
        )}
        
        <Box marginLeft={4}>
          <Text color={Colors.TextDim}>Real-Time Task Orchestrator</Text>
        </Box>
      </Box>
    );
  };
  
  // Render controls hint
  const renderControlsHint = (): React.ReactNode => {
    if (!isFocused) return null;
    
    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Real-Time Controls: M: Metrics • A: Auto-Execute • X: Execute • H: History • Ctrl+R: Refresh
        </Text>
      </Box>
    );
  };
  
  // Render execution history
  const renderExecutionHistory = (): React.ReactNode => {
    if (executionHistory.length === 0) return null;
    
    const recentExecution = executionHistory[executionHistory.length - 1];
    
    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Last Execution: 
        </Text>
        <Text color={recentExecution.success ? Colors.Success : Colors.Error}>
          {recentExecution.success ? '✓' : '✗'}
        </Text>
        <Box marginLeft={1}>
          <Text color={Colors.TextDim}>
            ({recentExecution.duration}ms)
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Main render
  if (!realTimeWorkflow) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        {renderConnectionStatus()}
        {renderMetrics()}
        
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            No workflow loaded. Waiting for workflow data...
          </Text>
        </Box>
        
        {renderControlsHint()}
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Connection status */}
      {renderConnectionStatus()}
      
      {/* Performance metrics */}
      {renderMetrics()}
      
      {/* Main task orchestrator */}
      <TaskOrchestrator
        workflow={realTimeWorkflow}
        isFocused={isFocused}
        maxWidth={maxWidth}
        showDetails={showDetails}
        showCompleted={showCompleted}
        autoScroll={autoScroll}
        compact={compact}
        onTaskUpdate={handleTaskUpdate}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        onRetry={handleRetry}
      />
      
      {/* Execution history */}
      {renderExecutionHistory()}
      
      {/* Controls hint */}
      {renderControlsHint()}
    </Box>
  );
};

/**
 * Hook for creating demo workflows for testing
 */
export function useDemoWorkflows() {
  const createDemoWorkflow = useCallback((type: 'simple' | 'complex' | 'parallel'): WorkflowDefinition => {
    const baseContext: TaskExecutionContext = {
      workingDirectory: process.cwd(),
      environment: Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>,
      sharedState: {},
      availableTools: ['file_ops', 'code_analysis', 'web_search'],
      timeout: 30000,
    };
    
    switch (type) {
      case 'simple':
        return {
          id: `demo-simple-${Date.now()}`,
          name: 'Simple Demo Workflow',
          description: 'A simple workflow for testing real-time integration',
          tasks: [
            {
              id: 'task-1',
              name: 'Initialize Project',
              description: 'Set up project structure and dependencies',
              category: 'file_ops',
              status: 'pending',
              priority: 'high',
              dependencies: [],
              estimatedDuration: 5000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
              execute: async (context) => {
                // Simulate work
                await new Promise(resolve => setTimeout(resolve, 2000));
              },
            },
            {
              id: 'task-2',
              name: 'Run Analysis',
              description: 'Analyze code quality and performance',
              category: 'analysis',
              status: 'pending',
              priority: 'normal',
              dependencies: ['task-1'],
              estimatedDuration: 8000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
              execute: async (context) => {
                // Simulate work with progress updates
                for (let i = 0; i <= 100; i += 20) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              },
            },
            {
              id: 'task-3',
              name: 'Generate Report',
              description: 'Create comprehensive analysis report',
              category: 'code_gen',
              status: 'pending',
              priority: 'normal',
              dependencies: ['task-2'],
              estimatedDuration: 3000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
              execute: async (context) => {
                // Simulate work
                await new Promise(resolve => setTimeout(resolve, 1500));
              },
            },
          ],
          context: baseContext,
          status: 'idle',
          progress: 0,
        };
      
      case 'complex':
        return {
          id: `demo-complex-${Date.now()}`,
          name: 'Complex Demo Workflow',
          description: 'A complex workflow with multiple dependencies and priorities',
          tasks: [
            {
              id: 'task-1',
              name: 'Critical Setup',
              description: 'Critical system initialization',
              category: 'deployment',
              status: 'pending',
              priority: 'critical',
              dependencies: [],
              estimatedDuration: 10000,
              progress: 0,
              toolCalls: [],
              cancellable: false,
              retryable: true,
              maxRetries: 5,
            },
            {
              id: 'task-2',
              name: 'Data Processing',
              description: 'Process large dataset',
              category: 'analysis',
              status: 'pending',
              priority: 'high',
              dependencies: ['task-1'],
              estimatedDuration: 15000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'task-3',
              name: 'Validation Tests',
              description: 'Run comprehensive validation suite',
              category: 'testing',
              status: 'pending',
              priority: 'high',
              dependencies: ['task-1'],
              estimatedDuration: 12000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'task-4',
              name: 'Performance Optimization',
              description: 'Optimize system performance',
              category: 'analysis',
              status: 'pending',
              priority: 'normal',
              dependencies: ['task-2', 'task-3'],
              estimatedDuration: 8000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'task-5',
              name: 'Documentation',
              description: 'Generate technical documentation',
              category: 'code_gen',
              status: 'pending',
              priority: 'low',
              dependencies: ['task-4'],
              estimatedDuration: 5000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: false,
            },
          ],
          context: baseContext,
          status: 'idle',
          progress: 0,
        };
      
      case 'parallel':
        return {
          id: `demo-parallel-${Date.now()}`,
          name: 'Parallel Demo Workflow',
          description: 'A workflow optimized for parallel execution',
          tasks: [
            {
              id: 'task-1',
              name: 'Frontend Build',
              description: 'Build frontend application',
              category: 'code_gen',
              status: 'pending',
              priority: 'high',
              dependencies: [],
              estimatedDuration: 8000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'task-2',
              name: 'Backend Build',
              description: 'Build backend services',
              category: 'code_gen',
              status: 'pending',
              priority: 'high',
              dependencies: [],
              estimatedDuration: 10000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'task-3',
              name: 'Database Migration',
              description: 'Run database migrations',
              category: 'deployment',
              status: 'pending',
              priority: 'high',
              dependencies: [],
              estimatedDuration: 6000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
            {
              id: 'task-4',
              name: 'Integration Tests',
              description: 'Run integration test suite',
              category: 'testing',
              status: 'pending',
              priority: 'normal',
              dependencies: ['task-1', 'task-2', 'task-3'],
              estimatedDuration: 12000,
              progress: 0,
              toolCalls: [],
              cancellable: true,
              retryable: true,
            },
          ],
          context: baseContext,
          status: 'idle',
          progress: 0,
        };
      
      default:
        throw new Error(`Unknown demo workflow type: ${type}`);
    }
  }, []);
  
  return { createDemoWorkflow };
}

export default RealTimeTaskOrchestrator; 