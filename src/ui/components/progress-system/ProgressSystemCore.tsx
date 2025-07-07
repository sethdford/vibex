/**
 * Progress System Core - Clean Architecture
 * 
 * Main orchestrator component following Gemini CLI patterns
 * Coordinates focused services instead of handling everything itself
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Text } from 'ink';
import { StatusIcon } from '../StatusIcon.js';
import { Colors } from '../../colors.js';

// Import focused services
import { ProgressCalculationService, createProgressCalculationService } from './ProgressCalculationService.js';
import { ProgressThemeService, createProgressThemeService } from './ThemeService.js';
import { ProgressAnimationService, createProgressAnimationService } from './AnimationService.js';

// Import view components
import { ProgressBarView } from './ProgressBarView.js';
import { ProgressMetricsView } from './ProgressMetricsView.js';
import { ProgressStatusView } from './ProgressStatusView.js';
import { MiniProgressView } from './MiniProgressView.js';

// Import types
import type { 
  ProgressSystemProps, 
  ProgressAnimationState, 
  ProgressHistoryEntry 
} from './types.js';

/**
 * Progress System Core Component
 * Focus: Service orchestration and state management
 */
export const ProgressSystemCore: React.FC<ProgressSystemProps> = ({
  mode = 'standard',
  value = 0,
  previousValue,
  active = true,
  width = 30,
  size = 'medium',
  theme = 'default',
  color,
  backgroundColor,
  character = '█',
  emptyCharacter = '░',
  animationStyle = 'simple',
  animationSpeed = 80,
  animated = true,
  label,
  currentStep,
  stepNumber,
  totalSteps,
  showSteps = false,
  showPercentage = true,
  showETA = false,
  showVelocity = false,
  showMetrics = false,
  showStatus = false,
  status = 'running',
  startTime,
  estimatedDuration,
  estimatedTimeRemaining,
  completionMessage,
  message,
  compact = false,
  ariaDescription,
}) => {
  // Initialize services
  const calculationService = useMemo(() => createProgressCalculationService(), []);
  const themeService = useMemo(() => createProgressThemeService(), []);
  const animationService = useMemo(() => createProgressAnimationService(), []);

  // Animation state
  const [animationState, setAnimationState] = useState<ProgressAnimationState>(() => 
    animationService.createInitialState()
  );

  // Progress tracking state
  const [progressHistory, setProgressHistory] = useState<ProgressHistoryEntry[]>([]);
  const prevValueRef = useRef(value);
  const actualStartTime = startTime || Date.now();

  // Update progress history for velocity calculation
  useEffect(() => {
    if (mode === 'advanced' && value !== previousValue) {
      const now = Date.now();
      setProgressHistory(prev => {
        const newHistory = [...prev, { value, timestamp: now }];
        // Keep only recent history (last 10 seconds)
        return newHistory.filter(entry => now - entry.timestamp < 10000);
      });
    }
  }, [value, previousValue, mode]);

  // Smooth value animation for standard/advanced modes
  useEffect(() => {
    if (mode === 'indeterminate' || mode === 'mini' || !animated) {
      setAnimationState(prev => ({ ...prev, animatedValue: value }));
      return;
    }

    const diff = value - prevValueRef.current;
    prevValueRef.current = value;

    if (Math.abs(diff) > 20 || animationState.animatedValue === 0) {
      setAnimationState(prev => ({ ...prev, animatedValue: value }));
      return;
    }

    let startTime: number | null = null;
    const duration = 300;
    const startValue = animationState.animatedValue;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setAnimationState(prev => ({
        ...prev,
        animatedValue: startValue + diff * easeProgress
      }));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, animated, mode, animationState.animatedValue]);

  // Indeterminate animations
  useEffect(() => {
    if (!active || mode !== 'indeterminate') return;

    const speed = animationSpeed || animationService.getAnimationSpeed(animationStyle);

    if (animationService.isOpacityBasedAnimation(animationStyle)) {
      const timer = setInterval(() => {
        setAnimationState(prev => animationService.updatePulseAnimation(prev));
      }, speed);
      return () => clearInterval(timer);
    } else if (animationService.isPositionBasedAnimation(animationStyle)) {
      const timer = setInterval(() => {
        setAnimationState(prev => 
          animationService.updatePositionAnimation(prev, animationStyle, width)
        );
      }, speed);
      return () => clearInterval(timer);
    }
  }, [active, mode, animationStyle, width, animationSpeed, animationService]);

  // Mini mode spinner animation
  useEffect(() => {
    if (mode === 'mini' && animated && active) {
      const speed = animationSpeed || animationService.getAnimationSpeed(animationStyle);
      const timer = setInterval(() => {
        setAnimationState(prev => ({
          ...prev,
          frame: animationService.updateSpinnerFrame(prev.frame, animationStyle)
        }));
      }, speed);
      return () => clearInterval(timer);
    }
  }, [mode, animated, active, animationSpeed, animationStyle, animationService]);

  // Calculate progress metrics
    const metrics = useMemo(() => {
    return calculationService.calculateMetrics(
      value,
      previousValue,
      progressHistory,
      {
        smoothingAlpha: 0.1,
        historyWindowMs: 10000,
        velocityWindowSize: 5,
        accuracyThreshold: 0.9
      }
    );
  }, [calculationService, progressHistory, value, previousValue]);

  // Get theme colors
  const themeColors = useMemo(() => {
    return themeService.getThemeColors(theme, color, backgroundColor);
  }, [themeService, theme, color, backgroundColor]);

  // Generate progress bar
  const progressBarString = useMemo(() => {
    return animationService.generateAnimatedProgressBar(
      value,
      width,
      character,
      emptyCharacter,
      mode,
      animationStyle,
      animationState,
      active
    );
  }, [
    animationService, value, width, character, emptyCharacter, 
    mode, animationStyle, animationState, active
  ]);

  // Render mini mode
  if (mode === 'mini') {
    return (
      <MiniProgressView
        value={value}
        size={size}
        active={active}
        animated={animated}
        status={status}
        themeColors={themeColors}
        animationState={animationState}
        animationService={animationService}
        character={character}
        emptyCharacter={emptyCharacter}
      />
    );
  }

  // Main render
  return (
    <Box flexDirection="column">
      {/* Main progress line */}
      <Box>
        {/* Status icon */}
        {showStatus && (
          <Box marginRight={1}>
            <StatusIcon status={status} />
          </Box>
        )}

        {/* Label */}
        {label && (
          <Box marginRight={1}>
            <Text>{label}</Text>
          </Box>
        )}

        {/* Progress bar */}
        <ProgressBarView
          progressBar={progressBarString}
          themeColors={themeColors}
          mode={mode}
          animationStyle={animationStyle}
          animationState={animationState}
        />

        {/* Status indicators */}
        <ProgressStatusView
          value={animationState.animatedValue}
          showPercentage={showPercentage}
          showETA={showETA}
          showVelocity={showVelocity}
          showSteps={showSteps}
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          mode={mode}
          metrics={metrics}
          estimatedTimeRemaining={estimatedTimeRemaining}
          calculationService={calculationService}
        />
      </Box>

      {/* Current step */}
      {currentStep && !compact && (
        <Box marginTop={1}>
          <Text color={Colors.Info}>→ {currentStep}</Text>
        </Box>
      )}

      {/* Message */}
      {message && !compact && (
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>{message}</Text>
        </Box>
      )}

      {/* Completion message */}
      {completionMessage && calculationService.isComplete(value) && (
        <Box marginTop={1}>
          <Text color={Colors.Success}>✓ {completionMessage}</Text>
        </Box>
      )}

      {/* Detailed metrics */}
      {showMetrics && mode === 'advanced' && !compact && (
        <ProgressMetricsView
          metrics={metrics}
          calculationService={calculationService}
        />
      )}

      {/* Accessibility */}
      <Text aria-live="polite" aria-hidden={!ariaDescription}>
        {ariaDescription || 
         (mode === 'indeterminate' 
          ? `${label || 'Operation'} in progress` 
          : `${label || 'Progress'}: ${Math.round(value)}%`)}
      </Text>
    </Box>
  );
};

export default ProgressSystemCore;