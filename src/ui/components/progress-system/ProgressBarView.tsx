/**
 * Progress Bar View Component - Clean Architecture
 * 
 * Single Responsibility: Progress bar display
 * Following Gemini CLI's focused component patterns
 */

import React from 'react';
import { Text } from 'ink';
import type { 
  ProgressThemeColors, 
  ProgressMode, 
  AnimationStyle, 
  ProgressAnimationState 
} from './types.js';

/**
 * Progress bar view props
 */
interface ProgressBarViewProps {
  progressBar: string;
  themeColors: ProgressThemeColors;
  mode: ProgressMode;
  animationStyle: AnimationStyle;
  animationState: ProgressAnimationState;
}

/**
 * Progress Bar View Component
 * Focus: Visual rendering of progress bar only
 */
export const ProgressBarView: React.FC<ProgressBarViewProps> = ({
  progressBar,
  themeColors,
  mode,
  animationStyle,
  animationState,
}) => {
  // Determine color based on mode and animation
  const getProgressColor = (): string => {
    if (mode === 'indeterminate' && animationStyle === 'pulse') {
      // For pulse animation, we could modify opacity here if Ink supported it
      return themeColors.fill;
    }
    
    return themeColors.fill;
  };

  return (
    <Text color={getProgressColor()}>
      {progressBar}
    </Text>
  );
}; 