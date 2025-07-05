/**
 * Comprehensive Testing Demo Component
 * 
 * Demonstrates the complete testing framework with:
 * - Unit test execution
 * - Integration test scenarios
 * - Performance benchmarking
 * - UI component testing
 * - Test result visualization
 * - Coverage reporting
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { TestFramework, TestSuite, TestSummary, TestType, type TestResult } from '../../testing/TestFramework.js';
import { logger } from '../../utils/logger.js';

/**
 * Demo test scenarios
 */
const TEST_SCENARIOS = [
  {
    name: 'Core Utilities',
    type: 'unit' as TestType,
    description: 'Unit tests for core utility functions',
    testCount: 15,
    estimatedDuration: 250,
  },
  {
    name: 'UI Components',
    type: 'ui' as TestType,
    description: 'React component rendering and interaction tests',
    testCount: 12,
    estimatedDuration: 800,
  },
  {
    name: 'Workflow Integration',
    type: 'integration' as TestType,
    description: 'End-to-end workflow execution tests',
    testCount: 8,
    estimatedDuration: 1200,
  },
  {
    name: 'Performance Benchmarks',
    type: 'performance' as TestType,
    description: 'Performance and memory usage benchmarks',
    testCount: 6,
    estimatedDuration: 2000,
  },
];

/**
 * Comprehensive testing demo props
 */
export interface ComprehensiveTestingDemoProps {
  /**
   * Whether the demo is focused for input
   */
  isFocused?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Auto-run tests
   */
  autoRunTests?: boolean;
  
  /**
   * Show detailed results
   */
  showDetails?: boolean;
  
  /**
   * Show performance metrics
   */
  showPerformance?: boolean;
}

/**
 * Comprehensive testing demo component
 */
export const ComprehensiveTestingDemo: React.FC<ComprehensiveTestingDemoProps> = ({
  isFocused = false,
  maxWidth = 120,
  autoRunTests = false,
  showDetails = true,
  showPerformance = true,
}) => {
  // Testing framework
  const [testFramework] = useState(() => new TestFramework({
    parallel: true,
    coverage: true,
    performance: true,
    verbose: true,
  }));
  
  // Demo state
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);
  const [runHistory, setRunHistory] = useState<TestSummary[]>([]);
  const [demoStats, setDemoStats] = useState({
    totalRuns: 0,
    totalTests: 0,
    totalDuration: 0,
    averageSuccessRate: 0,
  });
  
  // Initialize test suites
  useEffect(() => {
    TEST_SCENARIOS.forEach(scenario => {
      const suite = testFramework.createSuite(scenario.name, scenario.type, {
        description: scenario.description,
        file: `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.test.ts`,
        tags: [scenario.type, 'demo'],
      });
      
      // Add some sample tests to each suite
      for (let i = 0; i < scenario.testCount; i++) {
        // Note: In a real implementation, we'd add actual test functions
        // For demo purposes, the framework will simulate test execution
      }
    });
  }, [testFramework]);
  
  // Auto-run tests if enabled
  useEffect(() => {
    if (autoRunTests && !isRunning) {
      runAllTests();
    }
  }, [autoRunTests]);
  
  // Run all tests
  const runAllTests = useCallback(async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestSummary(null);
    
    try {
      logger.info('Starting comprehensive test run');
      
      const summary = await testFramework.runTests();
      
      setTestSummary(summary);
      setRunHistory(prev => [summary, ...prev.slice(0, 9)]); // Keep last 10 runs
      
      // Update demo statistics
      setDemoStats(prev => {
        const newTotalRuns = prev.totalRuns + 1;
        const newTotalTests = prev.totalTests + summary.total;
        const newTotalDuration = prev.totalDuration + summary.duration;
        const successRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
        const newAverageSuccessRate = ((prev.averageSuccessRate * prev.totalRuns) + successRate) / newTotalRuns;
        
        return {
          totalRuns: newTotalRuns,
          totalTests: newTotalTests,
          totalDuration: newTotalDuration,
          averageSuccessRate: newAverageSuccessRate,
        };
      });
      
      logger.info('Test run completed', {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        duration: summary.duration,
      });
      
    } catch (error) {
      logger.error('Test run failed', { error });
    } finally {
      setIsRunning(false);
    }
  }, [testFramework, isRunning]);
  
  // Run specific test type
  const runSpecificTests = useCallback(async (testType: TestType) => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    try {
      logger.info(`Running ${testType} tests`);
      
      // Create a temporary framework with only the selected type
      const specificFramework = new TestFramework({
        types: [testType],
        parallel: true,
        coverage: testType !== 'performance',
        performance: testType === 'performance',
      });
      
      // Add the specific suite
      const scenario = TEST_SCENARIOS.find(s => s.type === testType);
      if (scenario) {
        specificFramework.createSuite(scenario.name, scenario.type, {
          description: scenario.description,
          file: `${scenario.name.toLowerCase().replace(/\s+/g, '-')}.test.ts`,
          tags: [scenario.type, 'demo', 'specific'],
        });
      }
      
      const summary = await specificFramework.runTests();
      setTestSummary(summary);
      
      logger.info(`${testType} tests completed`, {
        passed: summary.passed,
        failed: summary.failed,
      });
      
    } catch (error) {
      logger.error(`${testType} tests failed`, { error });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused || isRunning) return;
    
    if (input === 'r') {
      // Run all tests
      runAllTests();
    } else if (input === 's') {
      // Run specific test type
      const scenario = TEST_SCENARIOS[selectedScenarioIndex];
      if (scenario) {
        runSpecificTests(scenario.type);
      }
    } else if (input === 'c') {
      // Clear results
      setTestSummary(null);
      setRunHistory([]);
      testFramework.clear();
    } else if (key.upArrow) {
      setSelectedScenarioIndex(Math.max(0, selectedScenarioIndex - 1));
    } else if (key.downArrow) {
      setSelectedScenarioIndex(Math.min(TEST_SCENARIOS.length - 1, selectedScenarioIndex + 1));
    }
  });
  
  // Render demo header
  const renderDemoHeader = (): React.ReactNode => {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={Colors.Primary} bold>
            🧪 Comprehensive Testing Framework Demo
          </Text>
          <Box marginLeft={2}>
            <Text color={isRunning ? Colors.Warning : Colors.Success}>
              [{isRunning ? 'RUNNING' : 'READY'}]
            </Text>
          </Box>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Demonstrating unit tests, integration tests, performance benchmarks, and UI testing
          </Text>
        </Box>
      </Box>
    );
  };
  
  // Render demo statistics
  const renderDemoStats = (): React.ReactNode => {
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="blue">
        <Box marginBottom={1}>
          <Text color={Colors.Info} bold>
            📊 Demo Statistics
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Total Runs: </Text>
          <Text color={Colors.Info}>{demoStats.totalRuns}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Total Tests: </Text>
            <Text color={Colors.Info}>{demoStats.totalTests}</Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>Total Duration: </Text>
          <Text color={Colors.Info}>{(demoStats.totalDuration / 1000).toFixed(2)}s</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Avg Success Rate: </Text>
            <Text color={demoStats.averageSuccessRate > 80 ? Colors.Success : Colors.Warning}>
              {demoStats.averageSuccessRate.toFixed(1)}%
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Render test scenarios
  const renderTestScenarios = (): React.ReactNode => {
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="yellow">
        <Box marginBottom={1}>
          <Text color={Colors.Warning} bold>
            ⚡ Test Scenarios (Press S to run selected)
          </Text>
        </Box>
        
        {TEST_SCENARIOS.map((scenario, index) => {
          const isSelected = index === selectedScenarioIndex;
          const typeIcon = {
            unit: '🔧',
            integration: '🔗',
            performance: '⚡',
            ui: '��',
            e2e: '🌐',
          }[scenario.type] || '📋';
          
          return (
            <Box key={index} marginBottom={1}>
              <Text color={isSelected ? Colors.Primary : Colors.TextDim}>
                {isSelected ? '▶ ' : '  '}
              </Text>
              <Text color={Colors.Text}>
                {typeIcon} {scenario.name}
              </Text>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>
                  ({scenario.testCount} tests, ~{scenario.estimatedDuration}ms)
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };
  
  // Render test results
  const renderTestResults = (): React.ReactNode => {
    if (!testSummary) {
      return (
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            {isRunning ? '🏃 Running tests...' : '📋 No test results yet'}
          </Text>
        </Box>
      );
    }
    
    const successRate = testSummary.total > 0 ? (testSummary.passed / testSummary.total) * 100 : 0;
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="green">
        <Box marginBottom={1}>
          <Text color={Colors.Success} bold>
            �� Test Results
          </Text>
        </Box>
        
        {/* Summary stats */}
        <Box marginBottom={1}>
          <Text color={Colors.Text}>Total: </Text>
          <Text color={Colors.Info}>{testSummary.total}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>✅ Passed: </Text>
            <Text color={Colors.Success}>{testSummary.passed}</Text>
          </Box>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>❌ Failed: </Text>
            <Text color={Colors.Error}>{testSummary.failed}</Text>
          </Box>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>⏭️ Skipped: </Text>
            <Text color={Colors.TextDim}>{testSummary.skipped}</Text>
          </Box>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={Colors.Text}>Duration: </Text>
          <Text color={Colors.Info}>{testSummary.duration}ms</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Success Rate: </Text>
            <Text color={successRate > 80 ? Colors.Success : successRate > 60 ? Colors.Warning : Colors.Error}>
              {successRate.toFixed(1)}%
            </Text>
          </Box>
        </Box>
        
        {/* Suite breakdown */}
        {showDetails && testSummary.suites.length > 0 && (
          <Box flexDirection="column">
            <Text color={Colors.Text} bold>Test Suites:</Text>
            {testSummary.suites.map(suite => {
              const suiteSuccessRate = suite.tests.length > 0 
                ? (suite.tests.filter(t => t.status === 'passed').length / suite.tests.length) * 100 
                : 0;
              
              return (
                <Box key={suite.id} marginLeft={2}>
                  <Text color={suite.status === 'passed' ? Colors.Success : Colors.Error}>
                    {suite.status === 'passed' ? '✅' : '❌'}
                  </Text>
                  <Box marginLeft={1}>
                    <Text color={Colors.Text}>
                      {suite.name} ({suite.tests.length} tests, {suiteSuccessRate.toFixed(0)}%)
                    </Text>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
        
        {/* Performance metrics */}
        {showPerformance && testSummary.performance && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={Colors.Info} bold>Performance Metrics:</Text>
            <Box marginLeft={2}>
              <Text color={Colors.Text}>
                Avg Memory: {(testSummary.performance.averageMemory / 1024 / 1024).toFixed(2)}MB
              </Text>
            </Box>
            <Box marginLeft={2}>
              <Text color={Colors.Text}>
                Avg CPU: {testSummary.performance.averageCpu.toFixed(2)}%
              </Text>
            </Box>
            {testSummary.performance.slowestTests.length > 0 && (
              <Box marginLeft={2}>
                <Text color={Colors.Warning}>
                  Slowest: {testSummary.performance.slowestTests[0].name} ({testSummary.performance.slowestTests[0].duration}ms)
                </Text>
              </Box>
            )}
          </Box>
        )}
        
        {/* Failures */}
        {testSummary.failures.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={Colors.Error} bold>Failures:</Text>
            {testSummary.failures.slice(0, 3).map(failure => (
              <Box key={failure.id} marginLeft={2}>
                <Text color={Colors.Error}>
                  ❌ {failure.name}: {failure.error?.message || 'Unknown error'}
                </Text>
              </Box>
            ))}
            {testSummary.failures.length > 3 && (
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>
                  ... and {testSummary.failures.length - 3} more
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };
  
  // Render run history
  const renderRunHistory = (): React.ReactNode => {
    if (runHistory.length === 0) return null;
    
    return (
      <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="cyan">
        <Box marginBottom={1}>
          <Text color={Colors.Info} bold>
            📚 Recent Test Runs
          </Text>
        </Box>
        
        {runHistory.slice(0, 5).map((run, index) => {
          const successRate = run.total > 0 ? (run.passed / run.total) * 100 : 0;
          const timeAgo = index === 0 ? 'Latest' : `${index + 1} runs ago`;
          
          return (
            <Box key={index} marginLeft={2}>
              <Text color={Colors.TextDim}>
                {timeAgo}:
              </Text>
              <Box marginLeft={2}>
                <Text color={successRate > 80 ? Colors.Success : Colors.Warning}>
                  {run.passed}/{run.total} ({successRate.toFixed(0)}%)
                </Text>
              </Box>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>
                  {run.duration}ms
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
          R: Run All Tests • S: Run Selected • C: Clear Results • ↑/↓: Select Scenario
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
      
      {/* Test scenarios */}
      {renderTestScenarios()}
      
      {/* Test results */}
      {renderTestResults()}
      
      {/* Run history */}
      {renderRunHistory()}
      
      {/* Instructions */}
      {renderInstructions()}
    </Box>
  );
};

export default ComprehensiveTestingDemo;
