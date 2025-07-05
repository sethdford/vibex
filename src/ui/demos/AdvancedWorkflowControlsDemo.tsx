/**
 * Advanced Workflow Controls Demo Component
 * 
 * Comprehensive demonstration of advanced workflow debugging and control features:
 * - Interactive breakpoint management
 * - Step-through debugging with state inspection
 * - Conditional execution rules
 * - Workflow versioning and comparison
 * - Performance profiling and analysis
 * 
 * Demo Modes:
 * 1. Breakpoint Demo - Shows conditional and unconditional breakpoints
 * 2. Step Debugging Demo - Demonstrates step-by-step execution
 * 3. Conditional Rules Demo - Shows conditional task execution
 * 4. Versioning Demo - Workflow version management
 * 5. Performance Demo - Performance profiling and optimization
 * 6. Full Integration Demo - All features working together
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { AdvancedWorkflowControls, useAdvancedWorkflowControls } from '../components/AdvancedWorkflowControls.js';
import { WorkflowDefinition, TaskDefinition, TaskExecutionContext } from '../components/TaskOrchestrator.js';
import { useDemoWorkflows } from '../components/RealTimeTaskOrchestrator.js';
import { logger } from '../../utils/logger.js';

/**
 * Demo mode types
 */
type DemoMode = 
  | 'breakpoints'
  | 'stepping'
  | 'conditional'
  | 'versioning'
  | 'performance'
  | 'integration'
  | 'auto_cycle';

/**
 * Advanced workflow controls demo props
 */
export interface AdvancedWorkflowControlsDemoProps {
  /**
   * Whether the demo is focused for input
   */
  isFocused?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Auto-cycle through demos
   */
  autoCycle?: boolean;
  
  /**
   * Cycle interval in milliseconds
   */
  cycleInterval?: number;
  
  /**
   * Show demo instructions
   */
  showInstructions?: boolean;
  
  /**
   * Enable real-time updates
   */
  enableRealTime?: boolean;
}

/**
 * Advanced workflow controls demo component
 */
export const AdvancedWorkflowControlsDemo: React.FC<AdvancedWorkflowControlsDemoProps> = ({
  isFocused = false,
  maxWidth = 120,
  autoCycle = false,
  cycleInterval = 10000,
  showInstructions = true,
  enableRealTime = true,
}) => {
  // Demo state
  const [currentMode, setCurrentMode] = useState<DemoMode>('breakpoints');
  const [demoStartTime] = useState(Date.now());
  const [demoStats, setDemoStats] = useState({
    breakpointsCreated: 0,
    stepsExecuted: 0,
    rulesTriggered: 0,
    versionsCreated: 0,
    performanceProfilesGenerated: 0,
  });
  
  // Workflow controls
  const {
    isDebugMode,
    currentWorkflow,
    debugSession,
    startDebugSession,
    endDebugSession,
  } = useAdvancedWorkflowControls();
  
  // Demo workflows
  const { createDemoWorkflow } = useDemoWorkflows();
  
  // Current demo workflow
  const [demoWorkflow, setDemoWorkflow] = useState<WorkflowDefinition | null>(null);
  const [executionContext, setExecutionContext] = useState<TaskExecutionContext>({
    workingDirectory: process.cwd(),
    environment: Object.fromEntries(
      Object.entries(process.env).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>,
    sharedState: {
      demoMode: true,
      currentStep: 0,
      debugEnabled: true,
      performanceTracking: true,
    },
    availableTools: ['file_ops', 'analysis', 'testing', 'deployment'],
    timeout: 30000,
  });

  // Create demo workflows based on current mode
  useEffect(() => {
    let workflow: WorkflowDefinition;
    
    switch (currentMode) {
      case 'breakpoints':
        workflow = createDemoWorkflow('simple');
        break;
      case 'stepping':
        workflow = createDemoWorkflow('complex');
        break;
      case 'conditional':
        workflow = createDemoWorkflow('parallel');
        break;
      case 'versioning':
        workflow = createDemoWorkflow('simple');
        break;
      case 'performance':
        workflow = createDemoWorkflow('complex');
        break;
      case 'integration':
        workflow = createDemoWorkflow('parallel');
        break;
      default:
        workflow = createDemoWorkflow('simple');
    }
    
    setDemoWorkflow(workflow);
    
    // Update execution context with demo-specific state
    setExecutionContext(prev => ({
      ...prev,
      sharedState: {
        ...prev.sharedState,
        demoMode: currentMode,
        workflowType: workflow.name,
        taskCount: workflow.tasks.length,
      },
    }));
    
    logger.info('Demo workflow created', { 
      mode: currentMode, 
      workflowId: workflow.id,
      taskCount: workflow.tasks.length,
    });
  }, [currentMode, createDemoWorkflow]);

  // Handle workflow control callbacks
  const handleBreakpointHit = useCallback((breakpoint: any, step: any) => {
    setDemoStats(prev => ({ ...prev, breakpointsCreated: prev.breakpointsCreated + 1 }));
    logger.info('Demo breakpoint hit', { breakpointId: breakpoint.id, step: step.stepNumber });
  }, []);
  
  const handleStepComplete = useCallback((step: any) => {
    setDemoStats(prev => ({ ...prev, stepsExecuted: prev.stepsExecuted + 1 }));
    logger.info('Demo step completed', { step: step.stepNumber, action: step.action });
  }, []);
  
  const handleConditionalAction = useCallback((rule: any, task: any) => {
    setDemoStats(prev => ({ ...prev, rulesTriggered: prev.rulesTriggered + 1 }));
    logger.info('Demo conditional rule triggered', { ruleId: rule.id, taskId: task.id });
  }, []);
  
  const handleVersionChange = useCallback((version: any) => {
    setDemoStats(prev => ({ ...prev, versionsCreated: prev.versionsCreated + 1 }));
    logger.info('Demo version created', { versionId: version.id, version: version.version });
  }, []);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.tab) {
      // Cycle through demo modes
      const modes: DemoMode[] = ['breakpoints', 'stepping', 'conditional', 'versioning', 'performance', 'integration'];
      const currentIndex = modes.indexOf(currentMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setCurrentMode(modes[nextIndex]);
    } else if (input === 'd') {
      // Toggle debug mode
      if (isDebugMode && currentWorkflow) {
        endDebugSession();
      } else if (demoWorkflow) {
        startDebugSession(demoWorkflow);
      }
    } else if (input === 'r') {
      // Reset demo
      const workflow = createDemoWorkflow('simple');
      setDemoWorkflow(workflow);
      setDemoStats({
        breakpointsCreated: 0,
        stepsExecuted: 0,
        rulesTriggered: 0,
        versionsCreated: 0,
        performanceProfilesGenerated: 0,
      });
    }
  });
  
  // Render demo mode description
  const renderModeDescription = (): React.ReactNode => {
    const descriptions = {
      breakpoints: 'Demonstrates conditional and unconditional breakpoints with hit counting and state inspection.',
      stepping: 'Shows step-by-step debugging with detailed state tracking and execution flow control.',
      conditional: 'Illustrates conditional task execution based on runtime state and environment variables.',
      versioning: 'Demonstrates workflow version management, comparison, and rollback capabilities.',
      performance: 'Shows performance profiling, monitoring, and optimization recommendations.',
      integration: 'Combines all advanced features for comprehensive workflow debugging and control.',
    };
    
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={Colors.Primary} bold>
            📋 {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Demo
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            {descriptions[currentMode as keyof typeof descriptions]}
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Render demo statistics
  const renderDemoStats = (): React.ReactNode => {
    const uptime = Date.now() - demoStartTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="green">
        <Box marginBottom={1}>
          <Text color={Colors.Success} bold>📊 Demo Statistics</Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Uptime: </Text>
          <Text color={Colors.Info}>{uptimeSeconds}s</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Mode: </Text>
            <Text color={Colors.Primary}>{currentMode}</Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Breakpoints: </Text>
          <Text color={Colors.Warning}>{demoStats.breakpointsCreated}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Steps: </Text>
            <Text color={Colors.Info}>{demoStats.stepsExecuted}</Text>
          </Box>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Rules: </Text>
            <Text color={Colors.Success}>{demoStats.rulesTriggered}</Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Versions: </Text>
          <Text color={Colors.Info}>{demoStats.versionsCreated}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Debug: </Text>
            <Text color={isDebugMode ? Colors.Success : Colors.TextDim}>
              {isDebugMode ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Render instructions
  const renderInstructions = (): React.ReactNode => {
    if (!showInstructions) return null;
    
    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Tab: Switch Demo • D: Toggle Debug • R: Reset • Use controls within Advanced Workflow Controls
        </Text>
      </Box>
    );
  };
  
  // Main render
  if (!demoWorkflow) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            Loading advanced workflow controls demo...
          </Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Demo header */}
      <Box marginBottom={1}>
        <Text color={Colors.Primary} bold>
          🎛️ Advanced Workflow Controls Demo
        </Text>
        <Box marginLeft={2}>
          <Text color={autoCycle ? Colors.Success : Colors.TextDim}>
            [{autoCycle ? 'AUTO-CYCLE' : 'MANUAL'}]
          </Text>
        </Box>
      </Box>
      
      {/* Mode description */}
      {renderModeDescription()}
      
      {/* Demo statistics */}
      {renderDemoStats()}
      
      {/* Advanced workflow controls */}
      <AdvancedWorkflowControls
        workflow={demoWorkflow}
        executionContext={executionContext}
        isFocused={isFocused}
        debugMode={isDebugMode}
        showAdvanced={true}
        maxWidth={maxWidth}
        onBreakpointHit={handleBreakpointHit}
        onStepComplete={handleStepComplete}
        onConditionalAction={handleConditionalAction}
        onVersionChange={handleVersionChange}
      />
      
      {/* Instructions */}
      {renderInstructions()}
    </Box>
  );
};

export default AdvancedWorkflowControlsDemo;
