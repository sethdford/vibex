/**
 * Real-Time Task Orchestrator Core - Clean Architecture
 * 
 * Main orchestrator component that coordinates all services and views
 * Following Gemini CLI's focused component patterns
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { TaskOrchestrator } from '../task-orchestrator/index.js';
import { useWorkflowEngine } from '../../hooks/useWorkflowEngine.js';

// Services
import { createRealTimeStateService } from './RealTimeStateService.js';
import { createExecutionService } from './ExecutionService.js';
import { createMetricsService } from './MetricsService.js';
import { createKeyboardControlsService } from './KeyboardControlsService.js';
import { createDemoWorkflowService } from './DemoWorkflowService.js';

// Views
import { MetricsView } from './MetricsView.js';
import { ConnectionStatusView } from './ConnectionStatusView.js';
import { ExecutionHistoryView } from './ExecutionHistoryView.js';
import { ControlsHintView } from './ControlsHintView.js';

// Types
import type { 
  RealTimeTaskOrchestratorProps,
  RealTimeOrchestratorConfig,
  RealTimeOrchestratorCallbacks,
  ExecutionHistoryEntry 
} from './types.js';
import type { WorkflowDefinition, TaskDefinition } from '../task-orchestrator/types.js';

import { logger } from '../../../utils/logger.js';

/**
 * Real-Time Task Orchestrator Core Component
 * Focus: Service coordination and UI orchestration
 */
export const RealTimeTaskOrchestratorCore: React.FC<RealTimeTaskOrchestratorProps> = ({
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
  // Local UI state
  const [showMetrics, setShowMetrics] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryEntry[]>([]);

  // Initialize workflow engine
    const [engineState, engineActions] = useWorkflowEngine({
    enableMetrics,
    metricsInterval: 250,
    maxRetries: 3,
    retryDelay: 500,
    persistState: true,
    storageKey: 'vibex-realtime-workflow-state',
  });

  // Create services (memoized to prevent recreation)
  const services = useMemo(() => {
    const config: RealTimeOrchestratorConfig = {
      updateInterval,
      maxLatency: 100,
      enableMetrics,
      metricsInterval: 250,
      maxRetries: 3,
      retryDelay: 500,
      persistState: true,
      storageKey: 'vibex-realtime-workflow-state',
    };

    const callbacks: RealTimeOrchestratorCallbacks = {
      onWorkflowComplete,
      onError,
      onStateUpdate: (state) => {
        logger.debug('Real-time state updated', { 
          connectionStatus: state.connectionStatus,
          isExecuting: state.isExecuting 
        });
      },
    };

    const stateService = createRealTimeStateService(config);
    const executionService = createExecutionService(callbacks);
    const metricsService = createMetricsService({
      updateInterval,
      metricsInterval: 250,
      enableMemoryTracking: true,
      enableThroughputTracking: true,
      maxHistorySize: 100,
    });
    const keyboardService = createKeyboardControlsService({}, enableMetrics);
    const demoService = createDemoWorkflowService();

    return {
      stateService,
      executionService,
      metricsService,
      keyboardService,
      demoService,
    };
  }, [updateInterval, enableMetrics, onWorkflowComplete, onError]);

  // Create real-time workflow from engine state
    const realTimeWorkflow = useMemo<WorkflowDefinition | null>(() => {
    if (!engineState.activeWorkflow) {
      return initialWorkflow || null;
    }
    return services.stateService.getMergedWorkflow(
      engineState.activeWorkflow
    );
  }, [
    engineState.activeWorkflow,
    initialWorkflow,
    services.stateService,
  ]);

  // Load initial workflow
  useEffect(() => {
    if (initialWorkflow && !engineState.activeWorkflow) {
      logger.info('Loading initial workflow into real-time orchestrator', { 
        workflowId: initialWorkflow.id,
        taskCount: initialWorkflow.tasks.length 
      });
      
      services.stateService.updateActiveWorkflow(initialWorkflow);
      
      // Auto-execute if enabled
      if (autoExecute) {
        handleExecuteWorkflow(initialWorkflow);
      }
    }
  }, [initialWorkflow, engineState.activeWorkflow, autoExecute, services.stateService]);

  // Setup keyboard handlers
  useEffect(() => {
    const { keyboardService } = services;
    
    // Register action handlers
    keyboardService.registerHandler('toggleMetrics', () => {
      setShowMetrics(prev => !prev);
    });
    
    keyboardService.registerHandler('toggleAutoExecute', () => {
      setAutoExecute(prev => !prev);
    });
    
    keyboardService.registerHandler('executeWorkflow', () => {
      if (realTimeWorkflow && !services.executionService.isCurrentlyExecuting()) {
        handleExecuteWorkflow(realTimeWorkflow);
      }
    });
    
    keyboardService.registerHandler('showHistory', () => {
      const history = services.executionService.getExecutionHistory();
      logger.info('Execution history', { history });
    });
    
    keyboardService.registerHandler('forceRefresh', () => {
      services.stateService.forceRefresh();
      engineActions.forceRefresh();
    });
    
    keyboardService.registerHandler('pauseResume', () => {
      if (services.executionService.isCurrentlyExecuting()) {
        const currentWorkflow = services.executionService.getCurrentWorkflow();
        if (currentWorkflow?.status === 'paused') {
          handleResume();
        } else {
          handlePause();
        }
      }
    });
    
    keyboardService.registerHandler('cancel', () => {
      if (services.executionService.isCurrentlyExecuting()) {
        handleCancel();
      }
    });
    
    // Activate if focused
    if (isFocused) {
      keyboardService.activate();
    } else {
      keyboardService.deactivate();
    }
    
    return () => {
      keyboardService.clearHandlers();
    };
  }, [isFocused, realTimeWorkflow, services, engineActions]);

  // Handle workflow execution
    const handleExecuteWorkflow = useCallback(async (workflow: WorkflowDefinition) => {
    try {
      logger.info('Executing workflow via real-time orchestrator', { workflowId: workflow.id });
      
      const result = await services.executionService.executeWorkflow(workflow, executionContext);
      
      // Update execution history
      const history = services.executionService.getExecutionHistory();
      setExecutionHistory(history);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Workflow execution failed in real-time orchestrator', { 
        workflowId: workflow.id, 
        error: errorMessage 
      });
    }
  }, [services.executionService, executionContext]);

  // Handle task updates
    const handleTaskUpdate = useCallback((taskId: string, updates: Partial<TaskDefinition>) => {
    logger.debug('Task update requested via real-time orchestrator', { taskId, updates });
    
    services.stateService.updateTaskState(taskId, updates);
    
    // Update task priority if changed
    if (updates.priority && ['low', 'normal', 'high', 'critical'].includes(updates.priority)) {
      engineActions.updateTaskPriority(taskId, updates.priority as any);
    }
    
    // Force refresh to ensure UI reflects changes
    engineActions.forceRefresh();
  }, [services.stateService, engineActions]);

  // Handle workflow controls
    const handlePause = useCallback(() => {
    logger.info('Pausing workflow via real-time orchestrator');
    services.executionService.pauseExecution();
    engineActions.pause();
  }, [services.executionService, engineActions]);

  const handleResume = useCallback(() => {
    logger.info('Resuming workflow via real-time orchestrator');
    services.executionService.resumeExecution();
    engineActions.resume();
  }, [services.executionService, engineActions]);

  const handleCancel = useCallback(() => {
    logger.info('Cancelling workflow via real-time orchestrator');
    services.executionService.cancelExecution();
    engineActions.cancel();
  }, [services.executionService, engineActions]);

  const handleRetry = useCallback(async (taskId: string) => {
    logger.info('Retrying task via real-time orchestrator', { taskId });
    
    try {
      await services.executionService.retryTask(taskId);
      await engineActions.retry(taskId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Task retry failed in real-time orchestrator', { taskId, error: errorMessage });
      
      if (onError) {
        onError(`Failed to retry task: ${errorMessage}`);
      }
    }
  }, [services.executionService, engineActions, onError]);

  // Handle keyboard input
  useInput((input, key) => {
    if (isFocused) {
      services.keyboardService.handleInput(input, key);
    }
  });

  // Subscribe to real-time updates
    useEffect(() => {
    const unsubscribe = engineActions.subscribeToUpdates((state: any) => {
      // Update state service with engine state
      services.stateService.updateConnectionStatus(state.connectionStatus, state.updateLatency);
      services.stateService.updateExecutionState(
        state.isExecuting, 
        state.isPaused, 
        state.isCancelled
      );
      
      // Update metrics
      services.metricsService.updateConnection(state.connectionStatus, state.updateLatency);
      services.metricsService.recordUpdate();
    });
    
    return unsubscribe;
  }, [engineActions, services]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      services.stateService.cleanup();
      services.metricsService.cleanup();
    };
  }, [services]);

  // Main render
  if (!realTimeWorkflow) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        <ConnectionStatusView
          connectionStatus={engineState.connectionStatus}
          updateLatency={engineState.updateLatency}
        />
        
        <MetricsView
          metrics={services.metricsService.getCurrentMetrics()}
          showMetrics={showMetrics}
          enableMetrics={enableMetrics}
        />
        
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            No workflow loaded. Waiting for workflow data...
          </Text>
        </Box>
        
        <ControlsHintView
          isFocused={isFocused}
          helpText={services.keyboardService.getHelpText()}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Connection status */}
      <ConnectionStatusView
        connectionStatus={engineState.connectionStatus}
        updateLatency={engineState.updateLatency}
      />
      
      {/* Performance metrics */}
      <MetricsView
        metrics={services.metricsService.getCurrentMetrics()}
        showMetrics={showMetrics}
        enableMetrics={enableMetrics}
      />
      
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
      <ExecutionHistoryView executionHistory={executionHistory} />
      
      {/* Controls hint */}
      <ControlsHintView
        isFocused={isFocused}
        helpText={services.keyboardService.getHelpText()}
      />
    </Box>
  );
};