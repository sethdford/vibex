/**
 * Performance Monitor Core - Clean Architecture
 * 
 * Main performance monitor component that coordinates all services and views
 * Following Gemini CLI's focused component patterns
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';

// Services
import { createMetricsCollectionService, DEFAULT_PERFORMANCE_CONFIG } from './MetricsCollectionService.js';
import { createAlertService } from './AlertService.js';
import { createDataStorageService } from './DataStorageService.js';
import { createFormattingService } from './FormattingService.js';

// Views
import { MemoryMetricsView } from './MemoryMetricsView.js';
import { CpuMetricsView } from './CpuMetricsView.js';
import { AlertsView } from './AlertsView.js';
import { SystemMetricsView } from './SystemMetricsView.js';
import { StatusView } from './StatusView.js';

// Types
import type { 
  PerformanceMonitorProps,
  PerformanceMetrics,
  PerformanceAlert,
  SystemHealth,
  PerformanceMonitorConfig,
  PerformanceMonitorCallbacks
} from './types.js';

import { logger } from '../../../utils/logger.js';

/**
 * Performance Monitor Core Component
 * Focus: Service coordination and UI orchestration
 */
export const PerformanceMonitorCore: React.FC<PerformanceMonitorProps> = ({
  enabled = true,
  updateInterval = 1000,
  maxHistoryLength = 60,
  showDetails = true,
  compact = false,
  maxWidth = 100,
  showAlerts = true,
  onAlert,
  onMetricsUpdate,
}) => {
  // Local state
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Create services (memoized to prevent recreation)
  const services = useMemo(() => {
    const config: PerformanceMonitorConfig = {
      ...DEFAULT_PERFORMANCE_CONFIG,
      updateInterval,
      maxHistoryLength,
    };

    const callbacks: PerformanceMonitorCallbacks = {
      onAlert,
      onMetricsUpdate,
    };

    const collectionService = createMetricsCollectionService(config);
    const alertService = createAlertService(config.alertThresholds);
    const storageService = createDataStorageService(maxHistoryLength);
    const formattingService = createFormattingService();

    return {
      collectionService,
      alertService,
      storageService,
      formattingService,
    };
  }, [updateInterval, maxHistoryLength, onAlert, onMetricsUpdate]);

  // Handle metrics update
  const handleMetricsUpdate = useCallback((metrics: PerformanceMetrics) => {
    setCurrentMetrics(metrics);
    
    // Store metrics in history
    services.storageService.addMetrics(metrics);
    
    // Check for alerts
    const newAlerts = services.alertService.checkMetrics(metrics);
    if (newAlerts.length > 0) {
      setAlerts(services.alertService.getAlerts());
      
      // Notify about new alerts
      newAlerts.forEach(alert => {
        if (onAlert) {
          onAlert(alert);
        }
      });
    }
    
    // Calculate system health
    const health = calculateSystemHealth(metrics, services.alertService.getAlerts());
    setSystemHealth(health);
    
    // Notify about metrics update
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
    
    logger.debug('Performance metrics updated', {
      timestamp: metrics.timestamp,
      memoryUsage: metrics.memory.percentage,
      cpuUsage: metrics.cpu.usage,
      alertCount: newAlerts.length,
    });
  }, [services, onAlert, onMetricsUpdate]);

  // Start/stop monitoring based on enabled state
  useEffect(() => {
    if (enabled && !isCollecting) {
      logger.info('Starting performance monitoring', {
        updateInterval,
        maxHistoryLength,
        showDetails,
        showAlerts,
      });
      
      services.collectionService.startCollection(handleMetricsUpdate);
      setIsCollecting(true);
    } else if (!enabled && isCollecting) {
      logger.info('Stopping performance monitoring');
      
      services.collectionService.stopCollection();
      setIsCollecting(false);
    }
    
    return () => {
      if (isCollecting) {
        services.collectionService.stopCollection();
        setIsCollecting(false);
      }
    };
  }, [enabled, isCollecting, services.collectionService, handleMetricsUpdate, updateInterval, maxHistoryLength, showDetails, showAlerts]);

  // Update configuration when props change
  useEffect(() => {
    services.collectionService.updateConfig({
      updateInterval,
      maxHistoryLength,
    });
    
    services.storageService.updateMaxHistoryLength(maxHistoryLength);
  }, [updateInterval, maxHistoryLength, services]);

  // Get current alerts
  const currentAlerts = useMemo(() => {
    return services.alertService.getUnacknowledgedAlerts();
  }, [alerts, services.alertService]);

  // Render loading state
  if (!currentMetrics) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        <StatusView
          isCollecting={isCollecting}
          enabled={enabled}
          updateInterval={updateInterval}
          historyLength={services.storageService.getHistoryLength()}
          maxHistoryLength={maxHistoryLength}
          compact={compact}
        />
        
        <Box justifyContent="center" marginTop={2}>
          <Text color={Colors.TextDim}>
            {enabled ? 'Collecting performance metrics...' : 'Performance monitoring disabled'}
          </Text>
        </Box>
      </Box>
    );
  }

  // Render compact view
  if (compact) {
    return (
      <Box flexDirection="column" width={maxWidth}>
        <StatusView
          isCollecting={isCollecting}
          enabled={enabled}
          updateInterval={updateInterval}
          historyLength={services.storageService.getHistoryLength()}
          maxHistoryLength={maxHistoryLength}
          lastUpdate={currentMetrics.timestamp}
          health={systemHealth || undefined}
          compact={true}
        />
        
        <MemoryMetricsView metrics={currentMetrics} compact={true} />
        <CpuMetricsView metrics={currentMetrics} compact={true} />
        <SystemMetricsView metrics={currentMetrics} compact={true} />
        
        {showAlerts && currentAlerts.length > 0 && (
          <AlertsView alerts={currentAlerts} compact={true} maxAlerts={3} />
        )}
      </Box>
    );
  }

  // Render full view
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Status */}
      <StatusView
        isCollecting={isCollecting}
        enabled={enabled}
        updateInterval={updateInterval}
        historyLength={services.storageService.getHistoryLength()}
        maxHistoryLength={maxHistoryLength}
        lastUpdate={currentMetrics.timestamp}
        health={systemHealth || undefined}
        compact={false}
      />
      
      {showDetails && (
        <Box flexDirection="row" marginTop={2}>
          {/* Memory Metrics */}
          <Box marginRight={4}>
            <MemoryMetricsView 
              metrics={currentMetrics} 
              compact={false}
              showProgress={true}
              maxWidth={Math.floor(maxWidth / 2) - 2}
            />
          </Box>
          
          {/* CPU Metrics */}
          <Box>
            <CpuMetricsView 
              metrics={currentMetrics} 
              compact={false}
              showProgress={true}
              maxWidth={Math.floor(maxWidth / 2) - 2}
            />
          </Box>
        </Box>
      )}
      
      {/* System Metrics */}
      {showDetails && (
        <Box marginTop={2}>
          <SystemMetricsView 
            metrics={currentMetrics} 
            compact={false}
            maxWidth={maxWidth}
          />
        </Box>
      )}
      
      {/* Alerts */}
      {showAlerts && currentAlerts.length > 0 && (
        <Box marginTop={2}>
          <AlertsView 
            alerts={currentAlerts} 
            maxAlerts={5}
            showTimestamp={true}
            compact={false}
            maxWidth={maxWidth}
          />
        </Box>
      )}
      
      {/* No alerts message */}
      {showAlerts && currentAlerts.length === 0 && (
        <Box marginTop={2}>
          <Text color={Colors.Success}>✅ No active performance alerts</Text>
        </Box>
      )}
    </Box>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate system health based on metrics and alerts
 */
function calculateSystemHealth(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): SystemHealth {
  const memoryHealth = getHealthStatus(metrics.memory.percentage, 80, 90);
  const cpuHealth = getHealthStatus(metrics.cpu.usage, 70, 85);
  const networkHealth = 'healthy'; // Simplified for now
  
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const highAlerts = alerts.filter(a => a.severity === 'high' && !a.acknowledged).length;
  
  let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
  let score = 100;
  
  if (criticalAlerts > 0 || memoryHealth === 'critical' || cpuHealth === 'critical') {
    overallHealth = 'critical';
    score = Math.max(0, score - (criticalAlerts * 30) - (memoryHealth === 'critical' ? 25 : 0) - (cpuHealth === 'critical' ? 25 : 0));
  } else if (highAlerts > 0 || memoryHealth === 'warning' || cpuHealth === 'warning') {
    overallHealth = 'warning';
    score = Math.max(20, score - (highAlerts * 15) - (memoryHealth === 'warning' ? 15 : 0) - (cpuHealth === 'warning' ? 15 : 0));
  }
  
  return {
    overall: overallHealth,
    memory: memoryHealth,
    cpu: cpuHealth,
    network: networkHealth,
    score: Math.round(score),
  };
}

/**
 * Get health status based on value and thresholds
 */
function getHealthStatus(value: number, warningThreshold: number, criticalThreshold: number): 'healthy' | 'warning' | 'critical' {
  if (value >= criticalThreshold) {
    return 'critical';
  } else if (value >= warningThreshold) {
    return 'warning';
  } else {
    return 'healthy';
  }
} 