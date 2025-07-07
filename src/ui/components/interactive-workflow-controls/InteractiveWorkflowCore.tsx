/**
 * Interactive Workflow Core - Clean Architecture like Gemini CLI
 * 
 * Main orchestrator component that composes all services and manages state
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, useInput } from 'ink';
import type { WorkflowDefinition } from '../task-orchestrator/index.js';

import { 
  InteractiveWorkflowControlsProps,
  RetryConfiguration,
  DebugBreakpoint
} from './types.js';
import { ControlStateService } from './ControlStateService.js';
import { RetryService } from './RetryService.js';
import { InputHandlerService } from './InputHandlerService.js';

// View components
import { MainControlsView } from './MainControlsView.js';
import { DebugControlsView } from './DebugControlsView.js';
import { RetryControlsView } from './RetryControlsView.js';
import { BreakpointsView } from './BreakpointsView.js';
import { ConfirmationView } from './ConfirmationView.js';
import { RetryDialogView } from './RetryDialogView.js';
import { ControlsHintView } from './ControlsHintView.js';

/**
 * Interactive workflow controls core component
 */
export const InteractiveWorkflowCore: React.FC<InteractiveWorkflowControlsProps> = ({
  workflow,
  controlState,
  isFocused = false,
  showDebugControls = true,
  enableStepping = true,
  breakpoints = [],
  retryConfig,
  compact = false,
  maxWidth = 100,
  onPlay,
  onPause,
  onResume,
  onCancel,
  onAbort,
  onStep,
  onStepInto,
  onStepOver,
  onStepOut,
  onRetry,
  onAddBreakpoint,
  onRemoveBreakpoint,
  onToggleBreakpoint,
  onReset,
}) => {
  // Default retry configuration
  const defaultRetryConfig: RetryConfiguration = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    retryConditions: ['network_error', 'timeout', 'rate_limit', 'temporary_failure'],
    ...retryConfig,
  };

  // Initialize services
  const [controlStateService] = useState(() => new ControlStateService(defaultRetryConfig));
  const [retryService] = useState(() => new RetryService(defaultRetryConfig));
  const [inputHandlerService, setInputHandlerService] = useState<InputHandlerService | null>(null);

  // Component state for UI updates
  const [componentState, setComponentState] = useState(() => controlStateService.getState());

  // Initialize input handler service with callbacks
  useEffect(() => {
    const callbacks = {
      onPlay,
      onPause,
      onResume,
      onCancel,
      onAbort,
      onStep,
      onStepInto,
      onStepOver,
      onStepOut,
      onRetry,
      onAddBreakpoint,
      onRemoveBreakpoint,
      onToggleBreakpoint,
      onReset,
    };

    const inputHandler = new InputHandlerService(controlStateService, callbacks);
    setInputHandlerService(inputHandler);
  }, [
    onPlay, onPause, onResume, onCancel, onAbort, onStep, onStepInto,
    onStepOver, onStepOut, onRetry, onAddBreakpoint, onRemoveBreakpoint,
    onToggleBreakpoint, onReset
  ]);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = controlStateService.subscribe((newState) => {
      setComponentState(newState);
    });

    return unsubscribe;
  }, [controlStateService]);

  // Sync external control state
  useEffect(() => {
    controlStateService.setControlState(controlState);
  }, [controlState, controlStateService]);

  // Sync external breakpoints
  useEffect(() => {
    controlStateService.setBreakpoints(breakpoints);
  }, [breakpoints, controlStateService]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused || !inputHandlerService) return;
    
    inputHandlerService.handleInput(input, key);
  }, { isActive: isFocused });

  // Enhanced breakpoint handlers
  const handleAddBreakpoint = useCallback((taskId: string, condition?: string) => {
    const breakpoint: DebugBreakpoint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      condition,
      enabled: true,
      hitCount: 0,
      description: `Breakpoint on ${taskId}`,
    };
    
    controlStateService.addBreakpoint(breakpoint);
    onAddBreakpoint?.(taskId, condition);
  }, [onAddBreakpoint, controlStateService]);

  const handleRemoveBreakpoint = useCallback((breakpointId: string) => {
    controlStateService.removeBreakpoint(breakpointId);
    onRemoveBreakpoint?.(breakpointId);
  }, [onRemoveBreakpoint, controlStateService]);

  const handleToggleBreakpoint = useCallback((breakpointId: string) => {
    controlStateService.toggleBreakpoint(breakpointId);
    onToggleBreakpoint?.(breakpointId);
  }, [onToggleBreakpoint, controlStateService]);

  const handleRetry = useCallback((taskId: string, config?: Partial<RetryConfiguration>) => {
    controlStateService.incrementRetryCount(taskId);
    onRetry?.(taskId, config);
  }, [onRetry, controlStateService]);

  // Render methods
  const renderConfirmation = (): React.ReactNode => {
    if (!componentState.showConfirmation) return null;

    return (
      <ConfirmationView
        action={componentState.showConfirmation}
        onConfirm={() => {
          inputHandlerService?.handleInput('y', { name: 'y' });
        }}
        onCancel={() => {
          inputHandlerService?.handleInput('n', { name: 'n' });
        }}
      />
    );
  };

  const renderRetryDialog = (): React.ReactNode => {
    if (!componentState.showRetryDialog || !workflow) return null;

    const currentTask = workflow.tasks[componentState.selectedTaskIndex];

    return (
      <RetryDialogView
        task={currentTask}
        retryConfig={componentState.customRetryConfig}
        defaultRetryConfig={defaultRetryConfig}
        retryService={retryService}
        onRetry={() => {
          inputHandlerService?.handleInput('', { name: 'Enter' });
        }}
        onCancel={() => {
          inputHandlerService?.handleInput('', { name: 'Escape' });
        }}
        onConfigChange={(config) => {
          controlStateService.updateCustomRetryConfig(config);
        }}
      />
    );
  };

  const renderMainControls = (): React.ReactNode => {
    return (
      <MainControlsView
        controlState={componentState.controlState}
        workflow={workflow}
        selectedTaskIndex={componentState.selectedTaskIndex}
        controlStateService={controlStateService}
        compact={compact}
        maxWidth={maxWidth}
      />
    );
  };

  const renderDebugControls = (): React.ReactNode => {
    if (!showDebugControls || !enableStepping) return null;

    return (
      <DebugControlsView
        controlState={componentState.controlState}
        workflow={workflow}
        selectedTaskIndex={componentState.selectedTaskIndex}
        enableStepping={enableStepping}
        compact={compact}
      />
    );
  };

  const renderRetryControls = (): React.ReactNode => {
    return (
      <RetryControlsView
        workflow={workflow}
        selectedTaskIndex={componentState.selectedTaskIndex}
        retryHistory={componentState.retryHistory}
        retryService={retryService}
        compact={compact}
      />
    );
  };

  const renderBreakpoints = (): React.ReactNode => {
    if (!showDebugControls || componentState.breakpoints.length === 0) return null;

    return (
      <BreakpointsView
        breakpoints={componentState.breakpoints}
        workflow={workflow}
        onRemove={handleRemoveBreakpoint}
        onToggle={handleToggleBreakpoint}
        compact={compact}
      />
    );
  };

  const renderControlsHint = (): React.ReactNode => {
    if (!isFocused || compact || !inputHandlerService) return null;

    return (
      <ControlsHintView
        contextualHelp={inputHandlerService.getContextualHelp()}
      />
    );
  };

  // Main render
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Confirmation dialog (highest priority) */}
      {renderConfirmation()}
      
      {/* Retry dialog */}
      {renderRetryDialog()}
      
      {/* Main controls */}
      {renderMainControls()}
      
      {/* Debug controls */}
      {renderDebugControls()}
      
      {/* Retry controls */}
      {renderRetryControls()}
      
      {/* Breakpoints */}
      {renderBreakpoints()}
      
      {/* Controls hint */}
      {renderControlsHint()}
    </Box>
  );
};

export default InteractiveWorkflowCore; 