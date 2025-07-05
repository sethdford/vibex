/**
 * Interactive Workflow Controls Component
 * 
 * Advanced workflow control interface with pause/resume, cancel/abort, step-through
 * debugging, and intelligent retry with exponential backoff.
 * 
 * SUCCESS CRITERIA:
 * - Pause/resume with perfect state preservation
 * - Cancel/abort with cleanup and confirmation
 * - Step-through debugging with breakpoints
 * - Intelligent retry with exponential backoff
 * - Interactive controls respond <100ms
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import type { WorkflowDefinition, TaskDefinition } from './TaskOrchestrator.js';

/**
 * Workflow control state
 */
export type WorkflowControlState = 'idle' | 'running' | 'paused' | 'debugging' | 'cancelling' | 'completed' | 'failed';

/**
 * Debug breakpoint
 */
export interface DebugBreakpoint {
  id: string;
  taskId: string;
  condition?: string;
  enabled: boolean;
  hitCount: number;
  description?: string;
}

/**
 * Retry configuration
 */
export interface RetryConfiguration {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryConditions: Array<'network_error' | 'timeout' | 'rate_limit' | 'temporary_failure'>;
}

/**
 * Interactive workflow controls props
 */
export interface InteractiveWorkflowControlsProps {
  /**
   * Current workflow
   */
  workflow?: WorkflowDefinition;
  
  /**
   * Current control state
   */
  controlState: WorkflowControlState;
  
  /**
   * Whether controls are focused for input
   */
  isFocused?: boolean;
  
  /**
   * Show advanced debugging controls
   */
  showDebugControls?: boolean;
  
  /**
   * Enable step-through debugging
   */
  enableStepping?: boolean;
  
  /**
   * Current debug breakpoints
   */
  breakpoints?: DebugBreakpoint[];
  
  /**
   * Retry configuration
   */
  retryConfig?: RetryConfiguration;
  
  /**
   * Compact display mode
   */
  compact?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Control callbacks
   */
  onPlay?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onAbort?: () => void;
  onStep?: () => void;
  onStepInto?: () => void;
  onStepOver?: () => void;
  onStepOut?: () => void;
  onRetry?: (taskId: string, config?: Partial<RetryConfiguration>) => void;
  onAddBreakpoint?: (taskId: string, condition?: string) => void;
  onRemoveBreakpoint?: (breakpointId: string) => void;
  onToggleBreakpoint?: (breakpointId: string) => void;
  onReset?: () => void;
}

/**
 * Interactive workflow controls component
 */
export const InteractiveWorkflowControls: React.FC<InteractiveWorkflowControlsProps> = ({
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
  const [showConfirmation, setShowConfirmation] = useState<'cancel' | 'abort' | 'reset' | null>(null);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [customRetryConfig, setCustomRetryConfig] = useState<Partial<RetryConfiguration>>({});
  
  // Default retry configuration
  const defaultRetryConfig: RetryConfiguration = {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    retryConditions: ['network_error', 'timeout', 'rate_limit', 'temporary_failure'],
    ...retryConfig,
  };
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    // Handle confirmations first
    if (showConfirmation) {
      if (input === 'y' || input === 'Y') {
        handleConfirmAction(showConfirmation);
        setShowConfirmation(null);
      } else if (input === 'n' || input === 'N' || key.escape) {
        setShowConfirmation(null);
      }
      return;
    }
    
    // Handle retry dialog
    if (showRetryDialog) {
      if (key.escape) {
        setShowRetryDialog(false);
        setCustomRetryConfig({});
      } else if (key.return && workflow) {
        const currentTask = workflow.tasks[selectedTaskIndex];
        if (currentTask && onRetry) {
          onRetry(currentTask.id, customRetryConfig);
        }
        setShowRetryDialog(false);
        setCustomRetryConfig({});
      }
      return;
    }
    
    // Main control shortcuts
    switch (input) {
      case ' ': // Spacebar - Play/Pause
        if (controlState === 'idle' || controlState === 'paused') {
          if (controlState === 'idle' && onPlay) {
            onPlay();
          } else if (controlState === 'paused' && onResume) {
            onResume();
          }
        } else if (controlState === 'running' && onPause) {
          onPause();
        }
        break;
        
      case 's': // Step
        if ((controlState === 'paused' || controlState === 'debugging') && onStep && enableStepping) {
          onStep();
        }
        break;
        
      case 'i': // Step Into
        if ((controlState === 'paused' || controlState === 'debugging') && onStepInto && enableStepping) {
          onStepInto();
        }
        break;
        
      case 'o': // Step Over
        if ((controlState === 'paused' || controlState === 'debugging') && onStepOver && enableStepping) {
          onStepOver();
        }
        break;
        
      case 'u': // Step Out
        if ((controlState === 'paused' || controlState === 'debugging') && onStepOut && enableStepping) {
          onStepOut();
        }
        break;
        
      case 'r': // Retry
        if (workflow && workflow.tasks[selectedTaskIndex]) {
          setShowRetryDialog(true);
        }
        break;
        
      case 'b': // Toggle Breakpoint
        if (workflow && workflow.tasks[selectedTaskIndex] && onToggleBreakpoint) {
          const task = workflow.tasks[selectedTaskIndex];
          const existingBreakpoint = breakpoints.find(bp => bp.taskId === task.id);
          if (existingBreakpoint) {
            onToggleBreakpoint(existingBreakpoint.id);
          } else if (onAddBreakpoint) {
            onAddBreakpoint(task.id);
          }
        }
        break;
        
      case 'c': // Cancel
        setShowConfirmation('cancel');
        break;
        
      case 'a': // Abort
        setShowConfirmation('abort');
        break;
        
      case 'R': // Reset (Shift+R)
        setShowConfirmation('reset');
        break;
    }
    
    // Navigation
    if (key.upArrow && workflow) {
      setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
    } else if (key.downArrow && workflow) {
      setSelectedTaskIndex(Math.min(workflow.tasks.length - 1, selectedTaskIndex + 1));
    }
  });
  
  // Handle confirmed actions
  const handleConfirmAction = (action: 'cancel' | 'abort' | 'reset') => {
    switch (action) {
      case 'cancel':
        if (onCancel) onCancel();
        break;
      case 'abort':
        if (onAbort) onAbort();
        break;
      case 'reset':
        if (onReset) onReset();
        break;
    }
  };
  
  // Get control state icon and color
  const getControlStateIcon = () => {
    switch (controlState) {
      case 'idle':
        return { icon: '⏸️', color: Colors.TextDim, text: 'IDLE' };
      case 'running':
        return { icon: '▶️', color: Colors.Success, text: 'RUNNING' };
      case 'paused':
        return { icon: '⏸️', color: Colors.Warning, text: 'PAUSED' };
      case 'debugging':
        return { icon: '🐛', color: Colors.Info, text: 'DEBUGGING' };
      case 'cancelling':
        return { icon: '⏹️', color: Colors.Error, text: 'CANCELLING' };
      case 'completed':
        return { icon: '✅', color: Colors.Success, text: 'COMPLETED' };
      case 'failed':
        return { icon: '❌', color: Colors.Error, text: 'FAILED' };
      default:
        return { icon: '❓', color: Colors.TextDim, text: 'UNKNOWN' };
    }
  };
  
  // Calculate retry delay
  const calculateRetryDelay = (attempt: number, config: RetryConfiguration): number => {
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    return Math.min(delay, config.maxDelayMs);
  };
  
  // Render main control buttons
  const renderMainControls = (): React.ReactNode => {
    const stateIcon = getControlStateIcon();
    
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={Colors.Primary} bold>
            🎮 Workflow Controls
          </Text>
          <Box marginLeft={2}>
            <Text color={stateIcon.color}>
              {stateIcon.icon} {stateIcon.text}
            </Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          {/* Play/Pause Button */}
          {(controlState === 'idle' || controlState === 'paused') && (
            <Box marginRight={2}>
              <Text color={Colors.Success} bold>
                ▶️ {controlState === 'idle' ? 'PLAY' : 'RESUME'}
              </Text>
              <Text color={Colors.TextDim}> (Space)</Text>
            </Box>
          )}
          
          {controlState === 'running' && (
            <Box marginRight={2}>
              <Text color={Colors.Warning} bold>
                ⏸️ PAUSE
              </Text>
              <Text color={Colors.TextDim}> (Space)</Text>
            </Box>
          )}
          
          {/* Cancel/Abort Buttons */}
          {(controlState === 'running' || controlState === 'paused') && (
            <Box marginRight={2}>
              <Text color={Colors.Error} bold>
                ⏹️ CANCEL
              </Text>
              <Text color={Colors.TextDim}> (C)</Text>
            </Box>
          )}
          
          {controlState === 'running' && (
            <Box marginRight={2}>
              <Text color={Colors.Error} bold>
                🛑 ABORT
              </Text>
              <Text color={Colors.TextDim}> (A)</Text>
            </Box>
          )}
          
          {/* Reset Button */}
          {(controlState === 'completed' || controlState === 'failed') && (
            <Box marginRight={2}>
              <Text color={Colors.Info} bold>
                🔄 RESET
              </Text>
              <Text color={Colors.TextDim}> (Shift+R)</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  };
  
  // Render debug controls
  const renderDebugControls = (): React.ReactNode => {
    if (!showDebugControls || !enableStepping) return null;
    
    const canStep = controlState === 'paused' || controlState === 'debugging';
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="blue">
        <Box>
          <Text color={Colors.Info} bold>
            🐛 Debug Controls
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Box marginRight={2}>
            <Text color={canStep ? Colors.Info : Colors.TextDim} bold={canStep}>
              ➡️ STEP
            </Text>
            <Text color={Colors.TextDim}> (S)</Text>
          </Box>
          
          <Box marginRight={2}>
            <Text color={canStep ? Colors.Info : Colors.TextDim} bold={canStep}>
              ⬇️ INTO
            </Text>
            <Text color={Colors.TextDim}> (I)</Text>
          </Box>
          
          <Box marginRight={2}>
            <Text color={canStep ? Colors.Info : Colors.TextDim} bold={canStep}>
              ➡️ OVER
            </Text>
            <Text color={Colors.TextDim}> (O)</Text>
          </Box>
          
          <Box marginRight={2}>
            <Text color={canStep ? Colors.Info : Colors.TextDim} bold={canStep}>
              ⬆️ OUT
            </Text>
            <Text color={Colors.TextDim}> (U)</Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Breakpoints: {breakpoints.filter(bp => bp.enabled).length} active
          </Text>
          <Box marginLeft={4}>
            <Text color={Colors.Info} bold>
              🔴 TOGGLE
            </Text>
            <Text color={Colors.TextDim}> (B)</Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Render retry controls
  const renderRetryControls = (): React.ReactNode => {
    if (!workflow || workflow.tasks.length === 0) return null;
    
    const currentTask = workflow.tasks[selectedTaskIndex];
    const hasFailedTasks = workflow.tasks.some(task => task.status === 'failed');
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="yellow">
        <Box>
          <Text color={Colors.Warning} bold>
            🔄 Retry Controls
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>
            Selected: 
          </Text>
          <Box marginLeft={1}>
            <Text color={currentTask?.status === 'failed' ? Colors.Error : Colors.Info}>
              {currentTask?.name || 'No task selected'}
            </Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>Config: </Text>
          <Text color={Colors.Info}>
            {defaultRetryConfig.maxAttempts} attempts, {defaultRetryConfig.initialDelayMs}ms initial delay
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Box marginRight={2}>
            <Text color={hasFailedTasks ? Colors.Warning : Colors.TextDim} bold={hasFailedTasks}>
              🔄 RETRY
            </Text>
            <Text color={Colors.TextDim}> (R)</Text>
          </Box>
          
          <Text color={Colors.TextDim}>
            Next delay: {calculateRetryDelay(1, defaultRetryConfig)}ms
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Render breakpoints list
  const renderBreakpoints = (): React.ReactNode => {
    if (!showDebugControls || breakpoints.length === 0) return null;
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="red">
        <Box>
          <Text color={Colors.Error} bold>
            🔴 Breakpoints ({breakpoints.length})
          </Text>
        </Box>
        
        {breakpoints.slice(0, 5).map((breakpoint, index) => {
          const task = workflow?.tasks.find(t => t.id === breakpoint.taskId);
          
          return (
            <Box key={breakpoint.id} marginTop={index === 0 ? 1 : 0}>
              <Text color={breakpoint.enabled ? Colors.Error : Colors.TextDim}>
                {breakpoint.enabled ? '🔴' : '⚫'}
              </Text>
              <Box marginLeft={1}>
                <Text color={Colors.Text}>
                  {task?.name || breakpoint.taskId}
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>
                  (hits: {breakpoint.hitCount})
                </Text>
              </Box>
            </Box>
          );
        })}
        
        {breakpoints.length > 5 && (
          <Box marginTop={1}>
            <Text color={Colors.TextDim}>
              ... and {breakpoints.length - 5} more
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render confirmation dialog
  const renderConfirmation = (): React.ReactNode => {
    if (!showConfirmation) return null;
    
    const messages = {
      cancel: 'Cancel workflow execution? This will stop all running tasks gracefully.',
      abort: 'Abort workflow execution? This will immediately terminate all tasks.',
      reset: 'Reset workflow? This will clear all progress and return to initial state.',
    };
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="double" borderColor="red">
        <Box>
          <Text color={Colors.Error} bold>
            ⚠️ Confirmation Required
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>
            {messages[showConfirmation]}
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Success} bold>Y</Text>
          <Text color={Colors.TextDim}> to confirm, </Text>
          <Text color={Colors.Error} bold>N</Text>
          <Text color={Colors.TextDim}> to cancel</Text>
        </Box>
      </Box>
    );
  };
  
  // Render retry dialog
  const renderRetryDialog = (): React.ReactNode => {
    if (!showRetryDialog || !workflow) return null;
    
    const currentTask = workflow.tasks[selectedTaskIndex];
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="double" borderColor="yellow">
        <Box>
          <Text color={Colors.Warning} bold>
            🔄 Configure Retry
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>
            Task: 
          </Text>
          <Box marginLeft={1}>
            <Text color={Colors.Info}>
              {currentTask?.name || 'Unknown'}
            </Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>
            Max Attempts: {customRetryConfig.maxAttempts || defaultRetryConfig.maxAttempts}
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>
            Initial Delay: {customRetryConfig.initialDelayMs || defaultRetryConfig.initialDelayMs}ms
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>
            Backoff: x{customRetryConfig.backoffMultiplier || defaultRetryConfig.backoffMultiplier}
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Success} bold>Enter</Text>
          <Text color={Colors.TextDim}> to retry, </Text>
          <Text color={Colors.Error} bold>Esc</Text>
          <Text color={Colors.TextDim}> to cancel</Text>
        </Box>
      </Box>
    );
  };
  
  // Render controls hint
  const renderControlsHint = (): React.ReactNode => {
    if (!isFocused || compact) return null;
    
    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Interactive Controls: Space: Play/Pause • S/I/O/U: Step • B: Breakpoint • R: Retry • C: Cancel • A: Abort
        </Text>
      </Box>
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

/**
 * Hook for managing workflow control state
 */
export function useWorkflowControls() {
  const [controlState, setControlState] = useState<WorkflowControlState>('idle');
  const [breakpoints, setBreakpoints] = useState<DebugBreakpoint[]>([]);
  const [retryHistory, setRetryHistory] = useState<Map<string, number>>(new Map());
  
  const play = useCallback(() => {
    setControlState('running');
  }, []);
  
  const pause = useCallback(() => {
    setControlState('paused');
  }, []);
  
  const resume = useCallback(() => {
    setControlState('running');
  }, []);
  
  const cancel = useCallback(() => {
    setControlState('cancelling');
    // Simulate cleanup time
    setTimeout(() => setControlState('idle'), 1000);
  }, []);
  
  const abort = useCallback(() => {
    setControlState('idle');
  }, []);
  
  const reset = useCallback(() => {
    setControlState('idle');
    setBreakpoints([]);
    setRetryHistory(new Map());
  }, []);
  
  const addBreakpoint = useCallback((taskId: string, condition?: string) => {
    const breakpoint: DebugBreakpoint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      condition,
      enabled: true,
      hitCount: 0,
      description: `Breakpoint on ${taskId}`,
    };
    
    setBreakpoints(prev => [...prev, breakpoint]);
    return breakpoint.id;
  }, []);
  
  const removeBreakpoint = useCallback((breakpointId: string) => {
    setBreakpoints(prev => prev.filter(bp => bp.id !== breakpointId));
  }, []);
  
  const toggleBreakpoint = useCallback((breakpointId: string) => {
    setBreakpoints(prev => prev.map(bp => 
      bp.id === breakpointId ? { ...bp, enabled: !bp.enabled } : bp
    ));
  }, []);
  
  const incrementRetryCount = useCallback((taskId: string) => {
    setRetryHistory(prev => {
      const newMap = new Map(prev);
      newMap.set(taskId, (newMap.get(taskId) || 0) + 1);
      return newMap;
    });
  }, []);
  
  const getRetryCount = useCallback((taskId: string) => {
    return retryHistory.get(taskId) || 0;
  }, [retryHistory]);
  
  return {
    controlState,
    breakpoints,
    retryHistory,
    play,
    pause,
    resume,
    cancel,
    abort,
    reset,
    addBreakpoint,
    removeBreakpoint,
    toggleBreakpoint,
    incrementRetryCount,
    getRetryCount,
    setControlState,
  };
}

export default InteractiveWorkflowControls; 