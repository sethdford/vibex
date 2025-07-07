/**
 * Advanced Workflow Controls Core - Clean Architecture like Gemini CLI
 * 
 * Main component that composes all advanced workflow control services
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../../colors.js';
import { logger } from '../../../utils/logger.js';

// Services
import { BreakpointService } from './BreakpointService.js';
import { SteppingService } from './SteppingService.js';
import { PerformanceService } from './PerformanceService.js';
import { VersioningService } from './VersioningService.js';

// Components
import { BreakpointView } from './BreakpointView.js';
import { SteppingView } from './SteppingView.js';
import { PerformanceView } from './PerformanceView.js';
import { VersioningView } from './VersioningView.js';
import { ConditionalRulesView } from './ConditionalRulesView.js';

// Types
import type {
  AdvancedWorkflowControlsProps,
  AdvancedControlsState,
  AdvancedControlsConfig,
  AdvancedControlsCallbacks,
  ControlMode,
  WorkflowBreakpoint,
  ExecutionStep,
  ConditionalRule,
  WorkflowVersion,
  TaskExecutionContext,
} from './types.js';

/**
 * Advanced workflow controls core component
 */
export const AdvancedWorkflowControlsCore: React.FC<AdvancedWorkflowControlsProps> = ({
  workflow,
  executionContext,
  isFocused = false,
  debugMode = false,
  showAdvanced = true,
  maxWidth = 120,
  onBreakpointHit,
  onStepComplete,
  onConditionalAction,
  onVersionChange,
  onExecuteStep,
  onSkipTask,
  onPauseExecution,
  onResumeExecution,
  onAbortExecution,
}) => {
  // State management
  const [state, setState] = useState<AdvancedControlsState>({
    breakpoints: new Map(),
    executionSteps: [],
    conditionalRules: new Map(),
    workflowVersions: new Map(),
    currentVersion: '',
    performanceProfile: new Map(),
    selectedMode: 'breakpoints',
    selectedTaskIndex: 0,
    showStateInspector: false,
    isStepMode: false,
    currentStepIndex: 0,
  });

  // Configuration
  const config: AdvancedControlsConfig = {
    debugMode,
    showAdvanced,
    maxWidth,
    enableBreakpoints: true,
    enableStepping: true,
    enableProfiling: true,
  };

  // Callbacks
  const callbacks: AdvancedControlsCallbacks = {
    onBreakpointHit,
    onStepComplete,
    onConditionalAction,
    onVersionChange,
    onExecuteStep,
    onSkipTask,
    onPauseExecution,
    onResumeExecution,
    onAbortExecution,
  };

  // Initialize with current workflow version
  useEffect(() => {
    const initialVersion = VersioningService.createVersion(
      workflow,
      '1.0.0',
      'Initial version',
      ['Initial workflow creation'],
      'User',
      ['initial']
    );
    
    setState(prev => ({
      ...prev,
      workflowVersions: new Map([['initial', initialVersion]]),
      currentVersion: 'initial',
    }));
    
    logger.info('Advanced workflow controls initialized', {
      workflowId: workflow.id,
      taskCount: workflow.tasks.length,
    });
  }, [workflow]);

  // Update state helper
  const updateState = useCallback((updates: Partial<AdvancedControlsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Breakpoint management
  const addBreakpoint = useCallback((taskId: string, condition?: string, description?: string) => {
    const newBreakpoints = BreakpointService.addBreakpoint(
      state.breakpoints,
      taskId,
      condition,
      description
    );
    updateState({ breakpoints: newBreakpoints });
  }, [state.breakpoints, updateState]);

  const removeBreakpoint = useCallback((breakpointId: string) => {
    const newBreakpoints = BreakpointService.removeBreakpoint(state.breakpoints, breakpointId);
    updateState({ breakpoints: newBreakpoints });
  }, [state.breakpoints, updateState]);

  const toggleBreakpoint = useCallback((breakpointId: string) => {
    const newBreakpoints = BreakpointService.toggleBreakpoint(state.breakpoints, breakpointId);
    updateState({ breakpoints: newBreakpoints });
  }, [state.breakpoints, updateState]);

  // Step debugging
  const executeNextStep = useCallback(async () => {
    if (!state.isStepMode || state.currentStepIndex >= workflow.tasks.length) return;

    try {
      const result = await SteppingService.executeNextStep(
        workflow,
        state.currentStepIndex,
        {...executionContext, sharedState: {}},
        state.breakpoints,
        state.conditionalRules,
        callbacks
      );

      // Update performance profile
      const newPerformanceProfile = PerformanceService.updateFromExecutionStep(
        state.performanceProfile,
        result.step
      );

      // Update breakpoint hit count if applicable
      let newBreakpoints = state.breakpoints;
      if (result.hitBreakpoint) {
        newBreakpoints = BreakpointService.incrementHitCount(
          state.breakpoints,
          result.hitBreakpoint.id
        );
      }

      updateState({
        executionSteps: [...state.executionSteps, result.step],
        currentStepIndex: result.nextStepIndex,
        performanceProfile: newPerformanceProfile,
        breakpoints: newBreakpoints,
      });

      // Trigger callbacks
      callbacks.onStepComplete?.(result.step);
      if (result.hitBreakpoint) {
        callbacks.onBreakpointHit?.(result.hitBreakpoint, result.step);
      }
      if (result.triggeredRule) {
        const task = workflow.tasks.find(t => t.id === result.step.taskId);
        if (task) {
          callbacks.onConditionalAction?.(result.triggeredRule, task);
        }
      }

    } catch (error) {
      logger.error('Step execution failed', {
        currentStepIndex: state.currentStepIndex,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }, [
    state.isStepMode,
    state.currentStepIndex,
    state.breakpoints,
    state.conditionalRules,
    state.performanceProfile,
    state.executionSteps,
    workflow,
    executionContext,
    callbacks,
    updateState,
  ]);

  // Version management
  const createVersion = useCallback((version: string, description: string, changeLog: string[]) => {
    const newVersion = VersioningService.createVersion(
      workflow,
      version,
      description,
      changeLog,
      'User',
      []
    );
    
    const newVersions = VersioningService.addVersion(state.workflowVersions, newVersion);
    updateState({
      workflowVersions: newVersions,
      currentVersion: newVersion.id,
    });
    
    callbacks.onVersionChange?.(newVersion);
  }, [workflow, state.workflowVersions, updateState, callbacks]);

  // Conditional rules management
  const addConditionalRule = useCallback((
    taskId: string,
    condition: string,
    action: ConditionalRule['action'],
    description: string
  ) => {
    const rule: ConditionalRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      condition,
      action,
      enabled: true,
      description,
    };
    
    const newRules = new Map(state.conditionalRules);
    newRules.set(rule.id, rule);
    updateState({ conditionalRules: newRules });
    
    logger.info('Conditional rule added', { taskId, condition, action, description });
  }, [state.conditionalRules, updateState]);

  // Keyboard input handling
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.tab) {
      // Cycle through modes
      const modes: ControlMode[] = ['breakpoints', 'stepping', 'conditions', 'versions', 'profiler'];
      const currentIndex = modes.indexOf(state.selectedMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      updateState({ selectedMode: modes[nextIndex] });
    } else if (input === 'b') {
      // Add breakpoint to selected task
      const task = workflow.tasks[state.selectedTaskIndex];
      if (task) {
        addBreakpoint(task.id, undefined, `Breakpoint on ${task.name}`);
      }
    } else if (input === 's') {
      // Toggle step mode
      const newStepMode = !state.isStepMode;
      updateState({ isStepMode: newStepMode });
      if (newStepMode) {
        const resetState = SteppingService.resetStepping();
        updateState(resetState);
      }
    } else if (input === 'n' && state.isStepMode) {
      // Execute next step
      executeNextStep();
    } else if (input === 'i') {
      // Toggle state inspector
      updateState({ showStateInspector: !state.showStateInspector });
    } else if (input === 'v') {
      // Create new version
      createVersion(
        `v${Date.now()}`,
        'Manual version checkpoint',
        ['Manual checkpoint created via controls']
      );
    } else if (key.upArrow) {
      updateState({ 
        selectedTaskIndex: Math.max(0, state.selectedTaskIndex - 1) 
      });
    } else if (key.downArrow) {
      updateState({ 
        selectedTaskIndex: Math.min(workflow.tasks.length - 1, state.selectedTaskIndex + 1) 
      });
    }
  });

  // Render mode content
  const renderModeContent = (): React.ReactNode => {
    switch (state.selectedMode) {
      case 'breakpoints':
        return (
          <BreakpointView
            breakpoints={state.breakpoints}
            workflow={workflow}
            selectedTaskIndex={state.selectedTaskIndex}
            onAddBreakpoint={addBreakpoint}
            onRemoveBreakpoint={removeBreakpoint}
            onToggleBreakpoint={toggleBreakpoint}
            config={config}
          />
        );
      case 'stepping':
        return (
          <SteppingView
            workflow={workflow}
            isStepMode={state.isStepMode}
            currentStepIndex={state.currentStepIndex}
            executionSteps={state.executionSteps}
            onExecuteNextStep={executeNextStep}
            onToggleStepMode={() => updateState({ isStepMode: !state.isStepMode })}
            config={config}
          />
        );
      case 'conditions':
        return (
          <ConditionalRulesView
            conditionalRules={state.conditionalRules}
            workflow={workflow}
            selectedTaskIndex={state.selectedTaskIndex}
            onAddRule={addConditionalRule}
            onRemoveRule={(ruleId: any) => {
              const newRules = new Map(state.conditionalRules);
              newRules.delete(ruleId);
              updateState({ conditionalRules: newRules });
            }}
            config={config}
          />
        );
      case 'versions':
        return (
          <VersioningView
            workflowVersions={state.workflowVersions}
            currentVersion={state.currentVersion}
            workflow={workflow}
            onCreateVersion={createVersion}
            onRestoreVersion={(versionId: any) => {
              const restored = VersioningService.restoreToVersion(state.workflowVersions, versionId);
              if (restored) {
                updateState({ currentVersion: versionId });
                // Would need to update the actual workflow in parent component
              }
            }}
            config={config}
          />
        );
      case 'profiler':
        return (
          <PerformanceView
            performanceProfile={state.performanceProfile}
            workflow={workflow}
            executionSteps={state.executionSteps}
            config={config}
          />
        );
      default:
        return null;
    }
  };

  // Render state inspector
  const renderStateInspector = (): React.ReactNode => {
    if (!state.showStateInspector) return null;

    return (
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="cyan">
        <Box>
          <Text color={Colors.Info} bold>🔍 State Inspector</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={Colors.Text}>Shared State:</Text>
        </Box>
        {Object.entries(executionContext.sharedState).slice(0, 5).map(([key, value]) => (
          <Box key={key} marginLeft={2}>
            <Text color={Colors.Info}>{key}:</Text>
            <Box marginLeft={1}>
              <Text color={Colors.TextDim}>{String(value).slice(0, 50)}</Text>
            </Box>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text color={Colors.Text}>Environment:</Text>
        </Box>
        {Object.entries(executionContext.environment).slice(0, 3).map(([key, value]) => (
          <Box key={key} marginLeft={2}>
            <Text color={Colors.Info}>{key}:</Text>
            <Box marginLeft={1}>
              <Text color={Colors.TextDim}>{String(value).slice(0, 30)}</Text>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color={Colors.Primary} bold>
          🎛️ Advanced Workflow Controls
        </Text>
        <Box marginLeft={2}>
          <Text color={debugMode ? Colors.Success : Colors.TextDim}>
            [{debugMode ? 'DEBUG' : 'NORMAL'}]
          </Text>
        </Box>
      </Box>
      
      {/* Mode tabs */}
      <Box marginBottom={1}>
        {(['breakpoints', 'stepping', 'conditions', 'versions', 'profiler'] as const).map(mode => (
          <Box key={mode} marginRight={2}>
            <Text 
              color={state.selectedMode === mode ? Colors.Primary : Colors.TextDim} 
              bold={state.selectedMode === mode}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Box>
        ))}
      </Box>
      
      {/* Content based on selected mode */}
      <Box flexDirection="column">
        {renderModeContent()}
      </Box>
      
      {/* State inspector */}
      {renderStateInspector()}
      
      {/* Controls hint */}
      {isFocused && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Tab: Switch Mode • B: Add Breakpoint • S: Toggle Step Mode • N: Next Step • I: Inspector • V: Version
          </Text>
        </Box>
      )}
    </Box>
  );
};