/**
 * Advanced Workflow Controls Component
 * 
 * Sophisticated workflow debugging and control system with:
 * - Breakpoint management with conditional logic
 * - Step-through debugging with state inspection
 * - Conditional task execution
 * - Workflow versioning and comparison
 * - Advanced performance profiling
 * 
 * SUCCESS CRITERIA:
 * - Breakpoints can be set with conditions
 * - Step debugging works flawlessly
 * - Conditional execution prevents unwanted task runs
 * - Workflow versions can be compared and restored
 * - Performance profiling shows bottlenecks
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { WorkflowDefinition, TaskDefinition, TaskExecutionContext } from './TaskOrchestrator.js';
import { logger } from '../../utils/logger.js';

/**
 * Breakpoint configuration
 */
export interface WorkflowBreakpoint {
  id: string;
  taskId: string;
  condition?: string;
  enabled: boolean;
  hitCount: number;
  createdAt: Date;
  description?: string;
}

/**
 * Execution step information
 */
export interface ExecutionStep {
  stepNumber: number;
  taskId: string;
  action: 'start' | 'complete' | 'pause' | 'skip' | 'error';
  timestamp: number;
  state: Record<string, any>;
  variables: Record<string, any>;
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    duration: number;
  };
}

/**
 * Workflow version information
 */
export interface WorkflowVersion {
  id: string;
  version: string;
  name: string;
  description: string;
  workflow: WorkflowDefinition;
  createdAt: Date;
  author: string;
  tags: string[];
  changeLog: string[];
}

/**
 * Conditional execution rule
 */
export interface ConditionalRule {
  id: string;
  taskId: string;
  condition: string;
  action: 'skip' | 'pause' | 'abort' | 'retry';
  enabled: boolean;
  description: string;
}

/**
 * Advanced workflow controls props
 */
export interface AdvancedWorkflowControlsProps {
  /**
   * Current workflow
   */
  workflow: WorkflowDefinition;
  
  /**
   * Current execution context
   */
  executionContext: TaskExecutionContext;
  
  /**
   * Whether controls are focused
   */
  isFocused?: boolean;
  
  /**
   * Debug mode enabled
   */
  debugMode?: boolean;
  
  /**
   * Show advanced features
   */
  showAdvanced?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Workflow control callbacks
   */
  onBreakpointHit?: (breakpoint: WorkflowBreakpoint, step: ExecutionStep) => void;
  onStepComplete?: (step: ExecutionStep) => void;
  onConditionalAction?: (rule: ConditionalRule, task: TaskDefinition) => void;
  onVersionChange?: (version: WorkflowVersion) => void;
  
  /**
   * Workflow execution callbacks
   */
  onExecuteStep?: (taskId: string) => Promise<void>;
  onSkipTask?: (taskId: string) => void;
  onPauseExecution?: () => void;
  onResumeExecution?: () => void;
  onAbortExecution?: () => void;
}

/**
 * Advanced workflow controls component
 */
export const AdvancedWorkflowControls: React.FC<AdvancedWorkflowControlsProps> = ({
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
  const [breakpoints, setBreakpoints] = useState<Map<string, WorkflowBreakpoint>>(new Map());
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [conditionalRules, setConditionalRules] = useState<Map<string, ConditionalRule>>(new Map());
  const [workflowVersions, setWorkflowVersions] = useState<Map<string, WorkflowVersion>>(new Map());
  const [currentVersion, setCurrentVersion] = useState<string>('');
  
  // UI state
  const [selectedMode, setSelectedMode] = useState<'breakpoints' | 'stepping' | 'conditions' | 'versions' | 'profiler'>('breakpoints');
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [showStateInspector, setShowStateInspector] = useState(false);
  const [isStepMode, setIsStepMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Performance tracking
  const [performanceProfile, setPerformanceProfile] = useState<Map<string, {
    totalTime: number;
    averageTime: number;
    executionCount: number;
    memoryPeak: number;
    cpuPeak: number;
  }>>(new Map());
  
  // Initialize with current workflow version
  useEffect(() => {
    const initialVersion: WorkflowVersion = {
      id: `v-${Date.now()}`,
      version: '1.0.0',
      name: workflow.name,
      description: 'Initial version',
      workflow: { ...workflow },
      createdAt: new Date(),
      author: 'User',
      tags: ['initial'],
      changeLog: ['Initial workflow creation'],
    };
    
    setWorkflowVersions(new Map([['initial', initialVersion]]));
    setCurrentVersion('initial');
    
    logger.info('Advanced workflow controls initialized', {
      workflowId: workflow.id,
      taskCount: workflow.tasks.length,
    });
  }, [workflow]);
  
  // Breakpoint management
  const addBreakpoint = useCallback((taskId: string, condition?: string, description?: string) => {
    const breakpoint: WorkflowBreakpoint = {
      id: `bp-${Date.now()}`,
      taskId,
      condition,
      enabled: true,
      hitCount: 0,
      createdAt: new Date(),
      description,
    };
    
    setBreakpoints(prev => new Map(prev.set(breakpoint.id, breakpoint)));
    
    logger.info('Breakpoint added', { taskId, condition, description });
  }, []);
  
  const removeBreakpoint = useCallback((breakpointId: string) => {
    setBreakpoints(prev => {
      const newMap = new Map(prev);
      newMap.delete(breakpointId);
      return newMap;
    });
    
    logger.info('Breakpoint removed', { breakpointId });
  }, []);
  
  const toggleBreakpoint = useCallback((breakpointId: string) => {
    setBreakpoints(prev => {
      const breakpoint = prev.get(breakpointId);
      if (!breakpoint) return prev;
      
      const updated = { ...breakpoint, enabled: !breakpoint.enabled };
      return new Map(prev.set(breakpointId, updated));
    });
  }, []);
  
  // Conditional execution rules
  const addConditionalRule = useCallback((
    taskId: string,
    condition: string,
    action: ConditionalRule['action'],
    description: string
  ) => {
    const rule: ConditionalRule = {
      id: `rule-${Date.now()}`,
      taskId,
      condition,
      action,
      enabled: true,
      description,
    };
    
    setConditionalRules(prev => new Map(prev.set(rule.id, rule)));
    
    logger.info('Conditional rule added', { taskId, condition, action, description });
  }, []);
  
  // Step-through debugging
  const executeNextStep = useCallback(async () => {
    if (!isStepMode || currentStepIndex >= workflow.tasks.length) return;
    
    const task = workflow.tasks[currentStepIndex];
    const startTime = Date.now();
    
    // Check for breakpoints
    const taskBreakpoints = Array.from(breakpoints.values()).filter(bp => 
      bp.taskId === task.id && bp.enabled
    );
    
    for (const breakpoint of taskBreakpoints) {
      // Evaluate condition if present
      if (breakpoint.condition) {
        try {
          // Simple condition evaluation (in real implementation, use a proper evaluator)
          const conditionMet = eval(breakpoint.condition.replace(/\{(\w+)\}/g, (_, key) => 
            JSON.stringify(executionContext.sharedState[key])
          ));
          
          if (conditionMet) {
            breakpoint.hitCount++;
            setBreakpoints(prev => new Map(prev.set(breakpoint.id, breakpoint)));
            
            const step: ExecutionStep = {
              stepNumber: currentStepIndex + 1,
              taskId: task.id,
              action: 'pause',
              timestamp: Date.now(),
              state: { ...executionContext.sharedState },
              variables: { ...executionContext.environment },
              performance: {
                memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
                cpuUsage: 0, // Would need actual CPU monitoring
                duration: 0,
              },
            };
            
            setExecutionSteps(prev => [...prev, step]);
            onBreakpointHit?.(breakpoint, step);
            
            logger.info('Breakpoint hit', { 
              breakpointId: breakpoint.id, 
              taskId: task.id, 
              condition: breakpoint.condition 
            });
            return;
          }
        } catch (error) {
          logger.warn('Breakpoint condition evaluation failed', { 
            condition: breakpoint.condition, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      } else {
        // Unconditional breakpoint
        breakpoint.hitCount++;
        setBreakpoints(prev => new Map(prev.set(breakpoint.id, breakpoint)));
        
        const step: ExecutionStep = {
          stepNumber: currentStepIndex + 1,
          taskId: task.id,
          action: 'pause',
          timestamp: Date.now(),
          state: { ...executionContext.sharedState },
          variables: { ...executionContext.environment },
          performance: {
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            cpuUsage: 0,
            duration: 0,
          },
        };
        
        setExecutionSteps(prev => [...prev, step]);
        onBreakpointHit?.(breakpoint, step);
        return;
      }
    }
    
    // Check conditional rules
    const taskRules = Array.from(conditionalRules.values()).filter(rule => 
      rule.taskId === task.id && rule.enabled
    );
    
    for (const rule of taskRules) {
      try {
        const conditionMet = eval(rule.condition.replace(/\{(\w+)\}/g, (_, key) => 
          JSON.stringify(executionContext.sharedState[key])
        ));
        
        if (conditionMet) {
          const step: ExecutionStep = {
            stepNumber: currentStepIndex + 1,
            taskId: task.id,
            action: rule.action === 'skip' ? 'skip' : 'pause',
            timestamp: Date.now(),
            state: { ...executionContext.sharedState },
            variables: { ...executionContext.environment },
            performance: {
              memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
              cpuUsage: 0,
              duration: 0,
            },
          };
          
          setExecutionSteps(prev => [...prev, step]);
          onConditionalAction?.(rule, task);
          
          if (rule.action === 'skip') {
            onSkipTask?.(task.id);
            setCurrentStepIndex(prev => prev + 1);
          }
          
          logger.info('Conditional rule triggered', { 
            ruleId: rule.id, 
            taskId: task.id, 
            action: rule.action 
          });
          return;
        }
      } catch (error) {
        logger.warn('Conditional rule evaluation failed', { 
          condition: rule.condition, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    // Execute the task
    try {
      if (onExecuteStep) {
        await onExecuteStep(task.id);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Update performance profile
      setPerformanceProfile(prev => {
        const current = prev.get(task.id) || {
          totalTime: 0,
          averageTime: 0,
          executionCount: 0,
          memoryPeak: 0,
          cpuPeak: 0,
        };
        
        const updated = {
          totalTime: current.totalTime + duration,
          averageTime: (current.totalTime + duration) / (current.executionCount + 1),
          executionCount: current.executionCount + 1,
          memoryPeak: Math.max(current.memoryPeak, process.memoryUsage().heapUsed / 1024 / 1024),
          cpuPeak: current.cpuPeak, // Would need actual CPU monitoring
        };
        
        return new Map(prev.set(task.id, updated));
      });
      
      const step: ExecutionStep = {
        stepNumber: currentStepIndex + 1,
        taskId: task.id,
        action: 'complete',
        timestamp: endTime,
        state: { ...executionContext.sharedState },
        variables: { ...executionContext.environment },
        performance: {
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          cpuUsage: 0,
          duration,
        },
      };
      
      setExecutionSteps(prev => [...prev, step]);
      onStepComplete?.(step);
      
      setCurrentStepIndex(prev => prev + 1);
      
      logger.info('Step executed successfully', { taskId: task.id, duration });
      
    } catch (error) {
      const step: ExecutionStep = {
        stepNumber: currentStepIndex + 1,
        taskId: task.id,
        action: 'error',
        timestamp: Date.now(),
        state: { ...executionContext.sharedState },
        variables: { ...executionContext.environment },
        performance: {
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
          cpuUsage: 0,
          duration: Date.now() - startTime,
        },
      };
      
      setExecutionSteps(prev => [...prev, step]);
      
      logger.error('Step execution failed', { 
        taskId: task.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }, [
    isStepMode,
    currentStepIndex,
    workflow.tasks,
    breakpoints,
    conditionalRules,
    executionContext,
    onBreakpointHit,
    onStepComplete,
    onConditionalAction,
    onExecuteStep,
    onSkipTask,
  ]);
  
  // Workflow versioning
  const createVersion = useCallback((version: string, description: string, changeLog: string[]) => {
    const newVersion: WorkflowVersion = {
      id: `v-${Date.now()}`,
      version,
      name: workflow.name,
      description,
      workflow: { ...workflow },
      createdAt: new Date(),
      author: 'User',
      tags: [],
      changeLog,
    };
    
    setWorkflowVersions(prev => new Map(prev.set(newVersion.id, newVersion)));
    setCurrentVersion(newVersion.id);
    onVersionChange?.(newVersion);
    
    logger.info('Workflow version created', { version, description });
  }, [workflow, onVersionChange]);
  
  // Keyboard input handling
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.tab) {
      // Cycle through modes
      const modes: (typeof selectedMode)[] = ['breakpoints', 'stepping', 'conditions', 'versions', 'profiler'];
      const currentIndex = modes.indexOf(selectedMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setSelectedMode(modes[nextIndex]);
    } else if (input === 'b') {
      // Add breakpoint to selected task
      const task = workflow.tasks[selectedTaskIndex];
      if (task) {
        addBreakpoint(task.id, undefined, `Breakpoint on ${task.name}`);
      }
    } else if (input === 's') {
      // Toggle step mode
      setIsStepMode(prev => !prev);
      if (!isStepMode) {
        setCurrentStepIndex(0);
        setExecutionSteps([]);
      }
    } else if (input === 'n' && isStepMode) {
      // Execute next step
      executeNextStep();
    } else if (input === 'i') {
      // Toggle state inspector
      setShowStateInspector(prev => !prev);
    } else if (input === 'v') {
      // Create new version
      createVersion(
        `v${Date.now()}`,
        'Manual version checkpoint',
        ['Manual checkpoint created via controls']
      );
    } else if (key.upArrow) {
      setSelectedTaskIndex(Math.max(0, selectedTaskIndex - 1));
    } else if (key.downArrow) {
      setSelectedTaskIndex(Math.min(workflow.tasks.length - 1, selectedTaskIndex + 1));
    }
  });
  
  // Render breakpoints view
  const renderBreakpoints = (): React.ReactNode => {
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
              </Box>
            );
          })
        )}
      </Box>
    );
  };
  
  // Render stepping view
  const renderStepping = (): React.ReactNode => {
    const currentTask = workflow.tasks[currentStepIndex];
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={Colors.Primary} bold>👣 Step Debugging</Text>
          <Box marginLeft={2}>
            <Text color={isStepMode ? Colors.Success : Colors.TextDim}>
              {isStepMode ? 'ENABLED' : 'DISABLED'}
            </Text>
          </Box>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={Colors.Text}>
            Current Step: {currentStepIndex + 1}/{workflow.tasks.length}
          </Text>
        </Box>
        
        {currentTask && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color={Colors.Info}>
              Next Task: {currentTask.name}
            </Text>
            <Box marginLeft={2}>
              <Text color={Colors.TextDim}>
                {currentTask.description}
              </Text>
            </Box>
          </Box>
        )}
        
        <Box marginBottom={1}>
          <Text color={Colors.TextDim}>
            Steps Executed: {executionSteps.length}
          </Text>
        </Box>
        
        {executionSteps.slice(-3).map((step, index) => (
          <Box key={step.stepNumber} marginLeft={2}>
            <Text color={
              step.action === 'complete' ? Colors.Success :
              step.action === 'error' ? Colors.Error :
              step.action === 'skip' ? Colors.Warning :
              Colors.Info
            }>
              {step.stepNumber}. {step.action.toUpperCase()}
            </Text>
            <Box marginLeft={1}>
              <Text color={Colors.TextDim}>
                {workflow.tasks.find(t => t.id === step.taskId)?.name || step.taskId}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };
  
  // Render conditional rules view
  const renderConditionalRules = (): React.ReactNode => {
    const rulesList = Array.from(conditionalRules.values());
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={Colors.Primary} bold>⚡ Conditional Rules ({rulesList.length})</Text>
        </Box>
        
        {rulesList.length === 0 ? (
          <Text color={Colors.TextDim}>No conditional rules defined.</Text>
        ) : (
          rulesList.map(rule => {
            const task = workflow.tasks.find(t => t.id === rule.taskId);
            
            return (
              <Box key={rule.id} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color={rule.enabled ? Colors.Warning : Colors.TextDim}>
                    {rule.enabled ? '⚡' : '⚪'}
                  </Text>
                  <Box marginLeft={1}>
                    <Text color={Colors.Text}>
                      {task?.name || rule.taskId}
                    </Text>
                  </Box>
                  <Box marginLeft={2}>
                    <Text color={Colors.Info}>
                      → {rule.action.toUpperCase()}
                    </Text>
                  </Box>
                </Box>
                <Box marginLeft={2}>
                  <Text color={Colors.TextDim}>
                    if ({rule.condition})
                  </Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    );
  };
  
  // Render versions view
  const renderVersions = (): React.ReactNode => {
    const versionsList = Array.from(workflowVersions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={Colors.Primary} bold>📚 Workflow Versions ({versionsList.length})</Text>
        </Box>
        
        {versionsList.map(version => (
          <Box key={version.id} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={version.id === currentVersion ? Colors.Success : Colors.Text}>
                {version.id === currentVersion ? '●' : '○'}
              </Text>
              <Box marginLeft={1}>
                <Text color={Colors.Info} bold>
                  {version.version}
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text color={Colors.Text}>
                  {version.description}
                </Text>
              </Box>
            </Box>
            <Box marginLeft={2}>
              <Text color={Colors.TextDim}>
                {version.createdAt.toLocaleString()} by {version.author}
              </Text>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };
  
  // Render performance profiler
  const renderProfiler = (): React.ReactNode => {
    const profileEntries = Array.from(performanceProfile.entries()).sort(
      (a, b) => b[1].totalTime - a[1].totalTime
    );
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={Colors.Primary} bold>📊 Performance Profile</Text>
        </Box>
        
        {profileEntries.length === 0 ? (
          <Text color={Colors.TextDim}>No performance data available. Run tasks to collect data.</Text>
        ) : (
          profileEntries.map(([taskId, profile]) => {
            const task = workflow.tasks.find(t => t.id === taskId);
            
            return (
              <Box key={taskId} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color={Colors.Info} bold>
                    {task?.name || taskId}
                  </Text>
                </Box>
                <Box marginLeft={2}>
                  <Text color={Colors.Text}>
                    Avg: {profile.averageTime.toFixed(0)}ms
                  </Text>
                  <Box marginLeft={4}>
                    <Text color={Colors.Text}>
                      Total: {profile.totalTime.toFixed(0)}ms
                    </Text>
                  </Box>
                  <Box marginLeft={4}>
                    <Text color={Colors.Text}>
                      Runs: {profile.executionCount}
                    </Text>
                  </Box>
                </Box>
                <Box marginLeft={2}>
                  <Text color={Colors.TextDim}>
                    Memory Peak: {profile.memoryPeak.toFixed(1)}MB
                  </Text>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    );
  };
  
  // Render state inspector
  const renderStateInspector = (): React.ReactNode => {
    if (!showStateInspector) return null;
    
    return (
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="blue">
        <Box marginBottom={1}>
          <Text color={Colors.Info} bold>🔍 State Inspector</Text>
        </Box>
        
        <Box flexDirection="column">
          <Text color={Colors.Text} bold>Shared State:</Text>
          {Object.entries(executionContext.sharedState).map(([key, value]) => (
            <Box key={key} marginLeft={2}>
              <Text color={Colors.Info}>{key}:</Text>
              <Box marginLeft={1}>
                <Text color={Colors.Text}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
        
        <Box flexDirection="column" marginTop={1}>
          <Text color={Colors.Text} bold>Environment:</Text>
          {Object.entries(executionContext.environment).slice(0, 5).map(([key, value]) => (
            <Box key={key} marginLeft={2}>
              <Text color={Colors.Info}>{key}:</Text>
              <Box marginLeft={1}>
                <Text color={Colors.Text}>
                  {String(value).length > 50 ? `${String(value).substring(0, 50)}...` : String(value)}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };
  
  // Main render
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
            <Text color={selectedMode === mode ? Colors.Primary : Colors.TextDim} bold={selectedMode === mode}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </Box>
        ))}
      </Box>
      
      {/* Content based on selected mode */}
      <Box flexDirection="column">
        {selectedMode === 'breakpoints' && renderBreakpoints()}
        {selectedMode === 'stepping' && renderStepping()}
        {selectedMode === 'conditions' && renderConditionalRules()}
        {selectedMode === 'versions' && renderVersions()}
        {selectedMode === 'profiler' && renderProfiler()}
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

/**
 * Hook for managing advanced workflow controls
 */
export function useAdvancedWorkflowControls() {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(null);
  const [debugSession, setDebugSession] = useState<{
    id: string;
    startTime: number;
    steps: ExecutionStep[];
    breakpointsHit: number;
    rulesTriggered: number;
  } | null>(null);
  
  const startDebugSession = useCallback((workflow: WorkflowDefinition) => {
    const session = {
      id: `debug-${Date.now()}`,
      startTime: Date.now(),
      steps: [],
      breakpointsHit: 0,
      rulesTriggered: 0,
    };
    
    setDebugSession(session);
    setCurrentWorkflow(workflow);
    setIsDebugMode(true);
    
    logger.info('Debug session started', { sessionId: session.id, workflowId: workflow.id });
  }, []);
  
  const endDebugSession = useCallback(() => {
    if (debugSession) {
      const duration = Date.now() - debugSession.startTime;
      logger.info('Debug session ended', {
        sessionId: debugSession.id,
        duration,
        stepsExecuted: debugSession.steps.length,
        breakpointsHit: debugSession.breakpointsHit,
        rulesTriggered: debugSession.rulesTriggered,
      });
    }
    
    setDebugSession(null);
    setCurrentWorkflow(null);
    setIsDebugMode(false);
  }, [debugSession]);
  
  return {
    isDebugMode,
    currentWorkflow,
    debugSession,
    startDebugSession,
    endDebugSession,
    setIsDebugMode,
  };
}

export default AdvancedWorkflowControls; 