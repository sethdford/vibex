/**
 * Performance Monitoring Demo Component
 * 
 * Interactive demonstration of the Performance Monitoring System with real-time metrics,
 * alerts, analytics, and comprehensive testing scenarios.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { PerformanceMonitor } from '../components/PerformanceMonitor.js';
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring.js';
import type { PerformanceAlert } from '../components/PerformanceMonitor.js';

/**
 * Demo mode types
 */
export type DemoMode = 
  | 'realtime'
  | 'stress_test'
  | 'memory_leak'
  | 'cpu_spike'
  | 'analytics'
  | 'alerts'
  | 'export';

/**
 * Performance monitoring demo props
 */
export interface PerformanceMonitoringDemoProps {
  /**
   * Initial demo mode
   */
  initialMode?: DemoMode;
  
  /**
   * Auto-cycle through modes
   */
  autoCycle?: boolean;
  
  /**
   * Cycle interval in milliseconds
   */
  cycleInterval?: number;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Show controls
   */
  showControls?: boolean;
}

/**
 * Performance monitoring demo component
 */
export const PerformanceMonitoringDemo: React.FC<PerformanceMonitoringDemoProps> = ({
  initialMode = 'realtime',
  autoCycle = false,
  cycleInterval = 30000,
  maxWidth = 120,
  showControls = true,
}) => {
  const [currentMode, setCurrentMode] = useState<DemoMode>(initialMode);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  
  // Initialize performance monitoring
  const performanceMonitoring = usePerformanceMonitoring({
    enabled: true,
    updateInterval: 1000,
    maxHistoryLength: 100,
    thresholds: {
      memory: { warning: 60, critical: 80 },
      cpu: { warning: 60, critical: 80 },
    },
    enableAlerts: true,
    enableAnalytics: true,
  });
  
  const {
    currentMetrics,
    metricsHistory,
    alerts,
    analytics,
    isMonitoring,
    isCollecting,
    config,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    clearHistory,
    clearAlerts,
    exportMetrics,
    getPerformanceSummary,
  } = performanceMonitoring;
  
  // Demo modes configuration
  const demoModes: Array<{ mode: DemoMode; name: string; description: string }> = [
    {
      mode: 'realtime',
      name: 'Real-Time Monitoring',
      description: 'Live performance metrics with real system data',
    },
    {
      mode: 'stress_test',
      name: 'Stress Testing',
      description: 'Simulate high CPU and memory usage scenarios',
    },
    {
      mode: 'memory_leak',
      name: 'Memory Leak Simulation',
      description: 'Demonstrate memory leak detection and alerts',
    },
    {
      mode: 'cpu_spike',
      name: 'CPU Spike Simulation',
      description: 'Simulate CPU usage spikes and recovery',
    },
    {
      mode: 'analytics',
      name: 'Performance Analytics',
      description: 'Show detailed performance analytics and trends',
    },
    {
      mode: 'alerts',
      name: 'Alert Management',
      description: 'Demonstrate alert generation and management',
    },
    {
      mode: 'export',
      name: 'Data Export',
      description: 'Export performance data and generate reports',
    },
  ];
  
  // Handle alert notifications
  const handleAlert = useCallback((alert: PerformanceAlert) => {
    console.log(`🚨 Performance Alert: ${alert.message}`);
  }, []);
  
  // Stress test simulation
  const runStressTest = useCallback(() => {
    if (isStressTesting) return;
    
    setIsStressTesting(true);
    setSimulationActive(true);
    
    // Simulate CPU intensive work
    const startTime = Date.now();
    const duration = 10000; // 10 seconds
    
    const cpuIntensiveWork = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        // Simulate CPU work
        for (let i = 0; i < 1000000; i++) {
          Math.random() * Math.random();
        }
        setTimeout(cpuIntensiveWork, 10);
      } else {
        setIsStressTesting(false);
        setSimulationActive(false);
      }
    };
    
    cpuIntensiveWork();
  }, [isStressTesting]);
  
  // Memory leak simulation
  const simulateMemoryLeak = useCallback(() => {
    if (simulationActive) return;
    
    setSimulationActive(true);
    
    const leakyArray: number[][] = [];
    const interval = setInterval(() => {
      // Simulate memory leak by creating large arrays
      for (let i = 0; i < 100; i++) {
        leakyArray.push(new Array(10000).fill(Math.random()));
      }
    }, 500);
    
    // Stop after 15 seconds
    setTimeout(() => {
      clearInterval(interval);
      leakyArray.length = 0; // Clean up
      setSimulationActive(false);
    }, 15000);
  }, [simulationActive]);
  
  // CPU spike simulation
  const simulateCpuSpike = useCallback(() => {
    if (simulationActive) return;
    
    setSimulationActive(true);
    
    let spikeCount = 0;
    const maxSpikes = 3;
    
    const createSpike = () => {
      if (spikeCount >= maxSpikes) {
        setSimulationActive(false);
        return;
      }
      
      // Create CPU spike
      const startTime = Date.now();
      const spikeDuration = 2000; // 2 seconds
      
      const spike = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < spikeDuration) {
          for (let i = 0; i < 500000; i++) {
            Math.sqrt(Math.random());
          }
          setTimeout(spike, 1);
        } else {
          spikeCount++;
          // Wait 3 seconds before next spike
          setTimeout(createSpike, 3000);
        }
      };
      
      spike();
    };
    
    createSpike();
  }, [simulationActive]);
  
  // Auto-cycle through modes
  useEffect(() => {
    if (!autoCycle) return;
    
    const interval = setInterval(() => {
      setCycleIndex(prev => {
        const nextIndex = (prev + 1) % demoModes.length;
        setCurrentMode(demoModes[nextIndex].mode);
        return nextIndex;
      });
    }, cycleInterval);
    
    return () => clearInterval(interval);
  }, [autoCycle, cycleInterval, demoModes]);
  
  // Handle keyboard input
  useInput((input, key) => {
    if (key.return) {
      // Cycle through modes
      const currentIndex = demoModes.findIndex(m => m.mode === currentMode);
      const nextIndex = (currentIndex + 1) % demoModes.length;
      setCurrentMode(demoModes[nextIndex].mode);
    } else if (input === 's') {
      // Start/stop monitoring
      if (isMonitoring) {
        stopMonitoring();
      } else {
        startMonitoring();
      }
    } else if (input === 'c') {
      // Clear data
      clearHistory();
      clearAlerts();
    } else if (input === 't') {
      // Run stress test
      runStressTest();
    } else if (input === 'm') {
      // Simulate memory leak
      simulateMemoryLeak();
    } else if (input === 'p') {
      // Simulate CPU spike
      simulateCpuSpike();
    } else if (input === 'e') {
      // Export data
      if (currentMode !== 'export') {
        setCurrentMode('export');
      }
    }
  });
  
  // Get current demo mode configuration
  const currentModeConfig = demoModes.find(m => m.mode === currentMode);
  
  // Render mode header
  const renderModeHeader = (): React.ReactNode => {
    return (
      <Box flexDirection="column" marginBottom={2}>
        <Box>
          <Text color={Colors.Primary} bold>
            🎯 Performance Monitoring Demo
          </Text>
          <Box marginLeft={2}>
            <Text color={Colors.Info}>
              [{currentModeConfig?.name || 'Unknown Mode'}]
            </Text>
          </Box>
          {autoCycle && (
            <Box marginLeft={2}>
              <Text color={Colors.Warning}>
                [AUTO-CYCLING]
              </Text>
            </Box>
          )}
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            {currentModeConfig?.description || 'No description available'}
          </Text>
        </Box>
        
        {simulationActive && (
          <Box marginTop={1}>
            <Text color={Colors.Warning} bold>
              🔄 Simulation Active - Generating synthetic load...
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render analytics view
  const renderAnalytics = (): React.ReactNode => {
    if (!analytics) {
      return (
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            No analytics data available - start monitoring to collect data
          </Text>
        </Box>
      );
    }
    
    const summary = getPerformanceSummary();
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <Text color={Colors.Primary} bold>📊 Performance Analytics</Text>
        </Box>
        
        {/* Performance Score */}
        <Box flexDirection="column" marginBottom={2} borderStyle="single" borderColor="blue">
          <Box>
            <Text color={Colors.Success} bold>Performance Score: {summary.score}/100</Text>
            <Box marginLeft={2}>
              <Text color={summary.status === 'excellent' ? Colors.Success : 
                          summary.status === 'good' ? Colors.Info :
                          summary.status === 'warning' ? Colors.Warning : Colors.Error}>
                [{summary.status.toUpperCase()}]
              </Text>
            </Box>
          </Box>
        </Box>
        
        {/* Key Metrics */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={Colors.Info} bold>Key Metrics</Text>
          
          <Box marginTop={1}>
            <Text color={Colors.Text}>Avg Memory: </Text>
            <Text color={Colors.Info}>{analytics.averageMemoryUsage.toFixed(1)}%</Text>
            
            <Box marginLeft={4}>
              <Text color={Colors.Text}>Peak: </Text>
              <Text color={Colors.Warning}>{analytics.peakMemoryUsage.toFixed(1)}%</Text>
            </Box>
          </Box>
          
          <Box>
            <Text color={Colors.Text}>Avg CPU: </Text>
            <Text color={Colors.Info}>{analytics.averageCpuUsage.toFixed(1)}%</Text>
            
            <Box marginLeft={4}>
              <Text color={Colors.Text}>Peak: </Text>
              <Text color={Colors.Warning}>{analytics.peakCpuUsage.toFixed(1)}%</Text>
            </Box>
          </Box>
          
          <Box>
            <Text color={Colors.Text}>Uptime: </Text>
            <Text color={Colors.Info}>{analytics.uptimeHours.toFixed(1)}h</Text>
            
            <Box marginLeft={4}>
              <Text color={Colors.Text}>Alerts: </Text>
              <Text color={analytics.criticalAlerts > 0 ? Colors.Error : Colors.Success}>
                {analytics.totalAlerts} ({analytics.criticalAlerts} critical)
              </Text>
            </Box>
          </Box>
        </Box>
        
        {/* Trends */}
        <Box flexDirection="column" marginBottom={2}>
          <Text color={Colors.Info} bold>Trends</Text>
          
          <Box marginTop={1}>
            <Text color={Colors.Text}>Memory: </Text>
            <Text color={analytics.trends.memoryTrend === 'increasing' ? Colors.Warning : Colors.Success}>
              {analytics.trends.memoryTrend.toUpperCase()}
            </Text>
            
            <Box marginLeft={4}>
              <Text color={Colors.Text}>CPU: </Text>
              <Text color={analytics.trends.cpuTrend === 'increasing' ? Colors.Warning : Colors.Success}>
                {analytics.trends.cpuTrend.toUpperCase()}
              </Text>
            </Box>
          </Box>
        </Box>
        
        {/* Recommendations */}
        <Box flexDirection="column">
          <Text color={Colors.Info} bold>Recommendations</Text>
          
          {summary.recommendations.map((rec, index) => (
            <Box key={index} marginTop={1}>
              <Text color={Colors.Warning}>•</Text>
              <Box marginLeft={1}>
                <Text color={Colors.Text}>{rec}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };
  
  // Render export view
  const renderExport = (): React.ReactNode => {
    const exportData = exportMetrics();
    const dataSize = new Blob([exportData]).size;
    
    return (
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <Text color={Colors.Primary} bold>📤 Data Export</Text>
        </Box>
        
        <Box flexDirection="column" marginBottom={2} borderStyle="single" borderColor="green">
          <Box>
            <Text color={Colors.Success} bold>Export Summary</Text>
          </Box>
          
          <Box marginTop={1}>
            <Text color={Colors.Text}>Data Size: </Text>
            <Text color={Colors.Info}>{(dataSize / 1024).toFixed(1)} KB</Text>
            
            <Box marginLeft={4}>
              <Text color={Colors.Text}>Metrics: </Text>
              <Text color={Colors.Info}>{metricsHistory.length}</Text>
            </Box>
          </Box>
          
          <Box>
            <Text color={Colors.Text}>Alerts: </Text>
            <Text color={Colors.Info}>{alerts.length}</Text>
            
            <Box marginLeft={4}>
              <Text color={Colors.Text}>Config: </Text>
              <Text color={Colors.Success}>Included</Text>
            </Box>
          </Box>
        </Box>
        
        <Box flexDirection="column">
          <Text color={Colors.Info} bold>Export Preview (First 300 chars)</Text>
          
          <Box marginTop={1} borderStyle="single" borderColor="gray">
            <Text color={Colors.TextDim}>
              {exportData.substring(0, 300)}...
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Render controls
  const renderControls = (): React.ReactNode => {
    if (!showControls) return null;
    
    return (
      <Box flexDirection="column" marginTop={2} borderStyle="single" borderColor="blue">
        <Box>
          <Text color={Colors.Info} bold>🎮 Demo Controls</Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            Enter: Next Mode • S: Start/Stop • C: Clear Data • T: Stress Test
          </Text>
        </Box>
        
        <Box>
          <Text color={Colors.TextDim}>
            M: Memory Leak • P: CPU Spike • E: Export Data
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>Status: </Text>
          <Text color={isMonitoring ? Colors.Success : Colors.Error}>
            {isMonitoring ? 'MONITORING' : 'STOPPED'}
          </Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Mode: </Text>
            <Text color={Colors.Info}>
              {currentModeConfig?.name || 'Unknown'}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  
  // Main render
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Mode header */}
      {renderModeHeader()}
      
      {/* Main content based on mode */}
      {currentMode === 'analytics' ? (
        renderAnalytics()
      ) : currentMode === 'export' ? (
        renderExport()
      ) : (
        <PerformanceMonitor
          enabled={isMonitoring}
          updateInterval={config.updateInterval}
          maxHistoryLength={config.maxHistoryLength}
          showDetails={currentMode !== 'alerts'}
          compact={false}
          maxWidth={maxWidth - 4}
          showAlerts={true}
          onAlert={handleAlert}
          onMetricsUpdate={(metrics) => {
            // Handle metrics updates for demo purposes
          }}
        />
      )}
      
      {/* Controls */}
      {renderControls()}
    </Box>
  );
};

export default PerformanceMonitoringDemo; 