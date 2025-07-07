/**
 * Progress Status View Component - Clean Architecture
 * 
 * Single Responsibility: Status indicators display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import type { ProgressMetrics, ProgressMode } from './types.js';
import type { ProgressCalculationService } from './ProgressCalculationService.js';

/**
 * Progress status view props
 */
interface ProgressStatusViewProps {
  value: number;
  showPercentage: boolean;
  showETA: boolean;
  showVelocity: boolean;
  showSteps: boolean;
  stepNumber?: number;
  totalSteps?: number;
  mode: ProgressMode;
  metrics: ProgressMetrics;
  estimatedTimeRemaining?: number;
  calculationService: ProgressCalculationService;
}

/**
 * Progress Status View Component
 * Focus: Status indicators (percentage, ETA, velocity, steps)
 */
export const ProgressStatusView: React.FC<ProgressStatusViewProps> = ({
  value,
  showPercentage,
  showETA,
  showVelocity,
  showSteps,
  stepNumber,
  totalSteps,
  mode,
  metrics,
  estimatedTimeRemaining,
  calculationService,
}) => {
  // Render percentage
  const renderPercentage = () => {
    if (!showPercentage || mode === 'indeterminate') return null;
    
    const normalizedValue = calculationService.normalizeValue(value);
    return (
      <Box marginLeft={1}>
        <Text color={Colors.TextDim}>{normalizedValue.toFixed(1)}%</Text>
      </Box>
    );
  };

  // Render ETA
  const renderETA = () => {
    if (!showETA || mode === 'indeterminate' || mode === 'mini') return null;
    
    let eta = 0;
    if (mode === 'advanced' && metrics.estimatedTimeRemaining > 0) {
      eta = metrics.estimatedTimeRemaining;
    } else if (estimatedTimeRemaining) {
      eta = estimatedTimeRemaining * 1000;
    }
    
    if (eta <= 0) return null;
    
    return (
      <Box marginLeft={2}>
        <Text color={Colors.TextDim}>
          ETA: {calculationService.formatDuration(eta)}
        </Text>
      </Box>
    );
  };

  // Render velocity
  const renderVelocity = () => {
    if (!showVelocity || mode !== 'advanced') return null;
    
    return (
      <Box marginLeft={2}>
        <Text color={Colors.TextDim}>
          {metrics.smoothedVelocity.toFixed(1)}/s
        </Text>
      </Box>
    );
  };

  // Render steps
  const renderSteps = () => {
    if (!showSteps || !totalSteps) return null;
    
    return (
      <Box marginLeft={2}>
        <Text color={Colors.TextDim}>
          ({stepNumber || 1}/{totalSteps})
        </Text>
      </Box>
    );
  };

  return (
    <>
      {renderPercentage()}
      {renderETA()}
      {renderVelocity()}
      {renderSteps()}
    </>
  );
}; 