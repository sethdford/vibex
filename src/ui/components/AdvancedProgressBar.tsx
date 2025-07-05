/**
 * Advanced Progress Bar Component
 * 
 * Enhanced progress bar with ETA calculation, smooth animations, and detailed metrics.
 * 
 * SUCCESS CRITERIA:
 * - Progress updates every 250ms
 * - Accurate ETA within 5% margin
 * - Visual progress indicators animate smoothly
 * - Performance metrics displayed in real-time
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';

/**
 * Progress bar props
 */
export interface AdvancedProgressBarProps {
  /**
   * Current progress value (0-100)
   */
  value: number;
  
  /**
   * Previous progress value for calculating velocity
   */
  previousValue?: number;
  
  /**
   * Progress bar width in characters
   */
  width?: number;
  
  /**
   * Show percentage text
   */
  showPercentage?: boolean;
  
  /**
   * Show ETA calculation
   */
  showETA?: boolean;
  
  /**
   * Show progress velocity (units/sec)
   */
  showVelocity?: boolean;
  
  /**
   * Progress bar label
   */
  label?: string;
  
  /**
   * Enable smooth animations
   */
  animated?: boolean;
  
  /**
   * Animation style
   */
  animationStyle?: 'gradient' | 'pulse' | 'wave' | 'simple';
  
  /**
   * Start time for ETA calculation
   */
  startTime?: number;
  
  /**
   * Estimated total duration in milliseconds
   */
  estimatedDuration?: number;
  
  /**
   * Current step description
   */
  currentStep?: string;
  
  /**
   * Color theme
   */
  theme?: 'default' | 'success' | 'warning' | 'error' | 'info';
  
  /**
   * Compact mode (single line)
   */
  compact?: boolean;
  
  /**
   * Show detailed metrics
   */
  showMetrics?: boolean;
}

/**
 * Progress metrics interface
 */
interface ProgressMetrics {
  elapsedTime: number;
  estimatedTimeRemaining: number;
  velocity: number; // progress units per second
  accuracy: number; // ETA accuracy percentage
  smoothedVelocity: number; // velocity with smoothing
}

/**
 * Advanced progress bar component
 */
export const AdvancedProgressBar: React.FC<AdvancedProgressBarProps> = ({
  value,
  previousValue,
  width = 40,
  showPercentage = true,
  showETA = true,
  showVelocity = false,
  label,
  animated = true,
  animationStyle = 'gradient',
  startTime,
  estimatedDuration,
  currentStep,
  theme = 'default',
  compact = false,
  showMetrics = false,
}) => {
  const [animationFrame, setAnimationFrame] = useState(0);
  const [progressHistory, setProgressHistory] = useState<Array<{ value: number; timestamp: number }>>([]);
  
  // Update progress history for velocity calculation
  useEffect(() => {
    const now = Date.now();
    setProgressHistory(prev => {
      const newHistory = [...prev, { value, timestamp: now }];
      // Keep only last 10 seconds of history
      return newHistory.filter(entry => now - entry.timestamp < 10000);
    });
  }, [value]);
  
  // Animation frame for smooth animations
  useEffect(() => {
    if (!animated) return;
    
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 100);
    
    return () => clearInterval(interval);
  }, [animated]);
  
  // Calculate progress metrics
  const metrics = useMemo<ProgressMetrics>(() => {
    const now = Date.now();
    const startTimeMs = startTime || now;
    const elapsedTime = now - startTimeMs;
    
    // Calculate velocity from progress history
    let velocity = 0;
    let smoothedVelocity = 0;
    
    if (progressHistory.length >= 2) {
      const recent = progressHistory.slice(-5); // Last 5 data points
      const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
      const progressSpan = recent[recent.length - 1].value - recent[0].value;
      
      if (timeSpan > 0) {
        velocity = (progressSpan / timeSpan) * 1000; // progress per second
        
        // Smooth velocity using exponential moving average
        const alpha = 0.3;
        smoothedVelocity = progressHistory.reduce((acc, entry, index) => {
          if (index === 0) return velocity;
          const weight = Math.pow(alpha, progressHistory.length - index - 1);
          return acc + weight * velocity;
        }, 0);
      }
    }
    
    // Calculate ETA
    let estimatedTimeRemaining = 0;
    let accuracy = 0;
    
    if (smoothedVelocity > 0 && value < 100) {
      const remainingProgress = 100 - value;
      estimatedTimeRemaining = (remainingProgress / smoothedVelocity) * 1000; // milliseconds
      
      // Calculate accuracy based on consistency of velocity
      if (progressHistory.length >= 3) {
        const velocities = [];
        for (let i = 1; i < progressHistory.length; i++) {
          const timeDiff = progressHistory[i].timestamp - progressHistory[i - 1].timestamp;
          const progressDiff = progressHistory[i].value - progressHistory[i - 1].value;
          if (timeDiff > 0) {
            velocities.push((progressDiff / timeDiff) * 1000);
          }
        }
        
        if (velocities.length > 0) {
          const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
          const variance = velocities.reduce((acc, v) => acc + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
          const standardDeviation = Math.sqrt(variance);
          accuracy = Math.max(0, 100 - (standardDeviation / avgVelocity) * 100);
        }
      }
    }
    
    return {
      elapsedTime,
      estimatedTimeRemaining,
      velocity,
      accuracy,
      smoothedVelocity,
    };
  }, [value, progressHistory, startTime]);
  
  // Get theme colors
  const getThemeColors = () => {
    switch (theme) {
      case 'success':
        return { primary: Colors.Success, secondary: Colors.Text };
      case 'warning':
        return { primary: Colors.Warning, secondary: Colors.Text };
      case 'error':
        return { primary: Colors.Error, secondary: Colors.Text };
      case 'info':
        return { primary: Colors.Info, secondary: Colors.Text };
      default:
        return { primary: Colors.Primary, secondary: Colors.Text };
    }
  };
  
  const colors = getThemeColors();
  
  // Format time duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return '<1s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Generate progress bar characters with animation
  const generateProgressBar = (): string => {
    const filledChars = Math.floor((value / 100) * width);
    const emptyChars = width - filledChars;
    
    let progressChars = '';
    
    if (animationStyle === 'gradient' && animated) {
      // Gradient animation
      for (let i = 0; i < filledChars; i++) {
        const intensity = Math.sin((i + animationFrame) * 0.3) * 0.5 + 0.5;
        progressChars += intensity > 0.5 ? '█' : '▓';
      }
    } else if (animationStyle === 'wave' && animated) {
      // Wave animation
      for (let i = 0; i < filledChars; i++) {
        const wave = Math.sin((i + animationFrame * 0.5) * 0.5) * 0.5 + 0.5;
        progressChars += wave > 0.3 ? '█' : '▒';
      }
    } else if (animationStyle === 'pulse' && animated) {
      // Pulse animation
      const pulseIntensity = Math.sin(animationFrame * 0.2) * 0.3 + 0.7;
      const char = pulseIntensity > 0.8 ? '█' : pulseIntensity > 0.6 ? '▓' : '▒';
      progressChars = char.repeat(filledChars);
    } else {
      // Simple solid bar
      progressChars = '█'.repeat(filledChars);
    }
    
    progressChars += '░'.repeat(emptyChars);
    
    return progressChars;
  };
  
  // Render progress bar
  const renderProgressBar = (): React.ReactNode => (
    <Box>
      <Text color={colors.primary}>[</Text>
      <Text color={colors.primary}>{generateProgressBar()}</Text>
      <Text color={colors.primary}>]</Text>
      
      {showPercentage && (
        <Box marginLeft={1}>
          <Text color={colors.secondary}>
            {value.toFixed(1)}%
          </Text>
        </Box>
      )}
    </Box>
  );
  
  // Render ETA information
  const renderETA = (): React.ReactNode => {
    if (!showETA || value >= 100) return null;
    
    return (
      <Box>
        <Text color={Colors.TextDim}>ETA: </Text>
        <Text color={metrics.accuracy > 80 ? Colors.Success : metrics.accuracy > 50 ? Colors.Warning : Colors.Error}>
          {formatDuration(metrics.estimatedTimeRemaining)}
        </Text>
        
        {metrics.accuracy > 0 && (
          <Box marginLeft={1}>
            <Text color={Colors.TextDim}>
              ({metrics.accuracy.toFixed(0)}% accurate)
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  // Render velocity information
  const renderVelocity = (): React.ReactNode => {
    if (!showVelocity || metrics.smoothedVelocity === 0) return null;
    
    return (
      <Box>
        <Text color={Colors.TextDim}>Speed: </Text>
        <Text color={Colors.Info}>
          {metrics.smoothedVelocity.toFixed(1)}%/s
        </Text>
      </Box>
    );
  };
  
  // Render detailed metrics
  const renderMetrics = (): React.ReactNode => {
    if (!showMetrics) return null;
    
    return (
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray">
        <Box>
          <Text color={Colors.Info} bold>📊 Progress Metrics</Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color={Colors.Text}>Elapsed: </Text>
          <Text color={Colors.Success}>{formatDuration(metrics.elapsedTime)}</Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Velocity: </Text>
            <Text color={Colors.Info}>{metrics.smoothedVelocity.toFixed(2)}%/s</Text>
          </Box>
        </Box>
        
        <Box>
          <Text color={Colors.Text}>ETA Accuracy: </Text>
          <Text color={metrics.accuracy > 80 ? Colors.Success : metrics.accuracy > 50 ? Colors.Warning : Colors.Error}>
            {metrics.accuracy.toFixed(1)}%
          </Text>
          
          <Box marginLeft={4}>
            <Text color={Colors.Text}>Data Points: </Text>
            <Text color={Colors.TextDim}>{progressHistory.length}</Text>
          </Box>
        </Box>
        
        {estimatedDuration && (
          <Box>
            <Text color={Colors.Text}>Original Est: </Text>
            <Text color={Colors.TextDim}>{formatDuration(estimatedDuration)}</Text>
            
            <Box marginLeft={4}>
              <Text color={Colors.Text}>Remaining: </Text>
              <Text color={Colors.Warning}>{formatDuration(metrics.estimatedTimeRemaining)}</Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  };
  
  // Compact mode (single line)
  if (compact) {
    return (
      <Box>
        {label && (
          <Box marginRight={1}>
            <Text color={colors.secondary}>
              {label}:
            </Text>
          </Box>
        )}
        
        {renderProgressBar()}
        
        {showETA && (
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>
              ETA: {formatDuration(metrics.estimatedTimeRemaining)}
            </Text>
          </Box>
        )}
        
        {currentStep && (
          <Box marginLeft={2}>
            <Text color={Colors.Info}>
              {currentStep}
            </Text>
          </Box>
        )}
      </Box>
    );
  }
  
  // Full mode
  return (
    <Box flexDirection="column">
      {/* Label */}
      {label && (
        <Box marginBottom={1}>
          <Text color={colors.secondary} bold>
            {label}
          </Text>
        </Box>
      )}
      
      {/* Progress bar */}
      {renderProgressBar()}
      
      {/* Current step */}
      {currentStep && (
        <Box marginTop={1}>
          <Text color={Colors.Info}>
            → {currentStep}
          </Text>
        </Box>
      )}
      
      {/* Progress information */}
      <Box marginTop={1}>
        {renderETA()}
        
        {showVelocity && renderVelocity()}
      </Box>
      
      {/* Detailed metrics */}
      {renderMetrics()}
    </Box>
  );
};

/**
 * Hook for managing progress tracking
 */
export function useProgressTracking(initialValue: number = 0) {
  const [progress, setProgress] = useState(initialValue);
  const [startTime] = useState(Date.now());
  const [progressHistory, setProgressHistory] = useState<Array<{ value: number; timestamp: number }>>([]);
  
  const updateProgress = (newValue: number) => {
    setProgress(newValue);
    setProgressHistory(prev => [
      ...prev,
      { value: newValue, timestamp: Date.now() }
    ].slice(-20)); // Keep last 20 updates
  };
  
  const resetProgress = () => {
    setProgress(0);
    setProgressHistory([]);
  };
  
  const getVelocity = (): number => {
    if (progressHistory.length < 2) return 0;
    
    const recent = progressHistory.slice(-5);
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    const progressSpan = recent[recent.length - 1].value - recent[0].value;
    
    return timeSpan > 0 ? (progressSpan / timeSpan) * 1000 : 0;
  };
  
  const getETA = (): number => {
    const velocity = getVelocity();
    if (velocity <= 0 || progress >= 100) return 0;
    
    const remainingProgress = 100 - progress;
    return (remainingProgress / velocity) * 1000;
  };
  
  return {
    progress,
    startTime,
    progressHistory,
    updateProgress,
    resetProgress,
    getVelocity,
    getETA,
  };
}

export default AdvancedProgressBar; 