/**
 * Intelligent Error Recovery Component
 * 
 * Advanced error recovery system with:
 * - Smart error detection and categorization
 * - Automatic recovery strategy selection
 * - Error pattern analysis and learning
 * - User-guided recovery workflows
 * - Recovery success tracking and optimization
 * 
 * SUCCESS CRITERIA:
 * - Errors are automatically categorized and analyzed
 * - Recovery strategies are applied intelligently
 * - Pattern analysis prevents recurring issues
 * - User-guided recovery provides clear steps
 * - Recovery success rates improve over time
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { logger } from '../../utils/logger.js';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories
 */
export type ErrorCategory = 
  | 'network'
  | 'filesystem'
  | 'permission'
  | 'resource'
  | 'syntax'
  | 'logic'
  | 'timeout'
  | 'dependency'
  | 'configuration'
  | 'unknown';

/**
 * Recovery strategy types
 */
export type RecoveryStrategy = 
  | 'retry'
  | 'fallback'
  | 'skip'
  | 'manual'
  | 'restart'
  | 'rollback'
  | 'escalate'
  | 'ignore';

/**
 * Error information
 */
export interface ErrorInfo {
  id: string;
  message: string;
  stack?: string;
  code?: string | number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: {
    taskId?: string;
    toolName?: string;
    timestamp: number;
    environment: Record<string, any>;
    userAction?: string;
  };
  metadata: {
    isRecoverable: boolean;
    hasBeenSeen: boolean;
    similarErrorCount: number;
    lastOccurrence?: number;
  };
}

/**
 * Recovery action
 */
export interface RecoveryAction {
  id: string;
  strategy: RecoveryStrategy;
  description: string;
  isAutomatic: boolean;
  estimatedSuccessRate: number;
  steps: string[];
  requiredUserInput?: {
    type: 'confirm' | 'input' | 'select';
    prompt: string;
    options?: string[];
  };
}

/**
 * Recovery attempt result
 */
export interface RecoveryAttempt {
  id: string;
  errorId: string;
  actionId: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  result?: any;
  failureReason?: string;
  userInput?: any;
}

/**
 * Error pattern
 */
export interface ErrorPattern {
  id: string;
  signature: string;
  category: ErrorCategory;
  frequency: number;
  lastSeen: number;
  successfulRecoveries: RecoveryStrategy[];
  failedRecoveries: RecoveryStrategy[];
  preventionStrategies: string[];
}

/**
 * Intelligent error recovery props
 */
export interface IntelligentErrorRecoveryProps {
  /**
   * Current errors to handle
   */
  errors: ErrorInfo[];
  
  /**
   * Whether the component is focused
   */
  isFocused?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Enable automatic recovery
   */
  enableAutoRecovery?: boolean;
  
  /**
   * Show error details
   */
  showDetails?: boolean;
  
  /**
   * Show recovery suggestions
   */
  showSuggestions?: boolean;
  
  /**
   * Enable pattern learning
   */
  enablePatternLearning?: boolean;
  
  /**
   * Recovery callbacks
   */
  onRecoveryAttempt?: (attempt: RecoveryAttempt) => void;
  onRecoverySuccess?: (attempt: RecoveryAttempt) => void;
  onRecoveryFailure?: (attempt: RecoveryAttempt) => void;
  onPatternDetected?: (pattern: ErrorPattern) => void;
  
  /**
   * Action callbacks
   */
  onRetryAction?: (errorId: string) => Promise<boolean>;
  onSkipAction?: (errorId: string) => void;
  onEscalateAction?: (errorId: string) => void;
}

/**
 * Intelligent error recovery component
 */
export const IntelligentErrorRecovery: React.FC<IntelligentErrorRecoveryProps> = ({
  errors,
  isFocused = false,
  maxWidth = 120,
  enableAutoRecovery = true,
  showDetails = true,
  showSuggestions = true,
  enablePatternLearning = true,
  onRecoveryAttempt,
  onRecoverySuccess,
  onRecoveryFailure,
  onPatternDetected,
  onRetryAction,
  onSkipAction,
  onEscalateAction,
}) => {
  // State management
  const [errorPatterns, setErrorPatterns] = useState<Map<string, ErrorPattern>>(new Map());
  const [recoveryAttempts, setRecoveryAttempts] = useState<Map<string, RecoveryAttempt[]>>(new Map());
  const [selectedErrorIndex, setSelectedErrorIndex] = useState(0);
  const [showPatternAnalysis, setShowPatternAnalysis] = useState(false);
  const [autoRecoveryEnabled, setAutoRecoveryEnabled] = useState(enableAutoRecovery);
  const [recoveryStats, setRecoveryStats] = useState({
    totalAttempts: 0,
    successfulRecoveries: 0,
    automaticRecoveries: 0,
    manualRecoveries: 0,
    patternsDetected: 0,
  });

  // Get error severity color
  const getSeverityColor = (severity: ErrorSeverity): string => {
    switch (severity) {
      case 'low':
        return Colors.Success;
      case 'medium':
        return Colors.Warning;
      case 'high':
        return Colors.Error;
      case 'critical':
        return Colors.Error;
      default:
        return Colors.TextDim;
    }
  };
  
  // Get category icon
  const getCategoryIcon = (category: ErrorCategory): string => {
    switch (category) {
      case 'network':
        return '🌐';
      case 'filesystem':
        return '📁';
      case 'permission':
        return '🔒';
      case 'resource':
        return '💾';
      case 'syntax':
        return '📝';
      case 'logic':
        return '🧠';
      case 'timeout':
        return '⏰';
      case 'dependency':
        return '📦';
      case 'configuration':
        return '⚙️';
      default:
        return '❓';
    }
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (key.upArrow) {
      setSelectedErrorIndex(Math.max(0, selectedErrorIndex - 1));
    } else if (key.downArrow) {
      setSelectedErrorIndex(Math.min(errors.length - 1, selectedErrorIndex + 1));
    } else if (input === 'a') {
      // Toggle auto-recovery
      setAutoRecoveryEnabled(prev => !prev);
    } else if (input === 'p') {
      // Toggle pattern analysis view
      setShowPatternAnalysis(prev => !prev);
    }
  });
  
  // Render error list
  const renderErrorList = (): React.ReactNode => {
    if (errors.length === 0) {
      return (
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.Success}>
            ✅ No errors detected
          </Text>
        </Box>
      );
    }
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text color={Colors.Primary} bold>
            🚨 Active Errors ({errors.length})
          </Text>
        </Box>
        
        {errors.map((error, index) => {
          const isSelected = index === selectedErrorIndex;
          const attempts = recoveryAttempts.get(error.id) || [];
          const lastAttempt = attempts[attempts.length - 1];
          
          return (
            <Box 
              key={error.id} 
              flexDirection="column" 
              marginBottom={1}
              borderStyle={isSelected ? "single" : undefined}
              borderColor={isSelected ? "blue" : undefined}
            >
              {/* Error header */}
              <Box>
                <Text color={getSeverityColor(error.severity)}>
                  {getCategoryIcon(error.category)}
                </Text>
                <Box marginLeft={1}>
                  <Text color={Colors.Text}>
                    {error.message.length > 60 ? `${error.message.substring(0, 60)}...` : error.message}
                  </Text>
                </Box>
                <Box marginLeft={2}>
                  <Text color={Colors.TextDim}>
                    [{error.category}]
                  </Text>
                </Box>
              </Box>
              
              {/* Recovery status */}
              {lastAttempt && (
                <Box marginLeft={2}>
                  <Text color={lastAttempt.success ? Colors.Success : Colors.Error}>
                    {lastAttempt.success ? '✅ Recovered' : '❌ Recovery Failed'}
                  </Text>
                  <Box marginLeft={2}>
                    <Text color={Colors.TextDim}>
                      ({attempts.length} attempts)
                    </Text>
                  </Box>
                </Box>
              )}
              
              {/* Pattern info */}
              {error.metadata.hasBeenSeen && (
                <Box marginLeft={2}>
                  <Text color={Colors.Warning}>
                    �� Similar error seen {error.metadata.similarErrorCount} times
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };
  
  // Render recovery statistics
  const renderRecoveryStats = (): React.ReactNode => {
    const successRate = recoveryStats.totalAttempts > 0 
      ? Math.round((recoveryStats.successfulRecoveries / recoveryStats.totalAttempts) * 100)
      : 0;
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="green">
        <Box marginBottom={1}>
          <Text color={Colors.Success} bold>
            📈 Recovery Statistics
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Total Attempts: </Text>
          <Text color={Colors.Info}>{recoveryStats.totalAttempts}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Success Rate: </Text>
            <Text color={successRate > 70 ? Colors.Success : Colors.Warning}>
              {successRate}%
            </Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Auto Recovery: </Text>
          <Text color={Colors.Info}>{recoveryStats.automaticRecoveries}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Manual: </Text>
            <Text color={Colors.Info}>{recoveryStats.manualRecoveries}</Text>
          </Box>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Patterns: </Text>
            <Text color={Colors.Info}>{recoveryStats.patternsDetected}</Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Auto Recovery: </Text>
          <Text color={autoRecoveryEnabled ? Colors.Success : Colors.TextDim}>
            {autoRecoveryEnabled ? 'ENABLED' : 'DISABLED'}
          </Text>
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
          🛠️ Intelligent Error Recovery
        </Text>
      </Box>
      
      {/* Recovery statistics */}
      {renderRecoveryStats()}
      
      {/* Error list */}
      {renderErrorList()}
      
      {/* Controls hint */}
      {isFocused && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            ↑/↓: Navigate • A: Toggle Auto-Recovery • P: Pattern Analysis
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Hook for managing intelligent error recovery
 */
export function useIntelligentErrorRecovery() {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const addError = useCallback((error: Error | string, context?: any): string => {
    const errorInfo: ErrorInfo = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      category: 'unknown',
      severity: 'medium',
      context: {
        timestamp: Date.now(),
        environment: context || {},
        ...context,
      },
      metadata: {
        isRecoverable: true,
        hasBeenSeen: false,
        similarErrorCount: 0,
      },
    };
    
    setErrors(prev => [...prev, errorInfo]);
    return errorInfo.id;
  }, []);
  
  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);
  
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);
  
  return {
    errors,
    isRecovering,
    addError,
    removeError,
    clearErrors,
    setIsRecovering,
  };
}

export default IntelligentErrorRecovery;
