/**
 * Intelligent Error Recovery Demo Component
 * 
 * Demonstrates the intelligent error recovery system with:
 * - Simulated error scenarios
 * - Automatic recovery attempts
 * - Pattern learning and analysis
 * - User-guided recovery workflows
 * - Recovery success tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { IntelligentErrorRecovery, useIntelligentErrorRecovery, type ErrorInfo, type ErrorCategory, type ErrorSeverity } from '../components/IntelligentErrorRecovery.js';
import { logger } from '../../utils/logger.js';

/**
 * Demo error scenarios
 */
const ERROR_SCENARIOS = [
  {
    category: 'network' as ErrorCategory,
    severity: 'high' as ErrorSeverity,
    message: 'Failed to fetch data from API endpoint',
    context: { endpoint: '/api/data', method: 'GET', timeout: 5000 },
  },
  {
    category: 'filesystem' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    message: 'ENOENT: no such file or directory, open \'config.json\'',
    context: { path: './config.json', operation: 'read' },
  },
  {
    category: 'permission' as ErrorCategory,
    severity: 'high' as ErrorSeverity,
    message: 'EACCES: permission denied, mkdir \'/usr/local/app\'',
    context: { path: '/usr/local/app', operation: 'mkdir' },
  },
  {
    category: 'resource' as ErrorCategory,
    severity: 'critical' as ErrorSeverity,
    message: 'JavaScript heap out of memory',
    context: { memoryUsage: '2.1GB', limit: '2GB' },
  },
  {
    category: 'timeout' as ErrorCategory,
    severity: 'medium' as ErrorSeverity,
    message: 'Operation timed out after 30000ms',
    context: { operation: 'database_query', timeout: 30000 },
  },
  {
    category: 'dependency' as ErrorCategory,
    severity: 'high' as ErrorSeverity,
    message: 'Cannot resolve module \'missing-package\'',
    context: { module: 'missing-package', requiredBy: './src/main.ts' },
  },
];

/**
 * Intelligent error recovery demo props
 */
export interface IntelligentErrorRecoveryDemoProps {
  /**
   * Whether the demo is focused for input
   */
  isFocused?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Auto-generate errors
   */
  autoGenerateErrors?: boolean;
  
  /**
   * Error generation interval
   */
  errorInterval?: number;
  
  /**
   * Show demo statistics
   */
  showStats?: boolean;
}

/**
 * Intelligent error recovery demo component
 */
export const IntelligentErrorRecoveryDemo: React.FC<IntelligentErrorRecoveryDemoProps> = ({
  isFocused = false,
  maxWidth = 120,
  autoGenerateErrors = true,
  errorInterval = 5000,
  showStats = true,
}) => {
  // Error recovery hook
  const { errors, addError, removeError, clearErrors } = useIntelligentErrorRecovery();
  
  // Demo state
  const [demoStartTime] = useState(Date.now());
  const [demoStats, setDemoStats] = useState({
    errorsGenerated: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    patternsLearned: 0,
  });
  const [isAutoGenerating, setIsAutoGenerating] = useState(autoGenerateErrors);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  
  // Auto-generate errors for demo
  useEffect(() => {
    if (!isAutoGenerating) return;
    
    const interval = setInterval(() => {
      const scenario = ERROR_SCENARIOS[Math.floor(Math.random() * ERROR_SCENARIOS.length)];
      const errorId = addError(scenario.message, {
        category: scenario.category,
        severity: scenario.severity,
        ...scenario.context,
        taskId: `demo-task-${Date.now()}`,
        toolName: 'demo-tool',
      });
      
      setDemoStats(prev => ({ ...prev, errorsGenerated: prev.errorsGenerated + 1 }));
      
      logger.info('Demo error generated', {
        errorId,
        category: scenario.category,
        severity: scenario.severity,
      });
    }, errorInterval);
    
    return () => clearInterval(interval);
  }, [isAutoGenerating, errorInterval, addError]);
  
  // Handle recovery callbacks
  const handleRecoveryAttempt = useCallback((attempt: any) => {
    setDemoStats(prev => ({ ...prev, recoveryAttempts: prev.recoveryAttempts + 1 }));
    logger.info('Demo recovery attempt', { attemptId: attempt.id });
  }, []);
  
  const handleRecoverySuccess = useCallback((attempt: any) => {
    setDemoStats(prev => ({ ...prev, successfulRecoveries: prev.successfulRecoveries + 1 }));
    
    // Remove the error after successful recovery
    setTimeout(() => {
      removeError(attempt.errorId);
    }, 2000);
    
    logger.info('Demo recovery success', { attemptId: attempt.id });
  }, [removeError]);
  
  const handleRecoveryFailure = useCallback((attempt: any) => {
    logger.warn('Demo recovery failure', { attemptId: attempt.id, reason: attempt.failureReason });
  }, []);
  
  const handlePatternDetected = useCallback((pattern: any) => {
    setDemoStats(prev => ({ ...prev, patternsLearned: prev.patternsLearned + 1 }));
    logger.info('Demo pattern detected', { patternId: pattern.id, category: pattern.category });
  }, []);
  
  // Simulate retry action
  const handleRetryAction = useCallback(async (errorId: string): Promise<boolean> => {
    // Simulate retry with 70% success rate
    await new Promise(resolve => setTimeout(resolve, 1000));
    const success = Math.random() > 0.3;
    
    logger.info('Demo retry action', { errorId, success });
    return success;
  }, []);
  
  // Simulate skip action
  const handleSkipAction = useCallback((errorId: string) => {
    removeError(errorId);
    logger.info('Demo skip action', { errorId });
  }, [removeError]);
  
  // Simulate escalate action
  const handleEscalateAction = useCallback((errorId: string) => {
    logger.info('Demo escalate action', { errorId });
    // In a real scenario, this would notify human operators
  }, []);
  
  // Generate specific error scenario
  const generateSpecificError = useCallback((scenarioIndex: number) => {
    if (scenarioIndex >= 0 && scenarioIndex < ERROR_SCENARIOS.length) {
      const scenario = ERROR_SCENARIOS[scenarioIndex];
      const errorId = addError(scenario.message, {
        category: scenario.category,
        severity: scenario.severity,
        ...scenario.context,
        taskId: `manual-task-${Date.now()}`,
        toolName: 'manual-tool',
      });
      
      setDemoStats(prev => ({ ...prev, errorsGenerated: prev.errorsGenerated + 1 }));
      
      logger.info('Manual error generated', {
        errorId,
        scenarioIndex,
        category: scenario.category,
      });
    }
  }, [addError]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (input === 'g') {
      // Generate error manually
      generateSpecificError(selectedScenarioIndex);
    } else if (input === 'c') {
      // Clear all errors
      clearErrors();
      setDemoStats(prev => ({ ...prev, errorsGenerated: 0 }));
    } else if (input === 'a') {
      // Toggle auto-generation
      setIsAutoGenerating(prev => !prev);
    } else if (key.upArrow) {
      setSelectedScenarioIndex(Math.max(0, selectedScenarioIndex - 1));
    } else if (key.downArrow) {
      setSelectedScenarioIndex(Math.min(ERROR_SCENARIOS.length - 1, selectedScenarioIndex + 1));
    }
  });
  
  // Render demo header
  const renderDemoHeader = (): React.ReactNode => {
    const uptime = Date.now() - demoStartTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={Colors.Primary} bold>
            🛠️ Intelligent Error Recovery Demo
          </Text>
          <Box marginLeft={2}>
            <Text color={isAutoGenerating ? Colors.Success : Colors.TextDim}>
              [{isAutoGenerating ? 'AUTO-GENERATING' : 'MANUAL'}]
            </Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Demonstrating intelligent error detection, categorization, and recovery strategies
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>
            Demo Uptime: {uptimeSeconds}s
          </Text>
          <Box marginLeft={4}>
            <Text color={Colors.Text}>
              Active Errors: {errors.length}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Render demo statistics
  const renderDemoStats = (): React.ReactNode => {
    if (!showStats) return null;
    
    const successRate = demoStats.recoveryAttempts > 0 
      ? Math.round((demoStats.successfulRecoveries / demoStats.recoveryAttempts) * 100)
      : 0;
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="blue">
        <Box marginBottom={1}>
          <Text color={Colors.Info} bold>
            📊 Demo Statistics
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Errors Generated: </Text>
          <Text color={Colors.Warning}>{demoStats.errorsGenerated}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Recovery Attempts: </Text>
            <Text color={Colors.Info}>{demoStats.recoveryAttempts}</Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Successful Recoveries: </Text>
          <Text color={Colors.Success}>{demoStats.successfulRecoveries}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Success Rate: </Text>
            <Text color={successRate > 70 ? Colors.Success : Colors.Warning}>
              {successRate}%
            </Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Patterns Learned: </Text>
          <Text color={Colors.Info}>{demoStats.patternsLearned}</Text>
        </Box>
      </Box>
    );
  };
  
  // Render error scenarios
  const renderErrorScenarios = (): React.ReactNode => {
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="yellow">
        <Box marginBottom={1}>
          <Text color={Colors.Warning} bold>
            ⚡ Error Scenarios (Press G to generate)
          </Text>
        </Box>
        
        {ERROR_SCENARIOS.map((scenario, index) => {
          const isSelected = index === selectedScenarioIndex;
          const categoryIcon: Record<string, string> = {
            network: '🌐',
            filesystem: '📁',
            permission: '🔒',
            resource: '💾',
            timeout: '⏰',
            dependency: '📦',
            configuration: '⚙️',
            logic: '🧠',
            syntax: '📝',
            unknown: '❓',
          };
          const icon = categoryIcon[scenario.category] || '❓';
          
          return (
            <Box key={index} marginBottom={1}>
              <Text color={isSelected ? Colors.Primary : Colors.TextDim}>
                {isSelected ? '▶ ' : '  '}
              </Text>
              <Text color={Colors.Text}>
                {icon} {scenario.category}
              </Text>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>
                  - {scenario.message.substring(0, 50)}...
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };
  
  // Render instructions
  const renderInstructions = (): React.ReactNode => {
    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          G: Generate Error • C: Clear All • A: Toggle Auto-Gen • ↑/↓: Select Scenario
        </Text>
      </Box>
    );
  };
  
  // Main render
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Demo header */}
      {renderDemoHeader()}
      
      {/* Demo statistics */}
      {renderDemoStats()}
      
      {/* Error scenarios */}
      {renderErrorScenarios()}
      
      {/* Intelligent error recovery component */}
      <IntelligentErrorRecovery
        errors={errors}
        isFocused={isFocused}
        maxWidth={maxWidth}
        enableAutoRecovery={true}
        showDetails={true}
        showSuggestions={true}
        enablePatternLearning={true}
        onRecoveryAttempt={handleRecoveryAttempt}
        onRecoverySuccess={handleRecoverySuccess}
        onRecoveryFailure={handleRecoveryFailure}
        onPatternDetected={handlePatternDetected}
        onRetryAction={handleRetryAction}
        onSkipAction={handleSkipAction}
        onEscalateAction={handleEscalateAction}
      />
      
      {/* Instructions */}
      {renderInstructions()}
    </Box>
  );
};

export default IntelligentErrorRecoveryDemo;
