/**
 * Progress Metrics View Component - Clean Architecture
 * 
 * Single Responsibility: Metrics display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ProgressMetrics } from './types.js';
import type { ProgressCalculationService } from './ProgressCalculationService.js';

/**
 * Progress metrics view props
 */
interface ProgressMetricsViewProps {
  metrics: ProgressMetrics;
  calculationService: ProgressCalculationService;
}

/**
 * Progress Metrics View Component
 * Focus: Detailed metrics display for advanced mode
 */
export const ProgressMetricsView: React.FC<ProgressMetricsViewProps> = ({
  metrics,
  calculationService,
}) => {
  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      {/* Primary metrics row */}
      <Box>
        <Text color={Colors.TextDim}>Elapsed: </Text>
        <Text color={Colors.Info}>
          {calculationService.formatDuration(metrics.elapsedTime)}
        </Text>
        
        <Box marginLeft={4}>
          <Text color={Colors.TextDim}>Velocity: </Text>
          <Text color={Colors.Info}>
            {metrics.smoothedVelocity.toFixed(2)}/s
          </Text>
        </Box>
      </Box>
      
      {/* Accuracy row (if available) */}
      {metrics.accuracy > 0 && (
        <Box>
          <Text color={Colors.TextDim}>ETA Accuracy: </Text>
          <Text color={metrics.accuracy > 80 ? Colors.Success : Colors.Warning}>
            {metrics.accuracy.toFixed(1)}%
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default ProgressMetricsView; 